import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { encode } from 'blurhash'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import type { LeanMeta, LeanImageEntry, FileItem } from './types'
import { getThumbnailPath, getAllThumbnailPaths } from './types'

// Default thumbnail sizes with their suffixes
const DEFAULT_SIZES: Record<string, { width: number; suffix: string }> = {
  small: { width: 300, suffix: '-sm' },
  medium: { width: 700, suffix: '-md' },
  large: { width: 1400, suffix: '-lg' },
}

/**
 * Unified GET handler for all Studio API routes
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const pathname = request.nextUrl.pathname
  const route = pathname.replace(/^\/api\/studio\/?/, '')

  // Route: /api/studio/list-folders (must come before 'list' check)
  if (route === 'list-folders') {
    return handleListFolders()
  }

  // Route: /api/studio/list
  if (route === 'list' || route.startsWith('list')) {
    return handleList(request)
  }

  // Route: /api/studio/count-images
  if (route === 'count-images') {
    return handleCountImages()
  }

  // Route: /api/studio/folder-images
  if (route === 'folder-images') {
    return handleFolderImages(request)
  }

  // Route: /api/studio/search
  if (route === 'search') {
    return handleSearch(request)
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Unified POST handler for all Studio API routes
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const pathname = request.nextUrl.pathname
  const route = pathname.replace(/^\/api\/studio\/?/, '')

  // Route: /api/studio/upload
  if (route === 'upload') {
    return handleUpload(request)
  }

  // Route: /api/studio/delete
  if (route === 'delete') {
    return handleDelete(request)
  }

  // Route: /api/studio/sync
  if (route === 'sync') {
    return handleSync(request)
  }

  // Route: /api/studio/reprocess
  if (route === 'reprocess') {
    return handleReprocess(request)
  }

  // Route: /api/studio/process-all (streaming)
  if (route === 'process-all') {
    return handleProcessAllStream()
  }

  // Route: /api/studio/create-folder
  if (route === 'create-folder') {
    return handleCreateFolder(request)
  }

  // Route: /api/studio/rename
  if (route === 'rename') {
    return handleRename(request)
  }

  // Route: /api/studio/move
  if (route === 'move') {
    return handleMove(request)
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Unified DELETE handler
 */
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return handleDelete(request)
}

// ============================================================================
// Handler implementations
// ============================================================================

async function handleList(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const requestedPath = searchParams.get('path') || 'public'

  try {
    const safePath = requestedPath.replace(/\.\./g, '')
    const absolutePath = path.join(process.cwd(), safePath)

    if (!absolutePath.startsWith(process.cwd())) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const items: FileItem[] = []
    const entries = await fs.readdir(absolutePath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue

      const itemPath = path.join(safePath, entry.name)

      if (entry.isDirectory()) {
        // Calculate folder stats
        const folderStats = await getFolderStats(path.join(absolutePath, entry.name))
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'folder',
          fileCount: folderStats.fileCount,
          totalSize: folderStats.totalSize,
        })
      } else if (isMediaFile(entry.name)) {
        const filePath = path.join(absolutePath, entry.name)
        const stats = await fs.stat(filePath)
        const isImage = isImageFile(entry.name)
        
        let thumbnail: string | undefined
        let hasThumbnail = false
        let dimensions: { width: number; height: number } | undefined
        
        if (isImage) {
          const relativePath = safePath.replace(/^public\/?/, '')
          
          // If we're already inside the images folder, these ARE the thumbnails
          if (relativePath === 'images' || relativePath.startsWith('images/')) {
            thumbnail = itemPath.replace('public', '')
            hasThumbnail = true // They are thumbnails themselves
          } else {
            // Check for -sm thumbnail in images folder
            const ext = path.extname(entry.name).toLowerCase()
            const baseName = path.basename(entry.name, ext)
            const thumbnailDir = relativePath ? `images/${relativePath}` : 'images'
            const thumbnailName = `${baseName}-sm${ext === '.png' ? '.png' : '.jpg'}`
            const thumbnailPath = path.join(process.cwd(), 'public', thumbnailDir, thumbnailName)
            
            try {
              await fs.access(thumbnailPath)
              // Thumbnail exists
              thumbnail = `/${thumbnailDir}/${thumbnailName}`
              hasThumbnail = true
            } catch {
              // No thumbnail, fall back to original
              thumbnail = itemPath.replace('public', '')
              hasThumbnail = false
            }
          }
          
          // Get dimensions
          if (!entry.name.toLowerCase().endsWith('.svg')) {
            try {
              const metadata = await sharp(filePath).metadata()
              if (metadata.width && metadata.height) {
                dimensions = { width: metadata.width, height: metadata.height }
              }
            } catch {
              // Ignore dimension errors
            }
          }
        }
        
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'file',
          size: stats.size,
          thumbnail,
          hasThumbnail,
          dimensions,
        })
      }
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to list directory:', error)
    return NextResponse.json({ error: 'Failed to list directory' }, { status: 500 })
  }
}

