import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import type { MetaEntry } from '../types'
import { getAllThumbnailPaths } from '../types'
import { loadMeta, saveMeta, isImageFile, isMediaFile } from './utils'

export async function handleUpload(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const targetPath = formData.get('path') as string || 'public'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileName = file.name
    const ext = path.extname(fileName).toLowerCase()

    const isImage = isImageFile(fileName)
    const isMedia = isMediaFile(fileName)

    const meta = await loadMeta()

    let relativeDir = ''
    if (targetPath === 'public') {
      relativeDir = ''
    } else if (targetPath.startsWith('public/')) {
      relativeDir = targetPath.replace('public/', '')
    }
    
    if (relativeDir === 'images' || relativeDir.startsWith('images/')) {
      return NextResponse.json(
        { error: 'Cannot upload to images/ folder. Upload to public/ instead - thumbnails are generated automatically.' },
        { status: 400 }
      )
    }

    // Build the meta key
    let imageKey = '/' + (relativeDir ? `${relativeDir}/${fileName}` : fileName)

    // Check for collision - rename if needed
    if (meta[imageKey]) {
      const baseName = path.basename(fileName, ext)
      let counter = 1
      let newFileName = `${baseName}-${counter}${ext}`
      let newKey = '/' + (relativeDir ? `${relativeDir}/${newFileName}` : newFileName)
      
      while (meta[newKey]) {
        counter++
        newFileName = `${baseName}-${counter}${ext}`
        newKey = '/' + (relativeDir ? `${relativeDir}/${newFileName}` : newFileName)
      }
      
      imageKey = newKey
    }

    // Extract actual filename from key
    const actualFileName = path.basename(imageKey)
    
    const uploadDir = path.join(process.cwd(), 'public', relativeDir)
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(path.join(uploadDir, actualFileName), buffer)

    if (!isMedia) {
      return NextResponse.json({ 
        success: true, 
        message: 'File uploaded (not a media file)',
        path: `public/${relativeDir ? relativeDir + '/' : ''}${actualFileName}`
      })
    }

    // Add to meta
    if (isImage && ext !== '.svg') {
      // Read dimensions for images
      try {
        const metadata = await sharp(buffer).metadata()
        meta[imageKey] = {
          w: metadata.width || 0,
          h: metadata.height || 0,
        }
      } catch {
        meta[imageKey] = { w: 0, h: 0 }
      }
    } else {
      // Non-image media or SVG
      meta[imageKey] = {}
    }

    await saveMeta(meta)

    return NextResponse.json({ 
      success: true, 
      imageKey,
      message: 'File uploaded. Run "Process Images" to generate thumbnails.'
    })
  } catch (error) {
    console.error('Failed to upload:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to upload file: ${message}` }, { status: 500 })
  }
}

