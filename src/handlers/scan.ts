import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { jsonResponse } from './utils/response'
import { encode } from 'blurhash'
import { loadMeta, saveMeta, isMediaFile, isImageFile, getFileEntries, slugifyFilename } from './utils'
import { getAllThumbnailPaths, isProcessed } from '../types'
import { getPublicPath } from '../config'
import { deleteEmptyFolders, cleanupEmptyFoldersRecursive } from './utils/folders'

/**
 * Streaming scan handler - scans filesystem for new files not in meta
 * For images, reads dimensions (w/h)
 * Handles collisions by renaming files with -1, -2, etc.
 * Also detects orphaned files in the images folder
 */
export async function handleScanStream() {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const meta = await loadMeta()
        const existingCount = Object.keys(meta).filter(k => !k.startsWith('_')).length
        const existingKeys = new Set(Object.keys(meta))
        const added: string[] = []
        const renamed: Array<{ from: string; to: string }> = []
        const errors: string[] = []
        const orphanedFiles: string[] = []
        const pendingUpdates: string[] = []  // Files that override cloud files

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
        sendEvent({ type: 'start', total })

        for (let i = 0; i < allFiles.length; i++) {
          let { relativePath, fullPath } = allFiles[i]
          let imageKey = '/' + relativePath
          
          sendEvent({ 
            type: 'progress', 
            current: i + 1, 
            total, 
            percent: Math.round(((i + 1) / total) * 100),
            currentFile: relativePath 
          })

          // Check if already in meta
          if (existingKeys.has(imageKey)) {
            // Check if this is a cloud file with a local override
            const entry = meta[imageKey] as { c?: number; u?: 1 } | undefined
            if (entry?.c !== undefined && !entry?.u) {
              // This is a cloud file - local file is an override
              // Mark as pending update
              entry.u = 1
              pendingUpdates.push(imageKey)
            }
            // File already tracked - skip adding
            continue
          }

          // Slugify filename to be URL-safe (lowercase, no spaces, etc.)
          const dirName = path.dirname(relativePath)
          const originalFileName = path.basename(relativePath)
          const sluggedFileName = slugifyFilename(originalFileName)
          
          // Check if filename needs to be slugified
          if (sluggedFileName !== originalFileName) {
            const newRelativePath = dirName === '.' ? sluggedFileName : `${dirName}/${sluggedFileName}`
            const newFullPath = getPublicPath(newRelativePath)
            const newKey = '/' + newRelativePath
            
            // Check if slugged name already exists
            if (!meta[newKey] && !existingKeys.has(newKey)) {
              try {
                await fs.mkdir(path.dirname(newFullPath), { recursive: true })
                await fs.rename(fullPath, newFullPath)
                renamed.push({ from: relativePath, to: newRelativePath })
                relativePath = newRelativePath
                fullPath = newFullPath
                imageKey = newKey
              } catch (err) {
                console.error(`Failed to slugify ${relativePath}:`, err)
                // Continue with original name if rename fails
              }
            }
          }

          // Check for collision (path exists in meta but file is new)
          if (meta[imageKey]) {
            // Need to rename this file to avoid collision
            const ext = path.extname(relativePath)
            const baseName = relativePath.slice(0, -ext.length)
            let counter = 1
            let newKey = `/${baseName}-${counter}${ext}`
            
            while (meta[newKey]) {
              counter++
              newKey = `/${baseName}-${counter}${ext}`
            }
            
            // Rename the physical file
            const newRelativePath = `${baseName}-${counter}${ext}`
            const newFullPath = getPublicPath(newRelativePath)
            
            try {
              await fs.rename(fullPath, newFullPath)
              renamed.push({ from: relativePath, to: newRelativePath })
              relativePath = newRelativePath
              fullPath = newFullPath
              imageKey = newKey
            } catch (err) {
              console.error(`Failed to rename ${relativePath}:`, err)
              errors.push(`Failed to rename ${relativePath}`)
              continue
            }
          }

          try {
            const isImage = isImageFile(relativePath)
            
            if (isImage) {
              // Read dimensions and generate blurhash for images
              const ext = path.extname(relativePath).toLowerCase()
              
              if (ext === '.svg') {
                // SVGs don't have pixel dimensions in the same way
                meta[imageKey] = { o: { w: 0, h: 0 }, b: '' }
              } else {
                try {
                  const buffer = await fs.readFile(fullPath)
                  const metadata = await sharp(buffer).metadata()
                  
                  // Generate blurhash
                  const { data, info } = await sharp(buffer)
                    .resize(32, 32, { fit: 'inside' })
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true })
                  
                  const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)
                  
                  meta[imageKey] = {
                    o: { w: metadata.width || 0, h: metadata.height || 0 },
                    b: blurhash,
                  }
                } catch {
                  // Couldn't read dimensions
                  meta[imageKey] = { o: { w: 0, h: 0 } }
                }
              }
            } else {
              // Non-image files - just add empty entry
              meta[imageKey] = {}
            }
            
            existingKeys.add(imageKey)
            added.push(imageKey)
          } catch (error) {
            console.error(`Failed to process ${relativePath}:`, error)
            errors.push(relativePath)
          }
        }

        // Check for orphaned files in the images folder
        sendEvent({ type: 'cleanup', message: 'Checking for orphaned thumbnails...' })
        
        // Build set of expected thumbnail paths from meta entries
        const expectedThumbnails = new Set<string>()
        const fileEntries = getFileEntries(meta)
        for (const [imageKey, entry] of fileEntries) {
          // Only track local thumbnails (not pushed to CDN)
          if (entry.c === undefined && isProcessed(entry)) {
            for (const thumbPath of getAllThumbnailPaths(imageKey)) {
              expectedThumbnails.add(thumbPath)
            }
          }
        }

        // Scan the images folder for orphaned files
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

        // Clean up empty folders in the public directory
        sendEvent({ type: 'cleanup', message: 'Cleaning up empty folders...' })
        
        async function cleanEmptyFolders(dir: string): Promise<void> {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            
            for (const entry of entries) {
              if (entry.name.startsWith('.')) continue
              if (!entry.isDirectory()) continue
              
              // Skip the images folder (handled separately by deleteOrphans)
              const fullPath = path.join(dir, entry.name)
              if (fullPath === imagesDir) continue
              
              // Recursively clean subdirectories first
              await cleanEmptyFolders(fullPath)
              
              // Then try to delete this folder if empty
              await deleteEmptyFolders(fullPath)
            }
          } catch {
            // Directory might not exist or not readable
          }
        }
        
        await cleanEmptyFolders(getPublicPath())
        
        // Also clean up empty folders inside the images directory
        try {
          await cleanupEmptyFoldersRecursive(imagesDir)
        } catch {
          // images dir might not exist
        }

        // Clean up orphaned meta entries (local files that no longer exist)
        sendEvent({ type: 'cleanup', message: 'Checking for orphaned entries...' })
        const orphanedEntries: string[] = []
        const cdnUrls = (meta._cdns || []) as string[]
        const r2PublicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '')
        
        for (const key of Object.keys(meta)) {
          if (key.startsWith('_')) continue  // Skip special keys
          
          const entry = meta[key] as { c?: number; u?: 1 } | undefined
          if (!entry) continue
          
          // Skip cloud files - they still exist in the cloud
          if (entry.c !== undefined) {
            // But if it has u:1 flag, the local override might have been deleted
            if (entry.u === 1) {
              const localPath = getPublicPath(key)
              try {
                await fs.access(localPath)
              } catch {
                // Local override was deleted, remove the u flag
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
            // File doesn't exist - orphaned entry
            orphanedEntries.push(key)
            delete meta[key]
          }
        }
        
        if (orphanedEntries.length > 0) {
          sendEvent({ type: 'cleanup', message: `Removed ${orphanedEntries.length} orphaned entries...` })
        }

        await saveMeta(meta)

        sendEvent({ 
          type: 'complete', 
          existingCount,
          added: added.length, 
          renamed: renamed.length,
          errors: errors.length,
          renamedFiles: renamed,
          orphanedFiles: orphanedFiles.length > 0 ? orphanedFiles : undefined,
          pendingUpdates: pendingUpdates.length,
          orphanedEntries: orphanedEntries.length,
        })
      } catch (error) {
        console.error('Scan failed:', error)
        sendEvent({ type: 'error', message: 'Scan failed' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

/**
 * Delete orphaned files from the images folder
 */
export async function handleDeleteOrphans(request: Request) {
  try {
    const { paths } = await request.json() as { paths: string[] }
    
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return jsonResponse({ error: 'No paths provided' }, { status: 400 })
    }
    
    const deleted: string[] = []
    const errors: string[] = []
    
    for (const orphanPath of paths) {
      // Ensure the path is within the images folder for safety
      if (!orphanPath.startsWith('/images/')) {
        errors.push(`Invalid path: ${orphanPath}`)
        continue
      }
      
      const fullPath = getPublicPath(orphanPath)
      
      try {
        await fs.unlink(fullPath)
        deleted.push(orphanPath)
      } catch (err) {
        console.error(`Failed to delete ${orphanPath}:`, err)
        errors.push(orphanPath)
      }
    }
    
    // Clean up empty directories (including images folder itself)
    const imagesDir = getPublicPath('images')
    
    try {
      await cleanupEmptyFoldersRecursive(imagesDir)
    } catch {
      // images dir might not exist
    }
    
    return jsonResponse({
      success: true,
      deleted: deleted.length,
      errors: errors.length,
    })
  } catch (error) {
    console.error('Failed to delete orphans:', error)
    return jsonResponse({ error: 'Failed to delete orphaned files' }, { status: 500 })
  }
}