async function handleSearch(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')?.toLowerCase() || ''
  
  if (query.length < 2) {
    return NextResponse.json({ items: [] })
  }

  try {
    const items: FileItem[] = []
    const publicDir = path.join(process.cwd(), 'public')

    async function searchDir(dir: string, relativePath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue

          const fullPath = path.join(dir, entry.name)
          const itemPath = relativePath ? `public/${relativePath}/${entry.name}` : `public/${entry.name}`
          const itemRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isDirectory()) {
            await searchDir(fullPath, itemRelPath)
          } else if (isImageFile(entry.name)) {
            // Check if path matches query
            if (itemPath.toLowerCase().includes(query)) {
              const stats = await fs.stat(fullPath)
              
              let thumbnail: string | undefined
              let hasThumbnail = false
              let dimensions: { width: number; height: number } | undefined

              // Check for -sm thumbnail
              const ext = path.extname(entry.name).toLowerCase()
              const baseName = path.basename(entry.name, ext)
              const thumbnailDir = relativePath ? `images/${relativePath}` : 'images'
              const thumbnailName = `${baseName}-sm${ext === '.png' ? '.png' : '.jpg'}`
              const thumbnailPath = path.join(process.cwd(), 'public', thumbnailDir, thumbnailName)

              try {
                await fs.access(thumbnailPath)
                thumbnail = `/${thumbnailDir}/${thumbnailName}`
                hasThumbnail = true
              } catch {
                thumbnail = `/${itemRelPath}`
                hasThumbnail = false
              }

              // Get dimensions
              if (!entry.name.toLowerCase().endsWith('.svg')) {
                try {
                  const metadata = await sharp(fullPath).metadata()
                  if (metadata.width && metadata.height) {
                    dimensions = { width: metadata.width, height: metadata.height }
                  }
                } catch {
                  // Ignore dimension errors
                }
              }

              items.push({
                name: entry.name,
                path: itemPath,
                type: 'file',
                size: stats.size,
                thumbnail,
                hasThumbnail,
                dimensions,
              })
            }
          }
        }
      } catch {
        // Ignore directory access errors
      }
    }

    await searchDir(publicDir, '')

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to search:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}

async function getFolderStats(folderPath: string): Promise<{ fileCount: number; totalSize: number }> {
  let fileCount = 0
  let totalSize = 0

  async function scanFolder(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await scanFolder(fullPath)
        } else if (isMediaFile(entry.name)) {
          fileCount++
          const stats = await fs.stat(fullPath)
          totalSize += stats.size
        }
      }
    } catch { /* ignore errors */ }
  }

  await scanFolder(folderPath)
  return { fileCount, totalSize }
}

