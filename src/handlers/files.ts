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
  moveInCdn,
} from './utils'
import { getPublicPath, getWorkspacePath } from '../config'
import { jsonResponse, streamResponse, createSSEStream } from './utils/response'
import { deleteEmptyFolders } from './utils/folders'
import { isOperationCancelled } from './images'

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

    // Handle cloud-only file: use server-side copy in R2
    if (isInOurR2 && !hasLocalFile) {
      // Server-side rename in R2 (copy + delete, no download needed)
      await moveInCdn(oldKey, newKey, hasThumbnails)
      
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

      // If file was in our R2, rename in cloud too (server-side)
      if (isInOurR2) {
        await moveInCdn(oldKey, newKey, hasThumbnails)
        
        // Clean up local files (they're now on CDN only)
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

export async function handleRenameStream(request: Request) {
  const encoder = new TextEncoder()
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '')
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const { oldPath, newName, operationId } = await request.json()

        if (!oldPath || !newName) {
          sendEvent({ type: 'error', message: 'Path and new name are required' })
          controller.close()
          return
        }

        // Helper to check if operation was cancelled
        const isCancelled = () => operationId ? isOperationCancelled(operationId) : false

        const safePath = oldPath.replace(/\.\./g, '')
        const absoluteOldPath = getWorkspacePath(safePath)

        if (!absoluteOldPath.startsWith(getPublicPath())) {
          sendEvent({ type: 'error', message: 'Invalid path' })
          controller.close()
          return
        }

        const oldRelativePath = safePath.replace(/^public\//, '')
        const isImagePath = isImageFile(path.basename(oldPath))

        // Check if item exists and if it's a file or folder
        let hasLocalItem = false
        let isFile = true
        let isVirtualFolder = false
        try {
          const stats = await fs.stat(absoluteOldPath)
          hasLocalItem = true
          isFile = stats.isFile()
        } catch {
          // Check if it's a cloud-only file or virtual folder
          const meta = await loadMeta()
          const oldKey = '/' + oldRelativePath
          const entry = meta[oldKey] as MetaEntry | undefined
          
          if (entry) {
            // Cloud-only file
            isFile = true
          } else {
            // Check if it's a virtual folder (folder that only exists in meta keys)
            const folderPrefix = oldKey + '/'
            const hasChildrenInMeta = Object.keys(meta).some(key => key.startsWith(folderPrefix))
            
            if (hasChildrenInMeta) {
              // Virtual folder - exists only in meta
              isFile = false
              isVirtualFolder = true
            } else {
              sendEvent({ type: 'error', message: 'File or folder not found' })
              controller.close()
              return
            }
          }
        }

        // Slugify name based on type
        const sanitizedName = isFile ? slugifyFilename(newName) : slugifyFolderName(newName)
        if (!sanitizedName) {
          sendEvent({ type: 'error', message: 'Invalid name' })
          controller.close()
          return
        }

        const parentDir = path.dirname(absoluteOldPath)
        const absoluteNewPath = path.join(parentDir, sanitizedName)
        const newRelativePath = path.join(path.dirname(oldRelativePath), sanitizedName)
        const newPath = path.join(path.dirname(safePath), sanitizedName)

        // Check if destination exists
        const meta = await loadMeta()
        const cdnUrls = getCdnUrls(meta)

        // For files, check new key doesn't exist
        if (isFile) {
          const newKey = '/' + newRelativePath
          if (meta[newKey]) {
            sendEvent({ type: 'error', message: 'An item with this name already exists' })
            controller.close()
            return
          }
        }

        // Only check local path if not a virtual folder
        if (!isVirtualFolder) {
          try {
            await fs.access(absoluteNewPath)
            sendEvent({ type: 'error', message: 'An item with this name already exists' })
            controller.close()
            return
          } catch {
            // Good - doesn't exist
          }
        }

        // For virtual folders, check if new prefix would conflict with existing meta keys
        if (isVirtualFolder) {
          const newPrefix = '/' + newRelativePath + '/'
          const hasConflict = Object.keys(meta).some(key => key.startsWith(newPrefix))
          if (hasConflict) {
            sendEvent({ type: 'error', message: 'A folder with this name already exists' })
            controller.close()
            return
          }
        }

        // ========== FOLDER RENAME ==========
        if (!isFile) {
          // Collect all items in the folder that need meta updates
          const oldPrefix = '/' + oldRelativePath + '/'
          const newPrefix = '/' + newRelativePath + '/'
          
          // Find all meta entries under this folder
          const itemsToUpdate: Array<{ oldKey: string; newKey: string; entry: MetaEntry }> = []
          for (const [key, entry] of Object.entries(meta)) {
            if (key.startsWith(oldPrefix) && entry && typeof entry === 'object') {
              const newKey = key.replace(oldPrefix, newPrefix)
              itemsToUpdate.push({ oldKey: key, newKey, entry: entry as MetaEntry })
            }
          }

          const total = itemsToUpdate.length + 1 // +1 for the folder rename itself
          sendEvent({ type: 'start', total, message: `Renaming folder with ${itemsToUpdate.length} item(s)...` })

          // Step 1: Rename the local folder and thumbnail folders
          if (hasLocalItem) {
            await fs.rename(absoluteOldPath, absoluteNewPath)
            
            // Also rename thumbnail directories
            // Thumbnails are at /images/folder/... so we need to rename those too
            const imagesDir = getPublicPath('/images')
            const oldThumbFolder = path.join(imagesDir, oldRelativePath)
            const newThumbFolder = path.join(imagesDir, newRelativePath)
            try {
              await fs.access(oldThumbFolder)
              await fs.mkdir(path.dirname(newThumbFolder), { recursive: true })
              await fs.rename(oldThumbFolder, newThumbFolder)
            } catch {
              // Thumbnail folder might not exist
            }
          }
          sendEvent({ type: 'progress', current: 1, total, renamed: 1, message: 'Renamed folder' })

          // Step 2: Update each item in the folder
          let renamed = 1
          
          // Helper for cleanup on cancel
          const handleRenameCancel = async () => {
            await saveMeta(meta)
            // Clean up empty folders
            await deleteEmptyFolders(absoluteOldPath)
            const oldThumbFolder = path.join(getPublicPath('/images'), oldRelativePath)
            await deleteEmptyFolders(oldThumbFolder)
            sendEvent({ type: 'complete', renamed, newPath, cancelled: true })
            controller.close()
          }
          
          for (const item of itemsToUpdate) {
            // Check for cancellation
            if (isCancelled()) {
              await handleRenameCancel()
              return
            }
            const { oldKey, newKey, entry } = item
            const isInCloud = entry.c !== undefined
            const fileCdnUrl = isInCloud ? cdnUrls[entry.c!] : undefined
            const isInOurR2 = isInCloud && fileCdnUrl === publicUrl
            const hasThumbnails = isProcessed(entry)

            // If in our R2, rename using server-side copy
            if (isInOurR2) {
              try {
                await moveInCdn(oldKey, newKey, hasThumbnails)
                
                // Clean up any local files that might exist after folder rename
                const localFilePath = getPublicPath(newKey)
                try { await fs.unlink(localFilePath) } catch { /* ignore */ }
                if (hasThumbnails) {
                  await deleteLocalThumbnails(newKey)
                }
              } catch (err) {
                console.error(`Failed to rename in CDN ${oldKey}:`, err)
              }
            }

            // Update meta entry
            delete meta[oldKey]
            meta[newKey] = entry
            await saveMeta(meta)

            renamed++
            sendEvent({ 
              type: 'progress', 
              current: renamed, 
              total, 
              renamed,
              message: `Renamed ${path.basename(newKey)}` 
            })
          }

          // Clean up empty folders (old folder location and old thumbnail location)
          await deleteEmptyFolders(absoluteOldPath)
          const oldThumbFolder = path.join(getPublicPath('/images'), oldRelativePath)
          await deleteEmptyFolders(oldThumbFolder)

          sendEvent({ type: 'complete', renamed, newPath })
          controller.close()
          return
        }

        // ========== SINGLE FILE RENAME ==========
        const oldKey = '/' + oldRelativePath
        const newKey = '/' + newRelativePath
        const entry = meta[oldKey] as MetaEntry | undefined
        const isInCloud = entry?.c !== undefined
        const fileCdnUrl = isInCloud && entry?.c !== undefined ? cdnUrls[entry.c] : undefined
        const isInOurR2 = isInCloud && fileCdnUrl === publicUrl
        const hasThumbnails = entry ? isProcessed(entry) : false

        sendEvent({ type: 'start', total: 1, message: 'Renaming file...' })

        // Handle cloud-only file (server-side rename in R2)
        if (isInOurR2 && !hasLocalItem) {
          await moveInCdn(oldKey, newKey, hasThumbnails)
          
          delete meta[oldKey]
          if (entry) meta[newKey] = entry
          await saveMeta(meta)
          
          sendEvent({ type: 'complete', renamed: 1, newPath })
          controller.close()
          return
        }

        // Handle local file rename
        if (hasLocalItem) {
          await fs.rename(absoluteOldPath, absoluteNewPath)
        }

        if (isImagePath && entry) {
          const oldThumbPaths = getAllThumbnailPaths(oldKey)
          const newThumbPaths = getAllThumbnailPaths(newKey)

          for (let i = 0; i < oldThumbPaths.length; i++) {
            const oldThumbPath = getPublicPath(oldThumbPaths[i])
            const newThumbPath = getPublicPath(newThumbPaths[i])
            
            await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
            
            try {
              await fs.rename(oldThumbPath, newThumbPath)
            } catch { /* skip */ }
          }

          if (isInOurR2) {
            // Server-side rename in R2
            await moveInCdn(oldKey, newKey, hasThumbnails)
            
            // Clean up local files (they're now on CDN only)
            try { await fs.unlink(absoluteNewPath) } catch { /* ignore */ }
            await deleteLocalThumbnails(newKey)
          }

          delete meta[oldKey]
          meta[newKey] = entry
          await saveMeta(meta)
        }

        sendEvent({ type: 'complete', renamed: 1, newPath })
        controller.close()
      } catch (error) {
        console.error('Rename stream error:', error)
        sendEvent({ type: 'error', message: 'Failed to rename' })
        controller.close()
      }
    }
  })

  return streamResponse(stream)
}