export async function handleDelete(request: NextRequest) {
  try {
    const { paths } = await request.json() as { paths: string[] }

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'No paths provided' }, { status: 400 })
    }

    const meta = await loadMeta()
    const deleted: string[] = []
    const errors: string[] = []

    for (const itemPath of paths) {
      try {
        if (!itemPath.startsWith('public/')) {
          errors.push(`Invalid path: ${itemPath}`)
          continue
        }

        const absolutePath = path.join(process.cwd(), itemPath)
        const imageKey = '/' + itemPath.replace(/^public\//, '')
        
        // Check if this is in meta (could be synced with no local file)
        const entry = meta[imageKey]
        const isPushedToCloud = entry?.c === 1
        
        // Try to delete local file/folder
        try {
          const stats = await fs.stat(absolutePath)

          if (stats.isDirectory()) {
            await fs.rm(absolutePath, { recursive: true })
            
            // Remove all meta entries under this folder
            const prefix = imageKey + '/'
            for (const key of Object.keys(meta)) {
              if (key.startsWith(prefix) || key === imageKey) {
                // Also delete local thumbnails if not synced
                if (!meta[key].c) {
                  for (const thumbPath of getAllThumbnailPaths(key)) {
                    const absoluteThumbPath = path.join(process.cwd(), 'public', thumbPath)
                    try { await fs.unlink(absoluteThumbPath) } catch { /* ignore */ }
                  }
                }
                delete meta[key]
              }
            }
          } else {
            await fs.unlink(absolutePath)

            const isInImagesFolder = itemPath.startsWith('public/images/')
            
            if (!isInImagesFolder && entry) {
              // Delete local thumbnails if not synced
              if (!isPushedToCloud) {
                for (const thumbPath of getAllThumbnailPaths(imageKey)) {
                  const absoluteThumbPath = path.join(process.cwd(), 'public', thumbPath)
                  try { await fs.unlink(absoluteThumbPath) } catch { /* ignore */ }
                }
              }
              delete meta[imageKey]
            }
          }
        } catch {
          // File doesn't exist locally - might be synced
          if (entry) {
            // Just remove from meta (file is on CDN)
            delete meta[imageKey]
          } else {
            // Check if it's a folder prefix in meta
            const prefix = imageKey + '/'
            let foundAny = false
            for (const key of Object.keys(meta)) {
              if (key.startsWith(prefix)) {
                delete meta[key]
                foundAny = true
              }
            }
            if (!foundAny) {
              errors.push(`Not found: ${itemPath}`)
              continue
            }
          }
        }

        deleted.push(itemPath)
      } catch (error) {
        console.error(`Failed to delete ${itemPath}:`, error)
        errors.push(itemPath)
      }
    }

    await saveMeta(meta)

    return NextResponse.json({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to delete:', error)
    return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 })
  }
}