async function handleUpload(request: NextRequest) {
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
    const baseName = path.basename(fileName, path.extname(fileName))
    const ext = path.extname(fileName).toLowerCase()

    // Check if this is an image that can be processed
    const isImage = isImageFile(fileName)
    const isSvg = ext === '.svg'
    const isProcessableImage = isImage && !isSvg

    const meta = await loadMeta()

    // Calculate relative path from public/
    // e.g., "public/photos" -> "photos", "public" -> ""
    let relativeDir = ''
    if (targetPath === 'public') {
      relativeDir = ''
    } else if (targetPath.startsWith('public/')) {
      relativeDir = targetPath.replace('public/', '')
    }
    
    // Block uploads to public/images/ - that's for generated thumbnails only
    if (relativeDir === 'images' || relativeDir.startsWith('images/')) {
      return NextResponse.json(
        { error: 'Cannot upload to images/ folder. Upload to public/ instead - thumbnails are generated automatically.' },
        { status: 400 }
      )
    }

    // Save file to current location
    const uploadDir = path.join(process.cwd(), 'public', relativeDir)
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(path.join(uploadDir, fileName), buffer)

    // For non-image media files, just save and return success
    if (!isImage) {
      return NextResponse.json({ 
        success: true, 
        message: 'File uploaded successfully (non-image, no thumbnails generated)',
        path: `public/${relativeDir ? relativeDir + '/' : ''}${fileName}`
      })
    }
    
    // For images, generate thumbnails and update meta
    // Meta key has leading slash
    const imageKey = '/' + (relativeDir ? `${relativeDir}/${fileName}` : fileName)

    if (meta[imageKey]) {
      return NextResponse.json(
        { error: `File '${imageKey}' already exists in meta` },
        { status: 409 }
      )
    }

    // Generate thumbnails in public/images/ with matching subpath
    const imagesPath = path.join(process.cwd(), 'public', 'images', relativeDir)
    await fs.mkdir(imagesPath, { recursive: true })

    let originalWidth = 0
    let originalHeight = 0
    let blurhash = ''

    // Original path is relative to public/ (this is the meta key)
    const originalPath = `/${relativeDir ? relativeDir + '/' : ''}${fileName}`

    if (isSvg) {
      // SVG: copy to images folder, no thumbnail processing
      const fullPath = path.join(imagesPath, fileName)
      await fs.writeFile(fullPath, buffer)
    } else if (isProcessableImage) {
      // Raster images: process with sharp and generate thumbnails
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()
      originalWidth = metadata.width || 0
      originalHeight = metadata.height || 0

      // Full size
      const outputExt = ext === '.png' ? '.png' : '.jpg'
      const fullFileName = `${baseName}${outputExt}`
      const fullPath = path.join(imagesPath, fullFileName)
      
      if (ext === '.png') {
        await sharp(buffer).png({ quality: 85 }).toFile(fullPath)
      } else {
        await sharp(buffer).jpeg({ quality: 85 }).toFile(fullPath)
      }

      // Generate each thumbnail size
      for (const [, sizeConfig] of Object.entries(DEFAULT_SIZES)) {
        const { width: maxWidth, suffix } = sizeConfig
        if (originalWidth <= maxWidth) {
          continue
        }

        const ratio = originalHeight / originalWidth
        const newHeight = Math.round(maxWidth * ratio)
        const sizeFileName = `${baseName}${suffix}${outputExt}`
        const sizePath = path.join(imagesPath, sizeFileName)

        if (ext === '.png') {
          await sharp(buffer).resize(maxWidth, newHeight).png({ quality: 80 }).toFile(sizePath)
        } else {
          await sharp(buffer).resize(maxWidth, newHeight).jpeg({ quality: 80 }).toFile(sizePath)
        }
      }

      // Blurhash
      const { data, info } = await sharp(buffer)
        .resize(32, 32, { fit: 'inside' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)
    }

    const entry: LeanImageEntry = {
      w: originalWidth,
      h: originalHeight,
      blur: blurhash,
    }

    meta[originalPath] = entry
    await saveMeta(meta)

    return NextResponse.json({ success: true, imageKey: originalPath, entry })
  } catch (error) {
    console.error('Failed to upload:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to upload file: ${message}` }, { status: 500 })
  }
}

async function handleDelete(request: NextRequest) {
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
        const stats = await fs.stat(absolutePath)

        if (stats.isDirectory()) {
          await fs.rm(absolutePath, { recursive: true })
          
          // Remove prefix to get image key pattern
          const prefix = '/' + itemPath
            .replace(/^public\/images\/?/, '')
            .replace(/^public\/?/, '')
          
          for (const key of Object.keys(meta)) {
            if (key.startsWith(prefix)) {
              delete meta[key]
            }
          }
        } else {
          await fs.unlink(absolutePath)

          // Check if this is an original (in public/, not in public/images/)
          const isInImagesFolder = itemPath.startsWith('public/images/')
          
          if (!isInImagesFolder) {
            // Deleting an original from public/ - also delete its thumbnails
            const imageKey = '/' + itemPath.replace(/^public\//, '')
            if (meta[imageKey]) {
              // Delete all generated thumbnails using derived paths
              for (const thumbPath of getAllThumbnailPaths(imageKey)) {
                const absoluteThumbPath = path.join(process.cwd(), 'public', thumbPath)
                try { await fs.unlink(absoluteThumbPath) } catch { /* ignore */ }
              }
              delete meta[imageKey]
            }
          }
          // If deleting from images/, just delete the file (already done above)
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

async function handleSync(request: NextRequest) {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return NextResponse.json(
      { error: 'R2 not configured. Set CLOUDFLARE_R2_* environment variables.' },
      { status: 400 }
    )
  }

  try {
    const { imageKeys } = await request.json() as { imageKeys: string[] }

    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return NextResponse.json({ error: 'No image keys provided' }, { status: 400 })
    }

    const meta = await loadMeta()

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })

    const synced: string[] = []
    const errors: string[] = []

    for (const imageKey of imageKeys) {
      const entry = meta[imageKey]
      if (!entry) {
        errors.push(`Image not found in meta: ${imageKey}`)
        continue
      }

      if (entry.s) {
        synced.push(imageKey)
        continue
      }

      try {
        // Upload all thumbnail sizes derived from imageKey
        for (const thumbPath of getAllThumbnailPaths(imageKey)) {
          const localPath = path.join(process.cwd(), 'public', thumbPath)
          try {
            const fileBuffer = await fs.readFile(localPath)
            await r2.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: thumbPath.replace(/^\//, ''),
                Body: fileBuffer,
                ContentType: getContentType(thumbPath),
              })
            )
          } catch {
            // File might not exist (e.g., if image is smaller than thumbnail size)
          }
        }

        // Mark as synced
        entry.s = 1

        // Delete local thumbnail files
        for (const thumbPath of getAllThumbnailPaths(imageKey)) {
          const localPath = path.join(process.cwd(), 'public', thumbPath)
          try { await fs.unlink(localPath) } catch { /* ignore */ }
        }

        synced.push(imageKey)
      } catch (error) {
        console.error(`Failed to sync ${imageKey}:`, error)
        errors.push(imageKey)
      }
    }

    await saveMeta(meta)

    return NextResponse.json({
      success: true,
      synced,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to sync:', error)
    return NextResponse.json({ error: 'Failed to sync to CDN' }, { status: 500 })
  }
}