export async function handleMoveStream(request: Request) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const { paths, destination, operationId } = await request.json()

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

        // Helper to check if operation was cancelled
        const isCancelled = () => operationId ? isOperationCancelled(operationId) : false

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
        
        // Pre-calculate total files to move (expand folders and virtual folders)
        let totalFiles = 0
        const expandedItems: Array<{
          itemPath: string
          safePath: string
          itemName: string
          oldKey: string
          newKey: string
          newAbsolutePath: string
          isVirtualFolder: boolean
          virtualFolderItems?: Array<{ oldKey: string; newKey: string; entry: MetaEntry }>
        }> = []

        for (const itemPath of paths) {
          const safePath = itemPath.replace(/\.\./g, '')
          const itemName = path.basename(safePath)
          const oldRelativePath = safePath.replace(/^public\/?/, '')
          const destWithoutPublic = safeDestination.replace(/^public\/?/, '')
          const newRelativePath = destWithoutPublic ? path.join(destWithoutPublic, itemName) : itemName
          const oldKey = '/' + oldRelativePath
          const newKey = '/' + newRelativePath
          const newAbsolutePath = path.join(absoluteDestination, itemName)
          const absolutePath = getWorkspacePath(safePath)
          
          // Check if it's a physical item
          let hasLocalItem = false
          let isDirectory = false
          try {
            const stats = await fs.stat(absolutePath)
            hasLocalItem = true
            isDirectory = stats.isDirectory()
          } catch {
            // Check if it's a virtual folder
          }
          
          if (hasLocalItem && isDirectory) {
            // Count files in physical directory
            const countFilesRecursive = async (dir: string): Promise<number> => {
              let count = 0
              const entries = await fs.readdir(dir, { withFileTypes: true })
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  count += await countFilesRecursive(path.join(dir, entry.name))
                } else {
                  count++
                }
              }
              return count
            }
            const localFileCount = await countFilesRecursive(absolutePath)
            
            // Also count cloud-only files in meta that aren't local
            const folderPrefix = oldKey + '/'
            let cloudOnlyCount = 0
            for (const metaKey of Object.keys(meta)) {
              if (metaKey.startsWith(folderPrefix)) {
                const relPath = metaKey.slice(folderPrefix.length)
                const localPath = path.join(absolutePath, relPath)
                try {
                  await fs.access(localPath)
                  // File exists locally, already counted
                } catch {
                  // Cloud-only file
                  cloudOnlyCount++
                }
              }
            }
            
            totalFiles += localFileCount + cloudOnlyCount
            expandedItems.push({ itemPath, safePath, itemName, oldKey, newKey, newAbsolutePath, isVirtualFolder: false })
          } else if (!hasLocalItem) {
            // Check for virtual folder
            const folderPrefix = oldKey + '/'
            const virtualItems: Array<{ oldKey: string; newKey: string; entry: MetaEntry }> = []
            for (const [key, metaEntry] of Object.entries(meta)) {
              if (key.startsWith(folderPrefix) && metaEntry && typeof metaEntry === 'object') {
                const relativePath = key.slice(folderPrefix.length)
                const destNewKey = newKey + '/' + relativePath
                virtualItems.push({ oldKey: key, newKey: destNewKey, entry: metaEntry as MetaEntry })
              }
            }
            if (virtualItems.length > 0) {
              totalFiles += virtualItems.length
              expandedItems.push({ itemPath, safePath, itemName, oldKey, newKey, newAbsolutePath, isVirtualFolder: true, virtualFolderItems: virtualItems })
              // Track source folder for cleanup
              sourceFolders.add(absolutePath)
            } else {
              // Single file (local or cloud)
              totalFiles++
              expandedItems.push({ itemPath, safePath, itemName, oldKey, newKey, newAbsolutePath, isVirtualFolder: false })
            }
          } else {
            // Single local file
            totalFiles++
            expandedItems.push({ itemPath, safePath, itemName, oldKey, newKey, newAbsolutePath, isVirtualFolder: false })
          }
        }

        sendEvent({ type: 'start', total: totalFiles })
        let processedFiles = 0

        // Track individual files moved (for accurate count on cancel)
        let filesMoved = 0
        
        // Helper to do cleanup and send cancel complete
        const handleCancel = async () => {
          await saveMeta(meta)
          // Clean up empty source folders
          for (const folder of sourceFolders) {
            await deleteEmptyFolders(folder)
          }
          // Clean up destination if it became empty
          await deleteEmptyFolders(absoluteDestination)
          sendEvent({ type: 'complete', moved: filesMoved, errors: errors.length, errorMessages: errors, cancelled: true })
          controller.close()
        }
        
        for (const expandedItem of expandedItems) {
          // Check for cancellation before processing each item
          if (isCancelled()) {
            await handleCancel()
            return
          }

          const { itemPath, safePath, itemName, oldKey, newKey, newAbsolutePath, isVirtualFolder, virtualFolderItems } = expandedItem

          // Handle virtual folder
          if (isVirtualFolder && virtualFolderItems) {
            for (const vItem of virtualFolderItems) {
              // Check for cancellation before processing each virtual item
              if (isCancelled()) {
                await handleCancel()
                return
              }
              const itemEntry = vItem.entry
              const isItemInCloud = itemEntry.c !== undefined
              const itemCdnUrl = isItemInCloud ? cdnUrls[itemEntry.c!] : undefined
              const isItemInR2 = isItemInCloud && itemCdnUrl === r2PublicUrl
              const itemHasThumbnails = isProcessed(itemEntry)
              
              let vItemMoved = false
              
              if (isItemInR2) {
                try {
                  // Server-side copy+delete in R2 (no download/upload needed)
                  await moveInCdn(vItem.oldKey, vItem.newKey, itemHasThumbnails)
                  vItemMoved = true
                  filesMoved++
                } catch (err) {
                  console.error(`Failed to move cloud item ${vItem.oldKey}:`, err)
                  // File doesn't exist on CDN - remove orphaned meta entry
                  delete meta[vItem.oldKey]
                  await saveMeta(meta)
                }
              }
              
              // Only update meta if file was successfully moved
              if (vItemMoved) {
                delete meta[vItem.oldKey]
                meta[vItem.newKey] = itemEntry
                await saveMeta(meta)
                // Track source folder for cleanup
                const oldAbsPath = getPublicPath(vItem.oldKey)
                sourceFolders.add(path.dirname(oldAbsPath))
              }
              
              processedFiles++
              sendEvent({
                type: 'progress',
                current: processedFiles,
                total: totalFiles,
                moved: filesMoved,
                percent: Math.round((processedFiles / totalFiles) * 100),
                currentFile: path.basename(vItem.newKey),
              })
            }
            
            // Clean up temp folders created for virtual folder cloud file processing
            // Clean up the new folder location (where temp files were downloaded)
            const newFolderPath = getPublicPath(newKey)
            await deleteEmptyFolders(newFolderPath)
            // Clean up thumbnail folder
            const newThumbFolder = path.join(getPublicPath('images'), newKey.slice(1))
            await deleteEmptyFolders(newThumbFolder)
            // Track old folder for cleanup
            const oldFolderPath = getPublicPath(oldKey)
            sourceFolders.add(oldFolderPath)
            
            moved.push(itemPath)
            continue
          }

          // Check if destination already exists in meta
          if (meta[newKey]) {
            errors.push(`${itemName} already exists in destination`)
            processedFiles++
            sendEvent({
              type: 'progress',
              current: processedFiles,
              total: totalFiles,
              moved: moved.length,
              percent: Math.round((processedFiles / totalFiles) * 100),
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

            if (isRemote) {
              // ===== REMOTE FILE (external CDN) =====
              // Download to local with new path
              const remoteUrl = `${fileCdnUrl}${oldKey}`
              const buffer = await downloadFromRemoteUrl(remoteUrl)
              
              await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true })
              await fs.writeFile(newAbsolutePath, buffer)
              
              // Create new entry without CDN reference (now local)
              const newEntry: MetaEntry = {
                o: entry?.o,
                b: entry?.b,
              }
              delete meta[oldKey]
              meta[newKey] = newEntry
              await saveMeta(meta)
              moved.push(itemPath)
              filesMoved++
              processedFiles++
              sendEvent({
                type: 'progress',
                current: processedFiles,
                total: totalFiles,
                moved: filesMoved,
                percent: Math.round((processedFiles / totalFiles) * 100),
                currentFile: itemName,
              })

            } else if (isPushedToR2) {
              // ===== CLOUD FILE (R2) - server-side move =====
              // Works for both images and non-images
              await moveInCdn(oldKey, newKey, hasProcessedThumbnails)
              
              // Keep same entry, just update the key
              delete meta[oldKey]
              if (entry) {
                meta[newKey] = entry
              }
              await saveMeta(meta)
              moved.push(itemPath)
              filesMoved++
              processedFiles++
              sendEvent({
                type: 'progress',
                current: processedFiles,
                total: totalFiles,
                moved: filesMoved,
                percent: Math.round((processedFiles / totalFiles) * 100),
                currentFile: itemName,
              })

            } else {
              // ===== LOCAL FILE =====
              const absolutePath = getWorkspacePath(safePath)

              if (absoluteDestination.startsWith(absolutePath + path.sep)) {
                errors.push(`Cannot move ${itemName} into itself`)
                processedFiles++
                sendEvent({
                  type: 'progress',
                  current: processedFiles,
                  total: totalFiles,
                  moved: filesMoved,
                  percent: Math.round((processedFiles / totalFiles) * 100),
                  currentFile: itemName,
                })
                continue
              }

              // Check if local file/folder exists
              try {
                await fs.access(absolutePath)
              } catch {
                errors.push(`${itemName} not found`)
                processedFiles++
                sendEvent({
                  type: 'progress',
                  current: processedFiles,
                  total: totalFiles,
                  moved: filesMoved,
                  percent: Math.round((processedFiles / totalFiles) * 100),
                  currentFile: itemName,
                })
                continue
              }

              try {
                await fs.access(newAbsolutePath)
                errors.push(`${itemName} already exists in destination`)
                processedFiles++
                sendEvent({
                  type: 'progress',
                  current: processedFiles,
                  total: totalFiles,
                  moved: filesMoved,
                  percent: Math.round((processedFiles / totalFiles) * 100),
                  currentFile: itemName,
                })
                continue
              } catch {
                // Good
              }

              const stats = await fs.stat(absolutePath)
              
              if (stats.isFile()) {
                // ===== SINGLE LOCAL FILE =====
                await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true })
                await fs.rename(absolutePath, newAbsolutePath)
                
                if (isImage && entry) {
                  const oldThumbPaths = getAllThumbnailPaths(oldKey)
                  const newThumbPaths = getAllThumbnailPaths(newKey)

                  for (let j = 0; j < oldThumbPaths.length; j++) {
                    const oldThumbPath = getPublicPath(oldThumbPaths[j])
                    const newThumbPath = getPublicPath(newThumbPaths[j])

                    try {
                      await fs.access(oldThumbPath)
                      sourceFolders.add(path.dirname(oldThumbPath))
                      await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
                      await fs.rename(oldThumbPath, newThumbPath)
                    } catch {
                      // Thumbnail doesn't exist
                    }
                  }
                  
                  // Check if file was synced to cloud - needs re-upload with new key
                  const fileIsInCloud = entry.c !== undefined
                  const fileCdnUrl = fileIsInCloud ? cdnUrls[entry.c!] : undefined
                  const fileIsInR2 = fileIsInCloud && fileCdnUrl === r2PublicUrl
                  const fileHasThumbs = isProcessed(entry)
                  
                  if (fileIsInR2) {
                    // Re-upload with new key
                    await deleteFromCdn(oldKey, fileHasThumbs)
                    await uploadOriginalToCdn(newKey)
                    if (fileHasThumbs) {
                      await uploadToCdn(newKey)
                    }
                  }

                  delete meta[oldKey]
                  meta[newKey] = entry
                  await saveMeta(meta)
                }
                
                moved.push(itemPath)
                filesMoved++
                processedFiles++
                sendEvent({
                  type: 'progress',
                  current: processedFiles,
                  total: totalFiles,
                  moved: filesMoved,
                  percent: Math.round((processedFiles / totalFiles) * 100),
                  currentFile: itemName,
                })
                
              } else if (stats.isDirectory()) {
                // ===== LOCAL DIRECTORY - iterate through files =====
                const oldPrefix = oldKey + '/'
                const newPrefix = newKey + '/'
                
                // Collect all files in directory (local + cloud-only from meta)
                const localFiles: Array<{ relativePath: string; isImage: boolean }> = []
                
                const collectLocalFiles = async (dir: string, relativeDir: string) => {
                  const entries = await fs.readdir(dir, { withFileTypes: true })
                  for (const dirEntry of entries) {
                    const entryRelPath = relativeDir ? `${relativeDir}/${dirEntry.name}` : dirEntry.name
                    if (dirEntry.isDirectory()) {
                      await collectLocalFiles(path.join(dir, dirEntry.name), entryRelPath)
                    } else {
                      localFiles.push({ relativePath: entryRelPath, isImage: isImageFile(dirEntry.name) })
                    }
                  }
                }
                await collectLocalFiles(absolutePath, '')
                
                // Also find cloud-only files from meta that aren't local
                const cloudOnlyFiles: Array<{ oldKey: string; newKey: string; entry: MetaEntry }> = []
                for (const [metaKey, metaEntry] of Object.entries(meta)) {
                  if (metaKey.startsWith(oldPrefix) && metaEntry && typeof metaEntry === 'object') {
                    const relPath = metaKey.slice(oldPrefix.length)
                    const localPath = path.join(absolutePath, relPath)
                    try {
                      await fs.access(localPath)
                      // File exists locally, will be handled by localFiles
                    } catch {
                      // Cloud-only file
                      cloudOnlyFiles.push({
                        oldKey: metaKey,
                        newKey: newPrefix + relPath,
                        entry: metaEntry as MetaEntry
                      })
                    }
                  }
                }
                
                // Process each local file
                for (const localFile of localFiles) {
                  // Check for cancellation
                  if (isCancelled()) {
                    await handleCancel()
                    return
                  }
                  const fileOldPath = path.join(absolutePath, localFile.relativePath)
                  const fileNewPath = path.join(newAbsolutePath, localFile.relativePath)
                  const fileOldKey = oldPrefix + localFile.relativePath
                  const fileNewKey = newPrefix + localFile.relativePath
                  const fileEntry = meta[fileOldKey] as MetaEntry | undefined
                  
                  // Track source folder
                  sourceFolders.add(path.dirname(fileOldPath))
                  
                  // Move the file
                  await fs.mkdir(path.dirname(fileNewPath), { recursive: true })
                  await fs.rename(fileOldPath, fileNewPath)
                  filesMoved++
                  
                  if (localFile.isImage && fileEntry) {
                    // Move thumbnails
                    const oldThumbPaths = getAllThumbnailPaths(fileOldKey)
                    const newThumbPaths = getAllThumbnailPaths(fileNewKey)
                    
                    for (let t = 0; t < oldThumbPaths.length; t++) {
                      const oldThumbPath = getPublicPath(oldThumbPaths[t])
                      const newThumbPath = getPublicPath(newThumbPaths[t])
                      try {
                        await fs.access(oldThumbPath)
                        sourceFolders.add(path.dirname(oldThumbPath))
                        await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
                        await fs.rename(oldThumbPath, newThumbPath)
                      } catch { /* skip */ }
                    }
                    
                    // Check if synced to cloud - move in CDN with new key
                    const fileIsInCloud = fileEntry.c !== undefined
                    const fileCdnUrl = fileIsInCloud ? cdnUrls[fileEntry.c!] : undefined
                    const fileIsInR2 = fileIsInCloud && fileCdnUrl === r2PublicUrl
                    const fileHasThumbs = isProcessed(fileEntry)
                    
                    if (fileIsInR2) {
                      // Server-side copy+delete in R2 (faster than re-upload)
                      await moveInCdn(fileOldKey, fileNewKey, fileHasThumbs)
                    }
                    
                    delete meta[fileOldKey]
                    meta[fileNewKey] = fileEntry
                    await saveMeta(meta)
                  }
                  
                  processedFiles++
                  sendEvent({
                    type: 'progress',
                    current: processedFiles,
                    total: totalFiles,
                    moved: filesMoved,
                    percent: Math.round((processedFiles / totalFiles) * 100),
                    currentFile: path.basename(localFile.relativePath),
                  })
                }
                
                // Process cloud-only files within the directory
                for (const cloudFile of cloudOnlyFiles) {
                  // Check for cancellation
                  if (isCancelled()) {
                    await handleCancel()
                    return
                  }
                  const cloudEntry = cloudFile.entry
                  const cloudIsInCloud = cloudEntry.c !== undefined
                  const cloudCdnUrl = cloudIsInCloud ? cdnUrls[cloudEntry.c!] : undefined
                  const cloudIsInR2 = cloudIsInCloud && cloudCdnUrl === r2PublicUrl
                  const cloudHasThumbs = isProcessed(cloudEntry)
                  
                  let cloudFileMoved = false
                  
                  if (cloudIsInR2) {
                    try {
                      // Server-side copy+delete in R2 (no download/upload needed)
                      await moveInCdn(cloudFile.oldKey, cloudFile.newKey, cloudHasThumbs)
                      cloudFileMoved = true
                      filesMoved++
                    } catch (err) {
                      console.error(`Failed to move cloud file ${cloudFile.oldKey}:`, err)
                      // File doesn't exist on CDN - remove from meta since it's orphaned
                      delete meta[cloudFile.oldKey]
                      await saveMeta(meta)
                    }
                  }
                  
                  // Only update meta if file was successfully moved
                  if (cloudFileMoved) {
                    delete meta[cloudFile.oldKey]
                    meta[cloudFile.newKey] = cloudEntry
                    await saveMeta(meta)
                  }
                  
                  processedFiles++
                  sendEvent({
                    type: 'progress',
                    current: processedFiles,
                    total: totalFiles,
                    moved: filesMoved,
                    percent: Math.round((processedFiles / totalFiles) * 100),
                    currentFile: path.basename(cloudFile.newKey),
                  })
                }
                
                // Clean up old empty source folder
                sourceFolders.add(absolutePath)
                
                // Clean up old thumbnail folder
                const oldThumbRelPath = oldKey.slice(1)
                const oldThumbFolder = path.join(getPublicPath('images'), oldThumbRelPath)
                sourceFolders.add(oldThumbFolder)
                
                moved.push(itemPath)
              }
            }
          } catch (err) {
            console.error(`Failed to move ${itemName}:`, err)
            errors.push(`Failed to move ${itemName}`)
            processedFiles++
            sendEvent({
              type: 'progress',
              current: processedFiles,
              total: totalFiles,
              moved: filesMoved,
              percent: Math.round((processedFiles / totalFiles) * 100),
              currentFile: itemName,
            })
          }
        }

        await saveMeta(meta)

        // Clean up empty source folders
        for (const folder of sourceFolders) {
          await deleteEmptyFolders(folder)
        }
        
        // Clean up destination folder if it was created but is now empty
        // (happens when moving virtual folders with server-side copy)
        await deleteEmptyFolders(absoluteDestination)

        sendEvent({
          type: 'complete',
          moved: filesMoved,
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
        if (isRemote) {
          // ===== REMOTE FILE: Download from external URL, save locally, remove c =====
          const remoteUrl = `${fileCdnUrl}${oldKey}`
          const buffer = await downloadFromRemoteUrl(remoteUrl)
          
          // Save to new local location
          await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true })
          await fs.writeFile(newAbsolutePath, buffer)
          
          // Update meta: remove c (now local), keep other properties
          const newEntry: MetaEntry = {
            o: entry?.o,
            b: entry?.b,
            // Don't copy thumbnail dims since remote files don't have local thumbnails
            // Don't copy c since it's now local
          }
          delete meta[oldKey]
          meta[newKey] = newEntry
          metaChanged = true
          moved.push(itemPath)

        } else if (isPushedToR2) {
          // ===== CLOUD FILE (R2): Server-side move =====
          await moveInCdn(oldKey, newKey, hasProcessedThumbnails)
          
          // Update meta with same entry, new key
          delete meta[oldKey]
          if (entry) {
            meta[newKey] = entry
          }
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
            
            // Also move the thumbnail folder
            const imagesDir = getPublicPath('images')
            const oldThumbFolder = path.join(imagesDir, oldRelativePath)
            const newThumbFolder = path.join(imagesDir, newRelativePath)
            try {
              await fs.access(oldThumbFolder)
              // Track old thumbnail folder for cleanup
              sourceFolders.add(oldThumbFolder)
              await fs.mkdir(path.dirname(newThumbFolder), { recursive: true })
              await fs.rename(oldThumbFolder, newThumbFolder)
            } catch {
              // Thumbnail folder might not exist
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
    
    // Clean up destination folder if it was created but is now empty
    // (happens when moving virtual folders with server-side copy)
    await deleteEmptyFolders(absoluteDestination)

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
