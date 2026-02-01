import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import type { MetaEntry } from '../types'
import { getAllThumbnailPaths, isProcessed } from '../types'
import { 
  loadMeta, 
  saveMeta, 
  isImageFile, 
  isMediaFile,
  getCdnUrls,
  downloadFromCdn,
  downloadFromRemoteUrl,
  uploadOriginalToCdn,
  uploadToCdn,
  deleteFromCdn,
  deleteLocalThumbnails,
  processImage,
  slugifyFilename,
  slugifyFolderName,
} from './utils'
import { getPublicPath, getWorkspacePath } from '../config'
import { jsonResponse, streamResponse, createSSEStream } from './utils/response'
import { deleteEmptyFolders } from './utils/folders'

export async function handleUpload(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const targetPath = formData.get('path') as string || 'public'

    if (!file) {
      return jsonResponse({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Slugify filename to be URL-safe (lowercase, no spaces, etc.)
    const fileName = slugifyFilename(file.name)
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
      return jsonResponse(
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
    
    const uploadDir = getPublicPath(relativeDir)
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(path.join(uploadDir, actualFileName), buffer)

    if (!isMedia) {
      return jsonResponse({ 
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
          o: { w: metadata.width || 0, h: metadata.height || 0 },
        }
      } catch {
        meta[imageKey] = { o: { w: 0, h: 0 } }
      }
    } else {
      // Non-image media or SVG
      meta[imageKey] = {}
    }

    await saveMeta(meta)

    return jsonResponse({ 
      success: true, 
      imageKey,
      message: 'File uploaded. Run "Process Images" to generate thumbnails.'
    })
  } catch (error) {
    console.error('Failed to upload:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: `Failed to upload file: ${message}` }, { status: 500 })
  }
}

export async function handleDelete(request: Request) {
  try {
    const { paths } = await request.json() as { paths: string[] }

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return jsonResponse({ error: 'No paths provided' }, { status: 400 })
    }

    const meta = await loadMeta()
    const deleted: string[] = []
    const errors: string[] = []
    const sourceFolders = new Set<string>()

    for (const itemPath of paths) {
      try {
        if (!itemPath.startsWith('public/')) {
          errors.push(`Invalid path: ${itemPath}`)
          continue
        }

        const absolutePath = getWorkspacePath(itemPath)
        const imageKey = '/' + itemPath.replace(/^public\//, '')
        
        // Track source folder for cleanup
        sourceFolders.add(path.dirname(absolutePath))
        
        // Check if this is in meta (could be synced with no local file)
        const entry = meta[imageKey] as MetaEntry | undefined
        const isPushedToCloud = entry?.c !== undefined
        const hasThumbnails = entry ? isProcessed(entry) : false
        
        // Try to delete local file/folder
        try {
          const stats = await fs.stat(absolutePath)

          if (stats.isDirectory()) {
            await fs.rm(absolutePath, { recursive: true })
            
            // Remove all meta entries under this folder
            const prefix = imageKey + '/'
            for (const key of Object.keys(meta)) {
              if (key.startsWith(prefix) || key === imageKey) {
                const keyEntry = meta[key] as MetaEntry | undefined
                const keyHasThumbnails = keyEntry ? isProcessed(keyEntry) : false
                
                // Delete from CDN if pushed
                if (keyEntry?.c !== undefined) {
                  try {
                    await deleteFromCdn(key, keyHasThumbnails)
                  } catch { /* ignore CDN delete errors */ }
                } else {
                  // Delete local thumbnails if not synced
                  for (const thumbPath of getAllThumbnailPaths(key)) {
                    const absoluteThumbPath = getPublicPath(thumbPath)
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
              // Delete from CDN if pushed
              if (isPushedToCloud) {
                try {
                  await deleteFromCdn(imageKey, hasThumbnails)
                } catch { /* ignore CDN delete errors */ }
              } else {
                // Delete local thumbnails if not synced
                for (const thumbPath of getAllThumbnailPaths(imageKey)) {
                  const absoluteThumbPath = getPublicPath(thumbPath)
                  try { await fs.unlink(absoluteThumbPath) } catch { /* ignore */ }
                }
              }
              delete meta[imageKey]
            }
          }
        } catch {
          // File doesn't exist locally - might be synced
          if (entry) {
            // Delete from CDN if pushed
            if (isPushedToCloud) {
              try {
                await deleteFromCdn(imageKey, hasThumbnails)
              } catch { /* ignore CDN delete errors */ }
            }
            delete meta[imageKey]
          } else {
            // Check if it's a folder prefix in meta
            const prefix = imageKey + '/'
            let foundAny = false
            for (const key of Object.keys(meta)) {
              if (key.startsWith(prefix)) {
                const keyEntry = meta[key] as MetaEntry | undefined
                const keyHasThumbnails = keyEntry ? isProcessed(keyEntry) : false
                // Delete from CDN if pushed
                if (keyEntry?.c !== undefined) {
                  try {
                    await deleteFromCdn(key, keyHasThumbnails)
                  } catch { /* ignore CDN delete errors */ }
                }
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

    // Clean up empty source folders
    for (const folder of sourceFolders) {
      await deleteEmptyFolders(folder)
    }

    return jsonResponse({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to delete:', error)
    return jsonResponse({ error: 'Failed to delete files' }, { status: 500 })
  }
}

export async function handleCreateFolder(request: Request) {
  try {
    const { parentPath, name } = await request.json()

    if (!name || typeof name !== 'string') {
      return jsonResponse({ error: 'Folder name is required' }, { status: 400 })
    }

    // Slugify folder name to be URL-safe (lowercase, no spaces, etc.)
    const sanitizedName = slugifyFolderName(name)
    if (!sanitizedName) {
      return jsonResponse({ error: 'Invalid folder name' }, { status: 400 })
    }

    const safePath = (parentPath || 'public').replace(/\.\./g, '')
    const folderPath = getWorkspacePath(safePath, sanitizedName)

    if (!folderPath.startsWith(getPublicPath())) {
      return jsonResponse({ error: 'Invalid path' }, { status: 400 })
    }

    try {
      await fs.access(folderPath)
      return jsonResponse({ error: 'A folder with this name already exists' }, { status: 400 })
    } catch {
      // Good - folder doesn't exist
    }

    await fs.mkdir(folderPath, { recursive: true })

    return jsonResponse({ success: true, path: path.join(safePath, sanitizedName) })
  } catch (error) {
    console.error('Failed to create folder:', error)
    return jsonResponse({ error: 'Failed to create folder' }, { status: 500 })
  }
}

export async function handleRename(request: Request) {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '')
  
  try {
    const { oldPath, newName } = await request.json()

    if (!oldPath || !newName) {
      return jsonResponse({ error: 'Path and new name are required' }, { status: 400 })
    }

    const safePath = oldPath.replace(/\.\./g, '')
    const absoluteOldPath = getWorkspacePath(safePath)

    if (!absoluteOldPath.startsWith(getPublicPath())) {
      return jsonResponse({ error: 'Invalid path' }, { status: 400 })
    }

    const oldRelativePath = safePath.replace(/^public\//, '')
    const oldKey = '/' + oldRelativePath
    const isImage = isImageFile(path.basename(oldPath))

    // Load meta to check if this is a cloud file
    const meta = await loadMeta()
    const cdnUrls = getCdnUrls(meta)
    const entry = meta[oldKey] as MetaEntry | undefined
    const isInCloud = entry?.c !== undefined
    const fileCdnUrl = isInCloud && entry.c !== undefined ? cdnUrls[entry.c] : undefined
    const isInOurR2 = isInCloud && fileCdnUrl === publicUrl
    const hasThumbnails = entry ? isProcessed(entry) : false

    // Check if local file exists
    let hasLocalFile = false
    let isFile = true
    try {
      const stats = await fs.stat(absoluteOldPath)
      hasLocalFile = true
      isFile = stats.isFile()
    } catch {
      // No local file - might be cloud-only
      if (!isInCloud) {
        return jsonResponse({ error: 'File or folder not found' }, { status: 404 })
      }
    }

    // Slugify name based on whether it's a file or folder
    const sanitizedName = isFile ? slugifyFilename(newName) : slugifyFolderName(newName)
    if (!sanitizedName) {
      return jsonResponse({ error: 'Invalid name' }, { status: 400 })
    }

    const parentDir = path.dirname(absoluteOldPath)
    const absoluteNewPath = path.join(parentDir, sanitizedName)
    const newRelativePath = path.join(path.dirname(oldRelativePath), sanitizedName)
    const newKey = '/' + newRelativePath

    // Check if new name already exists in meta
    if (meta[newKey]) {
      return jsonResponse({ error: 'An item with this name already exists' }, { status: 400 })
    }

    // Check if new local path already exists
    try {
      await fs.access(absoluteNewPath)
      return jsonResponse({ error: 'An item with this name already exists' }, { status: 400 })
    } catch {
      // Good - new path doesn't exist
    }

    // Handle cloud-only file: download, save locally, then proceed
    if (isInOurR2 && !hasLocalFile && isImage) {
      // Download original from R2
      const buffer = await downloadFromCdn(oldKey)
      await fs.mkdir(path.dirname(absoluteNewPath), { recursive: true })
      await fs.writeFile(absoluteNewPath, buffer)
      
      // Download and save thumbnails with new names
      if (hasThumbnails) {
        const newThumbPaths = getAllThumbnailPaths(newKey)
        const oldThumbPaths = getAllThumbnailPaths(oldKey)
        
        for (let i = 0; i < oldThumbPaths.length; i++) {
          try {
            const thumbBuffer = await downloadFromCdn(oldThumbPaths[i])
            const newThumbLocalPath = getPublicPath(newThumbPaths[i])
            await fs.mkdir(path.dirname(newThumbLocalPath), { recursive: true })
            await fs.writeFile(newThumbLocalPath, thumbBuffer)
          } catch {
            // Thumbnail might not exist
          }
        }
      }
      
      // Delete old files from CDN
      await deleteFromCdn(oldKey, hasThumbnails)
      
      // Upload with new key
      await uploadOriginalToCdn(newKey)
      if (hasThumbnails) {
        await uploadToCdn(newKey)
      }
      
      // Clean up local files
      try { await fs.unlink(absoluteNewPath) } catch { /* ignore */ }
      if (hasThumbnails) {
        await deleteLocalThumbnails(newKey)
      }
      
      // Update meta
      delete meta[oldKey]
      meta[newKey] = entry
      await saveMeta(meta)
      
      const newPath = path.join(path.dirname(safePath), sanitizedName)
      return jsonResponse({ success: true, newPath })
    }

    // Handle local file rename
    if (hasLocalFile) {
      await fs.rename(absoluteOldPath, absoluteNewPath)
    }

    if (isImage && entry) {
      const oldThumbPaths = getAllThumbnailPaths(oldKey)
      const newThumbPaths = getAllThumbnailPaths(newKey)

      // Rename local thumbnails
      for (let i = 0; i < oldThumbPaths.length; i++) {
        const oldThumbPath = getPublicPath(oldThumbPaths[i])
        const newThumbPath = getPublicPath(newThumbPaths[i])
        
        await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
        
        try {
          await fs.rename(oldThumbPath, newThumbPath)
        } catch {
          // Thumbnail might not exist
        }
      }

      // If file was in our R2, rename in cloud too
      if (isInOurR2) {
        // Read new local file and upload with new key
        const buffer = await fs.readFile(absoluteNewPath)
        await fs.mkdir(path.dirname(absoluteNewPath), { recursive: true })
        
        // Delete old from CDN
        await deleteFromCdn(oldKey, hasThumbnails)
        
        // Upload with new key
        await uploadOriginalToCdn(newKey)
        if (hasThumbnails) {
          await uploadToCdn(newKey)
        }
        
        // Clean up local files (they're now on CDN)
        try { await fs.unlink(absoluteNewPath) } catch { /* ignore */ }
        await deleteLocalThumbnails(newKey)
      }

      delete meta[oldKey]
      meta[newKey] = entry
      await saveMeta(meta)
    }

    const newPath = path.join(path.dirname(safePath), sanitizedName)
    return jsonResponse({ success: true, newPath })
  } catch (error) {
    console.error('Failed to rename:', error)
    return jsonResponse({ error: 'Failed to rename' }, { status: 500 })
  }
}

export async function handleMoveStream(request: Request) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const { paths, destination } = await request.json()

        if (!paths || !Array.isArray(paths) || paths.length === 0) {
          sendEvent({ type: 'error', message: 'Paths are required' })
          controller.close()
          return
        }

        if (!destination || typeof destination !== 'string') {
          sendEvent({ type: 'error', message: 'Destination is required' })
          controller.close()
          return
        }

        const safeDestination = destination.replace(/\.\./g, '')
        const absoluteDestination = getWorkspacePath(safeDestination)

        if (!absoluteDestination.startsWith(getPublicPath())) {
          sendEvent({ type: 'error', message: 'Invalid destination' })
          controller.close()
          return
        }

        // Ensure destination folder exists
        await fs.mkdir(absoluteDestination, { recursive: true })

        const meta = await loadMeta()
        const cdnUrls = getCdnUrls(meta)
        const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '') || ''

        const moved: string[] = []
        const errors: string[] = []
        const sourceFolders = new Set<string>()
        const total = paths.length

        sendEvent({ type: 'start', total })

        for (let i = 0; i < paths.length; i++) {
          const itemPath = paths[i]
          const safePath = itemPath.replace(/\.\./g, '')
          const itemName = path.basename(safePath)
          const newAbsolutePath = path.join(absoluteDestination, itemName)

          // Build meta keys
          const oldRelativePath = safePath.replace(/^public\/?/, '')
          const destWithoutPublic = safeDestination.replace(/^public\/?/, '')
          const newRelativePath = destWithoutPublic ? path.join(destWithoutPublic, itemName) : itemName
          const oldKey = '/' + oldRelativePath
          const newKey = '/' + newRelativePath

          // Check if destination already exists in meta
          if (meta[newKey]) {
            errors.push(`${itemName} already exists in destination`)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total,
              moved: moved.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: itemName,
            })
            continue
          }

          const entry = meta[oldKey] as MetaEntry | undefined
          const isImage = isImageFile(itemName)

          // Determine if cloud or remote
          const isInCloud = entry?.c !== undefined
          const fileCdnUrl = isInCloud && entry.c !== undefined ? cdnUrls[entry.c] : undefined
          const isRemote = isInCloud && (!r2PublicUrl || fileCdnUrl !== r2PublicUrl)
          const isPushedToR2 = isInCloud && r2PublicUrl && fileCdnUrl === r2PublicUrl
          const hasProcessedThumbnails = isProcessed(entry)

          try {
            // Track source folder for cleanup
            const sourceFolder = path.dirname(getWorkspacePath(safePath))
            sourceFolders.add(sourceFolder)

            if (isRemote && isImage) {
              // ===== REMOTE IMAGE =====
              const remoteUrl = `${fileCdnUrl}${oldKey}`
              const buffer = await downloadFromRemoteUrl(remoteUrl)
              
              await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true })
              await fs.writeFile(newAbsolutePath, buffer)
              
              const newEntry: MetaEntry = {
                o: entry?.o,
                b: entry?.b,
              }
              delete meta[oldKey]
              meta[newKey] = newEntry
              moved.push(itemPath)
              sendEvent({
                type: 'progress',
                current: i + 1,
                total,
                moved: moved.length,
                percent: Math.round(((i + 1) / total) * 100),
                currentFile: itemName,
              })

            } else if (isPushedToR2 && isImage) {
              // ===== CLOUD IMAGE (R2) =====
              const buffer = await downloadFromCdn(oldKey)
              
              await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true })
              await fs.writeFile(newAbsolutePath, buffer)
              
              let newEntry: MetaEntry = {
                o: entry?.o,
                b: entry?.b,
              }
              
              if (hasProcessedThumbnails) {
                const processedEntry = await processImage(buffer, newKey)
                newEntry = { ...newEntry, ...processedEntry }
              }
              
              await uploadOriginalToCdn(newKey)
              
              if (hasProcessedThumbnails) {
                await uploadToCdn(newKey)
              }
              
              await deleteFromCdn(oldKey, hasProcessedThumbnails)
              
              try { await fs.unlink(newAbsolutePath) } catch { /* ignore */ }
              if (hasProcessedThumbnails) {
                await deleteLocalThumbnails(newKey)
              }
              
              newEntry.c = entry?.c
              
              delete meta[oldKey]
              meta[newKey] = newEntry
              moved.push(itemPath)
              sendEvent({
                type: 'progress',
                current: i + 1,
                total,
                moved: moved.length,
                percent: Math.round(((i + 1) / total) * 100),
                currentFile: itemName,
              })

            } else {
              // ===== LOCAL FILE =====
              const absolutePath = getWorkspacePath(safePath)

              if (absoluteDestination.startsWith(absolutePath + path.sep)) {
                errors.push(`Cannot move ${itemName} into itself`)
                sendEvent({
                  type: 'progress',
                  current: i + 1,
                  total,
                  moved: moved.length,
                  percent: Math.round(((i + 1) / total) * 100),
                  currentFile: itemName,
                })
                continue
              }

              try {
                await fs.access(absolutePath)
              } catch {
                errors.push(`${itemName} not found`)
                sendEvent({
                  type: 'progress',
                  current: i + 1,
                  total,
                  moved: moved.length,
                  percent: Math.round(((i + 1) / total) * 100),
                  currentFile: itemName,
                })
                continue
              }

              try {
                await fs.access(newAbsolutePath)
                errors.push(`${itemName} already exists in destination`)
                sendEvent({
                  type: 'progress',
                  current: i + 1,
                  total,
                  moved: moved.length,
                  percent: Math.round(((i + 1) / total) * 100),
                  currentFile: itemName,
                })
                continue
              } catch {
                // Good
              }

              await fs.rename(absolutePath, newAbsolutePath)

              const stats = await fs.stat(newAbsolutePath)
              if (stats.isFile() && isImage && entry) {
                const oldThumbPaths = getAllThumbnailPaths(oldKey)
                const newThumbPaths = getAllThumbnailPaths(newKey)

                for (let j = 0; j < oldThumbPaths.length; j++) {
                  const oldThumbPath = getPublicPath(oldThumbPaths[j])
                  const newThumbPath = getPublicPath(newThumbPaths[j])

                  try {
                    // Check if thumbnail exists before trying to move
                    await fs.access(oldThumbPath)
                    
                    // Track thumbnail source folder for cleanup
                    sourceFolders.add(path.dirname(oldThumbPath))
                    
                    // Create destination folder and move thumbnail
                    await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
                    await fs.rename(oldThumbPath, newThumbPath)
                  } catch {
                    // Thumbnail doesn't exist, skip
                  }
                }

                delete meta[oldKey]
                meta[newKey] = entry
              } else if (stats.isDirectory()) {
                const oldPrefix = oldKey + '/'
                const newPrefix = newKey + '/'
                
                for (const key of Object.keys(meta)) {
                  if (key.startsWith(oldPrefix)) {
                    const newMetaKey = newPrefix + key.slice(oldPrefix.length)
                    meta[newMetaKey] = meta[key]
                    delete meta[key]
                  }
                }
              }

              moved.push(itemPath)
              sendEvent({
                type: 'progress',
                current: i + 1,
                total,
                moved: moved.length,
                percent: Math.round(((i + 1) / total) * 100),
                currentFile: itemName,
              })
            }
          } catch (err) {
            console.error(`Failed to move ${itemName}:`, err)
            errors.push(`Failed to move ${itemName}`)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total,
              moved: moved.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: itemName,
            })
          }
        }

        await saveMeta(meta)

        // Clean up empty source folders
        for (const folder of sourceFolders) {
          await deleteEmptyFolders(folder)
        }

        sendEvent({
          type: 'complete',
          moved: moved.length,
          errors: errors.length,
          errorMessages: errors,
        })
      } catch (error) {
        console.error('Failed to move:', error)
        sendEvent({ type: 'error', message: 'Failed to move items' })
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

export async function handleMove(request: Request) {
  try {
    const { paths, destination } = await request.json()

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return jsonResponse({ error: 'Paths are required' }, { status: 400 })
    }

    if (!destination || typeof destination !== 'string') {
      return jsonResponse({ error: 'Destination is required' }, { status: 400 })
    }

    const safeDestination = destination.replace(/\.\./g, '')
    const absoluteDestination = getWorkspacePath(safeDestination)

    if (!absoluteDestination.startsWith(getPublicPath())) {
      return jsonResponse({ error: 'Invalid destination' }, { status: 400 })
    }

    // Ensure destination folder exists (create if needed)
    await fs.mkdir(absoluteDestination, { recursive: true })

    const moved: string[] = []
    const errors: string[] = []
    const sourceFolders = new Set<string>()
    const meta = await loadMeta()
    const cdnUrls = getCdnUrls(meta)
    const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '') || ''
    let metaChanged = false

    for (const itemPath of paths) {
      const safePath = itemPath.replace(/\.\./g, '')
      const itemName = path.basename(safePath)
      const newAbsolutePath = path.join(absoluteDestination, itemName)

      // Build meta keys
      const oldRelativePath = safePath.replace(/^public\/?/, '')
      const destWithoutPublic = safeDestination.replace(/^public\/?/, '')
      const newRelativePath = destWithoutPublic ? path.join(destWithoutPublic, itemName) : itemName
      const oldKey = '/' + oldRelativePath
      const newKey = '/' + newRelativePath

      // Track source folder for cleanup
      sourceFolders.add(path.dirname(getWorkspacePath(safePath)))

      // Check if destination already exists in meta
      if (meta[newKey]) {
        errors.push(`${itemName} already exists in destination`)
        continue
      }

      const entry = meta[oldKey] as MetaEntry | undefined
      const isImage = isImageFile(itemName)

      // Determine if cloud or remote
      const isInCloud = entry?.c !== undefined
      const fileCdnUrl = isInCloud && entry.c !== undefined ? cdnUrls[entry.c] : undefined
      const isRemote = isInCloud && (!r2PublicUrl || fileCdnUrl !== r2PublicUrl)
      const isPushedToR2 = isInCloud && r2PublicUrl && fileCdnUrl === r2PublicUrl
      const hasProcessedThumbnails = isProcessed(entry)

      try {
        if (isRemote && isImage) {
          // ===== REMOTE IMAGE: Download from external URL, save locally, remove c =====
          const remoteUrl = `${fileCdnUrl}${oldKey}`
          const buffer = await downloadFromRemoteUrl(remoteUrl)
          
          // Save to new local location
          await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true })
          await fs.writeFile(newAbsolutePath, buffer)
          
          // Update meta: remove c (now local), keep other properties
          const newEntry: MetaEntry = {
            o: entry?.o,
            b: entry?.b,
            // Don't copy thumbnail dims since remote images don't have local thumbnails
            // Don't copy c since it's now local
          }
          delete meta[oldKey]
          meta[newKey] = newEntry
          metaChanged = true
          moved.push(itemPath)

        } else if (isPushedToR2 && isImage) {
          // ===== CLOUD IMAGE (R2): Download, move, re-upload, delete old =====
          
          // Download original from R2
          const buffer = await downloadFromCdn(oldKey)
          
          // Save to new local location
          await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true })
          await fs.writeFile(newAbsolutePath, buffer)
          
          // Create new meta entry
          let newEntry: MetaEntry = {
            o: entry?.o,
            b: entry?.b,
          }
          
          // If processed, regenerate thumbnails
          if (hasProcessedThumbnails) {
            const processedEntry = await processImage(buffer, newKey)
            newEntry = { ...newEntry, ...processedEntry }
          }
          
          // Upload original to new R2 location
          await uploadOriginalToCdn(newKey)
          
          // If processed, upload thumbnails to R2
          if (hasProcessedThumbnails) {
            await uploadToCdn(newKey)
          }
          
          // Delete old files from R2
          await deleteFromCdn(oldKey, hasProcessedThumbnails)
          
          // Delete local files (keep cloud-only state)
          try { await fs.unlink(newAbsolutePath) } catch { /* ignore */ }
          if (hasProcessedThumbnails) {
            await deleteLocalThumbnails(newKey)
          }
          
          // Set c to same CDN index
          newEntry.c = entry?.c
          
          // Update meta
          delete meta[oldKey]
          meta[newKey] = newEntry
          metaChanged = true
          moved.push(itemPath)

        } else {
          // ===== LOCAL FILE: Use standard fs.rename =====
          const absolutePath = getWorkspacePath(safePath)

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

          await fs.rename(absolutePath, newAbsolutePath)

          const stats = await fs.stat(newAbsolutePath)
          if (stats.isFile() && isImage && entry) {
            // Move local thumbnails
            const oldThumbPaths = getAllThumbnailPaths(oldKey)
            const newThumbPaths = getAllThumbnailPaths(newKey)

            for (let i = 0; i < oldThumbPaths.length; i++) {
              const oldThumbPath = getPublicPath(oldThumbPaths[i])
              const newThumbPath = getPublicPath(newThumbPaths[i])

              try {
                // Check if thumbnail exists before trying to move
                await fs.access(oldThumbPath)
                
                // Track thumbnail source folder for cleanup
                sourceFolders.add(path.dirname(oldThumbPath))
                
                // Create destination folder and move thumbnail
                await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
                await fs.rename(oldThumbPath, newThumbPath)
              } catch {
                // Thumbnail doesn't exist, skip
              }
            }

            delete meta[oldKey]
            meta[newKey] = entry
            metaChanged = true
          } else if (stats.isDirectory()) {
            // Move folder: update all meta entries under this folder
            const oldPrefix = oldKey + '/'
            const newPrefix = newKey + '/'
            
            for (const key of Object.keys(meta)) {
              if (key.startsWith(oldPrefix)) {
                const newMetaKey = newPrefix + key.slice(oldPrefix.length)
                meta[newMetaKey] = meta[key]
                delete meta[key]
                metaChanged = true
              }
            }
          }

          moved.push(itemPath)
        }
      } catch (err) {
        console.error(`Failed to move ${itemName}:`, err)
        errors.push(`Failed to move ${itemName}`)
      }
    }

    if (metaChanged) {
      await saveMeta(meta)
    }

    // Clean up empty source folders
    for (const folder of sourceFolders) {
      await deleteEmptyFolders(folder)
    }

    return jsonResponse({
      success: errors.length === 0,
      moved,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Failed to move:', error)
    return jsonResponse({ error: 'Failed to move items' }, { status: 500 })
  }
}