async function handleReprocess(request: NextRequest) {
  try {
    const { imageKeys } = await request.json() as { imageKeys: string[] }

    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return NextResponse.json({ error: 'No image keys provided' }, { status: 400 })
    }

    const meta = await loadMeta()
    const processed: string[] = []
    const errors: string[] = []

    for (const imageKey of imageKeys) {
      try {
        let buffer: Buffer
        const entry = meta[imageKey]
        
        // Try to read the original file from public folder
        const originalPath = path.join(process.cwd(), 'public', imageKey)
        
        try {
          buffer = await fs.readFile(originalPath)
        } catch {
          // File not in public folder, try from CDN if synced
          if (entry?.s) {
            buffer = await downloadFromCdn(imageKey)
          } else {
            throw new Error(`File not found: ${imageKey}`)
          }
        }

        // Process the image and update meta
        const updatedEntry = await processImage(buffer, imageKey)
        
        // Preserve sync status if already synced
        if (entry?.s) {
          updatedEntry.s = 1
          await uploadToCdn(imageKey)
          await deleteLocalThumbnails(imageKey)
        }
        
        meta[imageKey] = updatedEntry
        processed.push(imageKey)
      } catch (error) {
        console.error(`Failed to reprocess ${imageKey}:`, error)
        errors.push(imageKey)
      }
    }

    await saveMeta(meta)

    return NextResponse.json({
      success: true,
      processed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to reprocess:', error)
    return NextResponse.json({ error: 'Failed to reprocess images' }, { status: 500 })
  }
}

async function handleCountImages() {
  try {
    const allImages: string[] = []

    // Scan public folder recursively for ALL images, excluding public/images/
    async function scanPublicFolder(dir: string, relativePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          
          const fullPath = path.join(dir, entry.name)
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          // Skip the images folder - that's for generated thumbnails
          if (relPath === 'images' || relPath.startsWith('images/')) continue

          if (entry.isDirectory()) {
            await scanPublicFolder(fullPath, relPath)
          } else if (isImageFile(entry.name)) {
            allImages.push(relPath)
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    const publicDir = path.join(process.cwd(), 'public')
    await scanPublicFolder(publicDir)

    return NextResponse.json({
      count: allImages.length,
      images: allImages,
    })
  } catch (error) {
    console.error('Failed to count images:', error)
    return NextResponse.json({ error: 'Failed to count images' }, { status: 500 })
  }
}

async function handleFolderImages(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const foldersParam = searchParams.get('folders')
    
    if (!foldersParam) {
      return NextResponse.json({ error: 'No folders provided' }, { status: 400 })
    }

    const folders = foldersParam.split(',')
    const allImages: string[] = []

    async function scanFolder(dir: string, relativePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          
          const fullPath = path.join(dir, entry.name)
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isDirectory()) {
            await scanFolder(fullPath, relPath)
          } else if (isImageFile(entry.name)) {
            allImages.push(relPath)
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    for (const folder of folders) {
      // Folder paths come as "public/photos" - we need relative path from public
      const relativePath = folder.replace(/^public\/?/, '')
      
      // Skip the images folder
      if (relativePath === 'images' || relativePath.startsWith('images/')) continue
      
      const folderPath = path.join(process.cwd(), folder)
      await scanFolder(folderPath, relativePath)
    }

    return NextResponse.json({
      count: allImages.length,
      images: allImages,
    })
  } catch (error) {
    console.error('Failed to get folder images:', error)
    return NextResponse.json({ error: 'Failed to get folder images' }, { status: 500 })
  }
}

async function handleProcessAllStream() {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const meta = await loadMeta()
        const processed: string[] = []
        const errors: string[] = []
        const orphansRemoved: string[] = []

        // Step 1: Scan public folder for ALL images (excluding public/images/)
        const allImages: Array<{ key: string; fullPath: string }> = []

        async function scanPublicFolder(dir: string, relativePath: string = ''): Promise<void> {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            
            for (const entry of entries) {
              if (entry.name.startsWith('.')) continue
              
              const fullPath = path.join(dir, entry.name)
              const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

              // Skip the images folder
              if (relPath === 'images' || relPath.startsWith('images/')) continue

              if (entry.isDirectory()) {
                await scanPublicFolder(fullPath, relPath)
              } else if (isImageFile(entry.name)) {
                allImages.push({ key: relPath, fullPath })
              }
            }
          } catch {
            // Directory might not exist
          }
        }

        const publicDir = path.join(process.cwd(), 'public')
        await scanPublicFolder(publicDir)

        const total = allImages.length
        sendEvent({ type: 'start', total })

        // Step 2: Process each image (reprocess all, not just unprocessed)
        for (let i = 0; i < allImages.length; i++) {
          const { key, fullPath } = allImages[i]
          const imageKey = '/' + key
          
          sendEvent({ 
            type: 'progress', 
            current: i + 1, 
            total, 
            percent: Math.round(((i + 1) / total) * 100),
            currentFile: key 
          })

          try {
            const buffer = await fs.readFile(fullPath)
            const ext = path.extname(key).toLowerCase()
            const isSvg = ext === '.svg'

            if (isSvg) {
              // SVG: copy to images folder, no thumbnail processing
              const imageDir = path.dirname(key)
              const imagesPath = path.join(process.cwd(), 'public', 'images', imageDir === '.' ? '' : imageDir)
              await fs.mkdir(imagesPath, { recursive: true })
              
              const fileName = path.basename(key)
              const destPath = path.join(imagesPath, fileName)
              await fs.writeFile(destPath, buffer)

              meta[imageKey] = {
                w: 0,
                h: 0,
                blur: '',
              }
            } else {
              // Raster image: full processing
              const existingEntry = meta[imageKey]
              const processedEntry = await processImage(buffer, imageKey)
              
              // Preserve sync status if already synced
              if (existingEntry?.s) {
                processedEntry.s = 1
              }
              
              meta[imageKey] = processedEntry
            }

            processed.push(key)
          } catch (error) {
            console.error(`Failed to process ${key}:`, error)
            errors.push(key)
          }
        }

        // Step 3: Remove orphaned thumbnails
        sendEvent({ type: 'cleanup', message: 'Removing orphaned thumbnails...' })
        
        // Build set of tracked thumbnail paths from meta keys
        const trackedPaths = new Set<string>()
        for (const imageKey of Object.keys(meta)) {
          for (const thumbPath of getAllThumbnailPaths(imageKey)) {
            trackedPaths.add(thumbPath)
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
                if (!trackedPaths.has(publicPath)) {
                  try {
                    await fs.unlink(fullPath)
                    orphansRemoved.push(publicPath)
                  } catch (err) {
                    console.error(`Failed to remove orphan ${publicPath}:`, err)
                  }
                }
              }
            }
          } catch {
            // Directory might not exist
          }
        }

        const imagesDir = path.join(process.cwd(), 'public', 'images')
        await findOrphans(imagesDir)

        // Step 4: Clean up empty directories
        async function removeEmptyDirs(dir: string): Promise<boolean> {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            let isEmpty = true

            for (const entry of entries) {
              if (entry.isDirectory()) {
                const subDirEmpty = await removeEmptyDirs(path.join(dir, entry.name))
                if (!subDirEmpty) isEmpty = false
              } else {
                isEmpty = false
              }
            }

            if (isEmpty && dir !== imagesDir) {
              await fs.rmdir(dir)
            }

            return isEmpty
          } catch {
            return true
          }
        }

        await removeEmptyDirs(imagesDir)
        await saveMeta(meta)

        sendEvent({ 
          type: 'complete', 
          processed: processed.length, 
          orphansRemoved: orphansRemoved.length,
          errors: errors.length,
        })
      } catch (error) {
        console.error('Failed to process all:', error)
        sendEvent({ type: 'error', message: 'Failed to process images' })
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

// ============================================================================
// Helper functions
// ============================================================================

async function loadMeta(): Promise<LeanMeta> {
  const metaPath = path.join(process.cwd(), '_data', '_meta.json')
  
  try {
    const content = await fs.readFile(metaPath, 'utf-8')
    return JSON.parse(content) as LeanMeta
  } catch {
    return {}
  }
}

async function saveMeta(meta: LeanMeta): Promise<void> {
  const dataDir = path.join(process.cwd(), '_data')
  await fs.mkdir(dataDir, { recursive: true })
  const metaPath = path.join(dataDir, '_meta.json')
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))
}

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.tif'].includes(ext)
}

function isMediaFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  // Images
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.tif'].includes(ext)) return true
  // Videos
  if (['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'].includes(ext)) return true
  // Audio
  if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'].includes(ext)) return true
  // Documents/PDFs
  if (['.pdf'].includes(ext)) return true
  return false
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

async function processImage(
  buffer: Buffer,
  imageKey: string
): Promise<LeanImageEntry> {
  const sharpInstance = sharp(buffer)
  const metadata = await sharpInstance.metadata()
  const originalWidth = metadata.width || 0
  const originalHeight = metadata.height || 0

  // Remove leading slash for path operations
  const keyWithoutSlash = imageKey.startsWith('/') ? imageKey.slice(1) : imageKey
  const baseName = path.basename(keyWithoutSlash, path.extname(keyWithoutSlash))
  const ext = path.extname(keyWithoutSlash).toLowerCase()
  const imageDir = path.dirname(keyWithoutSlash)

  const imagesPath = path.join(process.cwd(), 'public', 'images', imageDir === '.' ? '' : imageDir)
  await fs.mkdir(imagesPath, { recursive: true })

  const isPng = ext === '.png'
  const outputExt = isPng ? '.png' : '.jpg'
  
  // Generate full size
  const fullFileName = imageDir === '.' ? `${baseName}${outputExt}` : `${imageDir}/${baseName}${outputExt}`
  const fullPath = path.join(process.cwd(), 'public', 'images', fullFileName)
  
  if (isPng) {
    await sharp(buffer).png({ quality: 85 }).toFile(fullPath)
  } else {
    await sharp(buffer).jpeg({ quality: 85 }).toFile(fullPath)
  }

  // Generate thumbnail sizes
  for (const [, sizeConfig] of Object.entries(DEFAULT_SIZES)) {
    const { width: maxWidth, suffix } = sizeConfig
    if (originalWidth <= maxWidth) {
      continue // Skip if original is smaller than this size
    }

    const ratio = originalHeight / originalWidth
    const newHeight = Math.round(maxWidth * ratio)
    const sizeFileName = `${baseName}${suffix}${outputExt}`
    const sizeFilePath = imageDir === '.' ? sizeFileName : `${imageDir}/${sizeFileName}`
    const sizePath = path.join(process.cwd(), 'public', 'images', sizeFilePath)

    if (isPng) {
      await sharp(buffer).resize(maxWidth, newHeight).png({ quality: 80 }).toFile(sizePath)
    } else {
      await sharp(buffer).resize(maxWidth, newHeight).jpeg({ quality: 80 }).toFile(sizePath)
    }
  }

  // Generate blurhash
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)

  return {
    w: originalWidth,
    h: originalHeight,
    blur: blurhash,
  }
}