export async function handleCreateFolder(request: NextRequest) {
  try {
    const { parentPath, name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '').trim()
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 })
    }

    const safePath = (parentPath || 'public').replace(/\.\./g, '')
    const folderPath = path.join(process.cwd(), safePath, sanitizedName)

    if (!folderPath.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    try {
      await fs.access(folderPath)
      return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 400 })
    } catch {
      // Good - folder doesn't exist
    }

    await fs.mkdir(folderPath, { recursive: true })

    return NextResponse.json({ success: true, path: path.join(safePath, sanitizedName) })
  } catch (error) {
    console.error('Failed to create folder:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}

export async function handleRename(request: NextRequest) {
  try {
    const { oldPath, newName } = await request.json()

    if (!oldPath || !newName) {
      return NextResponse.json({ error: 'Path and new name are required' }, { status: 400 })
    }

    const sanitizedName = newName.replace(/[<>:"/\\|?*]/g, '').trim()
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    const safePath = oldPath.replace(/\.\./g, '')
    const absoluteOldPath = path.join(process.cwd(), safePath)
    const parentDir = path.dirname(absoluteOldPath)
    const absoluteNewPath = path.join(parentDir, sanitizedName)

    if (!absoluteOldPath.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    try {
      await fs.access(absoluteOldPath)
    } catch {
      return NextResponse.json({ error: 'File or folder not found' }, { status: 404 })
    }

    try {
      await fs.access(absoluteNewPath)
      return NextResponse.json({ error: 'An item with this name already exists' }, { status: 400 })
    } catch {
      // Good - new path doesn't exist
    }

    const stats = await fs.stat(absoluteOldPath)
    const isFile = stats.isFile()
    const isImage = isFile && isImageFile(path.basename(oldPath))

    await fs.rename(absoluteOldPath, absoluteNewPath)

    if (isImage) {
      const meta = await loadMeta()
      const oldRelativePath = safePath.replace(/^public\//, '')
      const newRelativePath = path.join(path.dirname(oldRelativePath), sanitizedName)
      const oldKey = '/' + oldRelativePath
      const newKey = '/' + newRelativePath

      if (meta[oldKey]) {
        const entry = meta[oldKey]

        const oldThumbPaths = getAllThumbnailPaths(oldKey)
        const newThumbPaths = getAllThumbnailPaths(newKey)

        for (let i = 0; i < oldThumbPaths.length; i++) {
          const oldThumbPath = path.join(process.cwd(), 'public', oldThumbPaths[i])
          const newThumbPath = path.join(process.cwd(), 'public', newThumbPaths[i])
          
          await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
          
          try {
            await fs.rename(oldThumbPath, newThumbPath)
          } catch {
            // Thumbnail might not exist
          }
        }

        delete meta[oldKey]
        meta[newKey] = entry
      }

      await saveMeta(meta)
    }

    const newPath = path.join(path.dirname(safePath), sanitizedName)
    return NextResponse.json({ success: true, newPath })
  } catch (error) {
    console.error('Failed to rename:', error)
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 })
  }
}

export async function handleMove(request: NextRequest) {
  try {
    const { paths, destination } = await request.json()

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'Paths are required' }, { status: 400 })
    }

    if (!destination || typeof destination !== 'string') {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 })
    }

    const safeDestination = destination.replace(/\.\./g, '')
    const absoluteDestination = path.join(process.cwd(), safeDestination)

    if (!absoluteDestination.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid destination' }, { status: 400 })
    }

    try {
      const destStats = await fs.stat(absoluteDestination)
      if (!destStats.isDirectory()) {
        return NextResponse.json({ error: 'Destination is not a folder' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Destination folder not found' }, { status: 404 })
    }

    const moved: string[] = []
    const errors: string[] = []
    const meta = await loadMeta()
    let metaChanged = false

    for (const itemPath of paths) {
      const safePath = itemPath.replace(/\.\./g, '')
      const absolutePath = path.join(process.cwd(), safePath)
      const itemName = path.basename(safePath)
      const newAbsolutePath = path.join(absoluteDestination, itemName)

      if (absoluteDestination.startsWith(absolutePath + path.sep)) {
        errors.push(`Cannot move ${itemName} into itself`)
        continue
      }

      try {
        await fs.access(absolutePath)
      } catch {
        errors.push(`${itemName} not found`)
        continue
      }

      try {
        await fs.access(newAbsolutePath)
        errors.push(`${itemName} already exists in destination`)
        continue
      } catch {
        // Good - doesn't exist
      }

      try {
        await fs.rename(absolutePath, newAbsolutePath)

        const stats = await fs.stat(newAbsolutePath)
        if (stats.isFile() && isImageFile(itemName)) {
          const oldRelativePath = safePath.replace(/^public\//, '')
          const newRelativePath = path.join(safeDestination.replace(/^public\//, ''), itemName)
          const oldKey = '/' + oldRelativePath
          const newKey = '/' + newRelativePath

          if (meta[oldKey]) {
            const entry = meta[oldKey]

            const oldThumbPaths = getAllThumbnailPaths(oldKey)
            const newThumbPaths = getAllThumbnailPaths(newKey)

            for (let i = 0; i < oldThumbPaths.length; i++) {
              const oldThumbPath = path.join(process.cwd(), 'public', oldThumbPaths[i])
              const newThumbPath = path.join(process.cwd(), 'public', newThumbPaths[i])
              
              await fs.mkdir(path.dirname(newThumbPath), { recursive: true })

              try {
                await fs.rename(oldThumbPath, newThumbPath)
              } catch {
                // Thumbnail might not exist
              }
            }

            delete meta[oldKey]
            meta[newKey] = entry
            metaChanged = true
          }
        }

        moved.push(itemPath)
      } catch {
        errors.push(`Failed to move ${itemName}`)
      }
    }

    if (metaChanged) {
      await saveMeta(meta)
    }

    return NextResponse.json({
      success: errors.length === 0,
      moved,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Failed to move:', error)
    return NextResponse.json({ error: 'Failed to move items' }, { status: 500 })
  }
}
