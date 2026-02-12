import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { printProgress, printComplete, printError } from './index'
import {
  loadMeta,
  saveMeta,
  isMediaFile,
  isImageFile,
  getFileEntries,
  slugifyFilename,
} from '../handlers/utils'
import { getAllThumbnailPaths, isProcessed } from '../types'
import { getPublicPath } from '../config'

export async function runScan(_args: string[]) {
  console.log('Scanning for media files...')

  const meta = await loadMeta()
  const existingCount = Object.keys(meta).filter(k => !k.startsWith('_')).length
  const existingKeys = new Set(Object.keys(meta))
  const added: string[] = []
  const renamed: Array<{ from: string; to: string }> = []
  const errors: string[] = []
  const orphanedFiles: string[] = []
  const pendingUpdates: string[] = []

  // Collect all files first
  const allFiles: Array<{ relativePath: string; fullPath: string }> = []

  async function scanDir(dir: string, relativePath: string = ''): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = path.join(dir, entry.name)
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

        // Skip the images folder (generated thumbnails)
        if (relPath === 'images' || relPath.startsWith('images/')) continue

        if (entry.isDirectory()) {
          await scanDir(fullPath, relPath)
        } else if (isMediaFile(entry.name)) {
          allFiles.push({ relativePath: relPath, fullPath })
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  const publicDir = getPublicPath()
  await scanDir(publicDir)

  const total = allFiles.length

  for (let i = 0; i < allFiles.length; i++) {
    let { relativePath, fullPath } = allFiles[i]
    let imageKey = '/' + relativePath

    printProgress(i + 1, total, relativePath)

    // Check if already in meta
    if (existingKeys.has(imageKey)) {
      const entry = meta[imageKey] as { c?: number; u?: 1 } | undefined
      if (entry?.c !== undefined && !entry?.u) {
        entry.u = 1
        pendingUpdates.push(imageKey)
      }
      continue
    }

    // Slugify filename to be URL-safe
    const dirName = path.dirname(relativePath)
    const originalFileName = path.basename(relativePath)
    const sluggedFileName = slugifyFilename(originalFileName)

    if (sluggedFileName !== originalFileName) {
      const newRelativePath = dirName === '.' ? sluggedFileName : `${dirName}/${sluggedFileName}`
      const newFullPath = getPublicPath(newRelativePath)
      const newKey = '/' + newRelativePath

      if (!meta[newKey] && !existingKeys.has(newKey)) {
        try {
          await fs.mkdir(path.dirname(newFullPath), { recursive: true })
          await fs.rename(fullPath, newFullPath)
          renamed.push({ from: relativePath, to: newRelativePath })
          relativePath = newRelativePath
          fullPath = newFullPath
          imageKey = newKey
        } catch (err) {
          console.error(`\nFailed to slugify ${relativePath}:`, err)
        }
      }
    }

    // Check for collision
    if (meta[imageKey]) {
      const ext = path.extname(relativePath)
      const baseName = relativePath.slice(0, -ext.length)
      let counter = 1
      let newKey = `/${baseName}-${counter}${ext}`

      while (meta[newKey]) {
        counter++
        newKey = `/${baseName}-${counter}${ext}`
      }

      const newRelativePath = `${baseName}-${counter}${ext}`
      const newFullPath = getPublicPath(newRelativePath)

      try {
        await fs.rename(fullPath, newFullPath)
        renamed.push({ from: relativePath, to: newRelativePath })
        relativePath = newRelativePath
        fullPath = newFullPath
        imageKey = newKey
      } catch (err) {
        console.error(`\nFailed to rename ${relativePath}:`, err)
        errors.push(`Failed to rename ${relativePath}`)
        continue
      }
    }

    try {
      const isImage = isImageFile(relativePath)

      if (isImage) {
        const ext = path.extname(relativePath).toLowerCase()

        if (ext === '.svg') {
          meta[imageKey] = { o: { w: 0, h: 0 } }
        } else {
          try {
            const buffer = await fs.readFile(fullPath)
            const rotatedBuffer = await sharp(buffer).rotate().toBuffer()
            const metadata = await sharp(rotatedBuffer).metadata()

            meta[imageKey] = {
              o: { w: metadata.width || 0, h: metadata.height || 0 },
            }
          } catch {
            meta[imageKey] = { o: { w: 0, h: 0 } }
          }
        }
      } else {
        meta[imageKey] = {}
      }

      existingKeys.add(imageKey)
      added.push(imageKey)

      // Save meta periodically
      if (added.length % 10 === 0) {
        await saveMeta(meta)
      }
    } catch (error) {
      console.error(`\nFailed to process ${relativePath}:`, error)
      errors.push(relativePath)
    }
  }

  // Check for orphaned thumbnails
  process.stdout.write('\n')
  console.log('  Checking for orphaned thumbnails...')

  const expectedThumbnails = new Set<string>()
  const fileEntries = getFileEntries(meta)
  for (const [imageKey, entry] of fileEntries) {
    if (entry.c === undefined && isProcessed(entry)) {
      for (const thumbPath of getAllThumbnailPaths(imageKey)) {
        expectedThumbnails.add(thumbPath)
      }
    }
  }

  async function findOrphans(dir: string, relativePath: string = ''): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = path.join(dir, entry.name)
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          await findOrphans(fullPath, relPath)
        } else if (isImageFile(entry.name)) {
          const publicPath = `/images/${relPath}`
          if (!expectedThumbnails.has(publicPath)) {
            orphanedFiles.push(publicPath)
          }
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  const imagesDir = getPublicPath('images')
  try {
    await findOrphans(imagesDir)
  } catch {
    // images dir might not exist
  }

  // Clean up empty folders
  console.log('  Cleaning up empty folders...')
  let emptyFoldersDeleted = 0

  async function cleanEmptyFolders(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        if (!entry.isDirectory()) continue

        const fullPath = path.join(dir, entry.name)
        if (fullPath === imagesDir) continue

        await cleanEmptyFolders(fullPath)

        try {
          const subEntries = await fs.readdir(fullPath)
          const meaningfulEntries = subEntries.filter(e => !e.startsWith('.'))
          if (meaningfulEntries.length === 0) {
            await fs.rm(fullPath, { recursive: true })
            emptyFoldersDeleted++
          }
        } catch {
          // Folder might already be deleted
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  await cleanEmptyFolders(getPublicPath())

  // Clean empty folders inside images directory
  async function cleanImagesEmptyFolders(dir: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      let isEmpty = true

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirEmpty = await cleanImagesEmptyFolders(path.join(dir, entry.name))
          if (!subDirEmpty) isEmpty = false
        } else if (!entry.name.startsWith('.')) {
          isEmpty = false
        }
      }

      if (isEmpty && dir !== imagesDir) {
        await fs.rm(dir, { recursive: true })
        emptyFoldersDeleted++
      }

      return isEmpty
    } catch {
      return true
    }
  }

  try {
    await cleanImagesEmptyFolders(imagesDir)
  } catch {
    // images dir might not exist
  }

  // Clean up orphaned meta entries
  console.log('  Checking for orphaned entries...')
  const orphanedEntries: string[] = []

  for (const key of Object.keys(meta)) {
    if (key.startsWith('_')) continue

    const entry = meta[key] as { c?: number; u?: 1 } | undefined
    if (!entry) continue

    // Skip cloud files
    if (entry.c !== undefined) {
      if (entry.u === 1) {
        const localPath = getPublicPath(key)
        try {
          await fs.access(localPath)
        } catch {
          delete entry.u
        }
      }
      continue
    }

    // For local files, check if they still exist
    const localPath = getPublicPath(key)
    try {
      await fs.access(localPath)
    } catch {
      orphanedEntries.push(key)
      delete meta[key]
    }
  }

  await saveMeta(meta)

  // Print summary
  const parts: string[] = []
  parts.push(`${existingCount} existing`)
  if (added.length > 0) parts.push(`${added.length} added`)
  if (renamed.length > 0) parts.push(`${renamed.length} renamed`)
  if (errors.length > 0) parts.push(`${errors.length} errors`)
  if (orphanedFiles.length > 0) parts.push(`${orphanedFiles.length} orphaned thumbnails`)
  if (orphanedEntries.length > 0) parts.push(`${orphanedEntries.length} orphaned entries removed`)
  if (pendingUpdates.length > 0) parts.push(`${pendingUpdates.length} pending updates`)
  if (emptyFoldersDeleted > 0) parts.push(`${emptyFoldersDeleted} empty folders removed`)

  printComplete(`Scan complete. ${parts.join(', ')}.`)
}