async function downloadFromCdn(originalPath: string): Promise<Buffer> {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 not configured')
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  const response = await r2.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: originalPath.replace(/^\//, ''),
    })
  )

  const stream = response.Body as NodeJS.ReadableStream
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function uploadToCdn(imageKey: string): Promise<void> {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 not configured')
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  // Upload all thumbnail sizes derived from imageKey
  for (const thumbPath of getAllThumbnailPaths(imageKey)) {
    const localPath = path.join(process.cwd(), 'public', thumbPath)
    try {
      const fileBuffer = await fs.readFile(localPath)
      await r2.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: thumbPath.replace(/^\//, ''),
          Body: fileBuffer,
          ContentType: getContentType(thumbPath),
        })
      )
    } catch {
      // File might not exist (e.g., if image is smaller than thumbnail size)
    }
  }
}

async function deleteLocalThumbnails(imageKey: string): Promise<void> {
  for (const thumbPath of getAllThumbnailPaths(imageKey)) {
    const localPath = path.join(process.cwd(), 'public', thumbPath)
    try {
      await fs.unlink(localPath)
    } catch {
      // File might not exist
    }
  }
}

// ============================================================================
// FOLDER MANAGEMENT HANDLERS
// ============================================================================

async function handleCreateFolder(request: NextRequest) {
  try {
    const { parentPath, name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    // Sanitize folder name
    const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '').trim()
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 })
    }

    const safePath = (parentPath || 'public').replace(/\.\./g, '')
    const folderPath = path.join(process.cwd(), safePath, sanitizedName)

    // Check if we're within public folder
    if (!folderPath.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Check if folder already exists
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

async function handleRename(request: NextRequest) {
  try {
    const { oldPath, newName } = await request.json()

    if (!oldPath || !newName) {
      return NextResponse.json({ error: 'Path and new name are required' }, { status: 400 })
    }

    // Sanitize new name
    const sanitizedName = newName.replace(/[<>:"/\\|?*]/g, '').trim()
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    const safePath = oldPath.replace(/\.\./g, '')
    const absoluteOldPath = path.join(process.cwd(), safePath)
    const parentDir = path.dirname(absoluteOldPath)
    const absoluteNewPath = path.join(parentDir, sanitizedName)

    // Check path is within public folder
    if (!absoluteOldPath.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Check if old path exists
    try {
      await fs.access(absoluteOldPath)
    } catch {
      return NextResponse.json({ error: 'File or folder not found' }, { status: 404 })
    }

    // Check if new path already exists
    try {
      await fs.access(absoluteNewPath)
      return NextResponse.json({ error: 'An item with this name already exists' }, { status: 400 })
    } catch {
      // Good - new path doesn't exist
    }

    // Check if it's a file (for meta updates)
    const stats = await fs.stat(absoluteOldPath)
    const isFile = stats.isFile()
    const isImage = isFile && isImageFile(path.basename(oldPath))

    // Rename the file/folder
    await fs.rename(absoluteOldPath, absoluteNewPath)

    // Update meta if it's an image
    if (isImage) {
      const meta = await loadMeta()
      const oldRelativePath = safePath.replace(/^public\//, '')
      const newRelativePath = path.join(path.dirname(oldRelativePath), sanitizedName)
      const oldKey = '/' + oldRelativePath
      const newKey = '/' + newRelativePath

      // Find and update meta entry
      if (meta[oldKey]) {
        const entry = meta[oldKey]

        // Rename thumbnails in public/images
        const oldThumbPaths = getAllThumbnailPaths(oldKey)
        const newThumbPaths = getAllThumbnailPaths(newKey)

        for (let i = 0; i < oldThumbPaths.length; i++) {
          const oldThumbPath = path.join(process.cwd(), 'public', oldThumbPaths[i])
          const newThumbPath = path.join(process.cwd(), 'public', newThumbPaths[i])
          
          // Ensure destination directory exists
          await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
          
          try {
            await fs.rename(oldThumbPath, newThumbPath)
          } catch {
            // Thumbnail might not exist
          }
        }

        // Update the key in meta
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

async function handleMove(request: NextRequest) {
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

    // Check destination is within public folder
    if (!absoluteDestination.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid destination' }, { status: 400 })
    }

    // Check destination exists and is a directory
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

      // Cannot move a folder into itself
      if (absoluteDestination.startsWith(absolutePath + path.sep)) {
        errors.push(`Cannot move ${itemName} into itself`)
        continue
      }

      // Check source exists
      try {
        await fs.access(absolutePath)
      } catch {
        errors.push(`${itemName} not found`)
        continue
      }

      // Check if destination already has item with same name
      try {
        await fs.access(newAbsolutePath)
        errors.push(`${itemName} already exists in destination`)
        continue
      } catch {
        // Good - doesn't exist
      }

      try {
        await fs.rename(absolutePath, newAbsolutePath)

        // Update meta for images
        const stats = await fs.stat(newAbsolutePath)
        if (stats.isFile() && isImageFile(itemName)) {
          const oldRelativePath = safePath.replace(/^public\//, '')
          const newRelativePath = path.join(safeDestination.replace(/^public\//, ''), itemName)
          const oldKey = '/' + oldRelativePath
          const newKey = '/' + newRelativePath

          if (meta[oldKey]) {
            const entry = meta[oldKey]

            // Move thumbnails too using derived paths
            const oldThumbPaths = getAllThumbnailPaths(oldKey)
            const newThumbPaths = getAllThumbnailPaths(newKey)

            for (let i = 0; i < oldThumbPaths.length; i++) {
              const oldThumbPath = path.join(process.cwd(), 'public', oldThumbPaths[i])
              const newThumbPath = path.join(process.cwd(), 'public', newThumbPaths[i])
              
              // Ensure destination directory exists
              await fs.mkdir(path.dirname(newThumbPath), { recursive: true })

              try {
                await fs.rename(oldThumbPath, newThumbPath)
              } catch {
                // Thumbnail might not exist
              }
            }

            // Update key in meta
            delete meta[oldKey]
            meta[newKey] = entry
            metaChanged = true
          }
        }

        moved.push(itemPath)
      } catch (error) {
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

async function handleListFolders() {
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const folders: { path: string; name: string; depth: number }[] = []

    async function scanDir(dir: string, relativePath: string, depth: number): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (!entry.isDirectory()) continue
          if (entry.name.startsWith('.')) continue

          const folderRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name
          folders.push({
            path: `public/${folderRelativePath}`,
            name: entry.name,
            depth
          })

          // Recursively scan subdirectories
          await scanDir(path.join(dir, entry.name), folderRelativePath, depth + 1)
        }
      } catch {
        // Ignore errors
      }
    }

    // Add root public folder
    folders.push({ path: 'public', name: 'public', depth: 0 })

    await scanDir(publicDir, '', 1)

    return NextResponse.json({ folders })
  } catch (error) {
    console.error('Failed to list folders:', error)
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 })
  }
}
