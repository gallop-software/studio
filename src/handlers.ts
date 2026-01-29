import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { encode } from 'blurhash'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import type { StudioMeta, ImageEntry, ImageSize, FileItem } from './types'

// Default thumbnail sizes
const DEFAULT_SIZES = {
  small: 300,
  medium: 700,
  large: 1400,
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

  // Route: /api/studio/list
  if (route === 'list' || route.startsWith('list')) {
    return handleList(request)
  }

  // Route: /api/studio/scan
  if (route === 'scan') {
    return handleScan()
  }

  // Route: /api/studio/count-unprocessed
  if (route === 'count-unprocessed') {
    return handleCountUnprocessed()
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

  // Route: /api/studio/process-all
  if (route === 'process-all') {
    return handleProcessAll()
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
        const stats = await fs.stat(path.join(absolutePath, entry.name))
        // For images, provide thumbnail path (the file itself serves as thumbnail)
        const thumbnail = isImageFile(entry.name) ? itemPath.replace('public', '') : undefined
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'file',
          size: stats.size,
          thumbnail,
        })
      }
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to list directory:', error)
    return NextResponse.json({ error: 'Failed to list directory' }, { status: 500 })
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

async function handleScan() {
  try {
    const meta = await loadMeta()

    const untrackedFiles: string[] = []
    const missingFiles: string[] = []
    const validFiles: string[] = []

    const imagesDir = path.join(process.cwd(), 'public', 'images')
    const trackedPaths = new Set<string>()

    for (const entry of Object.values(meta.images)) {
      for (const sizeData of Object.values(entry.sizes)) {
        trackedPaths.add(sizeData.path)
      }
    }

    async function scanDir(dir: string, relativePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue

          const fullPath = path.join(dir, entry.name)
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isDirectory()) {
            await scanDir(fullPath, relPath)
          } else if (isImageFile(entry.name)) {
            const publicPath = `/images/${relPath}`
            if (!trackedPaths.has(publicPath)) {
              untrackedFiles.push(publicPath)
            } else {
              validFiles.push(publicPath)
            }
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    await scanDir(imagesDir)

    for (const [key, entry] of Object.entries(meta.images)) {
      for (const [size, sizeData] of Object.entries(entry.sizes)) {
        const filePath = path.join(process.cwd(), 'public', sizeData.path)
        try {
          await fs.access(filePath)
        } catch {
          if (!entry.cdn?.synced) {
            missingFiles.push(`${key} (${size}): ${sizeData.path}`)
          }
        }
      }
    }

    return NextResponse.json({
      totalInMeta: Object.keys(meta.images).length,
      validFiles: validFiles.length,
      untrackedFiles,
      missingFiles,
    })
  } catch (error) {
    console.error('Failed to scan:', error)
    return NextResponse.json({ error: 'Failed to scan' }, { status: 500 })
  }
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
    
    // Ensure images object exists
    if (!meta.images) {
      meta.images = {}
    }

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
    const fullImageKey = relativeDir ? `${relativeDir}/${fileName}` : fileName

    if (meta.images[fullImageKey]) {
      return NextResponse.json(
        { error: `File '${fullImageKey}' already exists in meta` },
        { status: 409 }
      )
    }

    // Generate thumbnails in public/images/ with matching subpath
    const imagesPath = path.join(process.cwd(), 'public', 'images', relativeDir)
    await fs.mkdir(imagesPath, { recursive: true })

    let originalWidth = 0
    let originalHeight = 0
    let blurhash = ''
    let dominantColor = '#888888'
    const sizes: Record<ImageSize, { path: string; width: number; height: number }> = {
      full: { path: '', width: 0, height: 0 },
      large: { path: '', width: 0, height: 0 },
      medium: { path: '', width: 0, height: 0 },
      small: { path: '', width: 0, height: 0 },
    }

    // Original path is relative to public/
    const originalPath = `/${relativeDir ? relativeDir + '/' : ''}${fileName}`

    if (isSvg) {
      // SVG: copy to images folder, no thumbnail processing
      const fullPath = path.join(imagesPath, fileName)
      await fs.writeFile(fullPath, buffer)
      sizes.full = { path: `/images/${relativeDir ? relativeDir + '/' : ''}${fileName}`, width: 0, height: 0 }
      sizes.large = { ...sizes.full }
      sizes.medium = { ...sizes.full }
      sizes.small = { ...sizes.full }
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
      sizes.full = { path: `/images/${relativeDir ? relativeDir + '/' : ''}${fullFileName}`, width: originalWidth, height: originalHeight }

      // Generate each thumbnail size
      for (const [sizeName, maxWidth] of Object.entries(DEFAULT_SIZES) as [ImageSize, number][]) {
        if (originalWidth <= maxWidth) {
          sizes[sizeName] = { ...sizes.full }
          continue
        }

        const ratio = originalHeight / originalWidth
        const newHeight = Math.round(maxWidth * ratio)
        const sizeFileName = `${baseName}-${maxWidth}${outputExt}`
        const sizePath = path.join(imagesPath, sizeFileName)

        if (ext === '.png') {
          await sharp(buffer).resize(maxWidth, newHeight).png({ quality: 80 }).toFile(sizePath)
        } else {
          await sharp(buffer).resize(maxWidth, newHeight).jpeg({ quality: 80 }).toFile(sizePath)
        }

        sizes[sizeName] = {
          path: `/images/${relativeDir ? relativeDir + '/' : ''}${sizeFileName}`,
          width: maxWidth,
          height: newHeight,
        }
      }

      // Blurhash
      const { data, info } = await sharp(buffer)
        .resize(32, 32, { fit: 'inside' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)

      // Dominant color
      const { dominant } = await sharp(buffer).stats()
      dominantColor = `#${dominant.r.toString(16).padStart(2, '0')}${dominant.g.toString(16).padStart(2, '0')}${dominant.b.toString(16).padStart(2, '0')}`
    }

    const entry: ImageEntry = {
      original: {
        path: originalPath,
        width: originalWidth,
        height: originalHeight,
        fileSize: buffer.length,
      },
      sizes,
      blurhash,
      dominantColor,
      cdn: null,
    }

    meta.images[fullImageKey] = entry
    await saveMeta(meta)

    return NextResponse.json({ success: true, imageKey: fullImageKey, entry })
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
          const prefix = itemPath
            .replace(/^public\/images\/?/, '')
            .replace(/^public\/?/, '')
          
          for (const key of Object.keys(meta.images)) {
            if (key.startsWith(prefix)) {
              delete meta.images[key]
            }
          }
        } else {
          await fs.unlink(absolutePath)

          // Check if this is an original (in public/, not in public/images/)
          const isInImagesFolder = itemPath.startsWith('public/images/')
          
          if (!isInImagesFolder) {
            // Deleting an original from public/ - also delete its thumbnails
            const imageKey = itemPath.replace(/^public\//, '')
            const entry = meta.images[imageKey]
            if (entry) {
              // Delete all generated thumbnails
              for (const sizeData of Object.values(entry.sizes)) {
                const sizePath = path.join(process.cwd(), 'public', sizeData.path)
                try { await fs.unlink(sizePath) } catch { /* ignore */ }
              }
              delete meta.images[imageKey]
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
      const entry = meta.images[imageKey]
      if (!entry) {
        errors.push(`Image not found in meta: ${imageKey}`)
        continue
      }

      if (entry.cdn?.synced) {
        synced.push(imageKey)
        continue
      }

      try {
        for (const sizeData of Object.values(entry.sizes)) {
          const localPath = path.join(process.cwd(), 'public', sizeData.path)
          const fileBuffer = await fs.readFile(localPath)

          await r2.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: sizeData.path.replace(/^\//, ''),
              Body: fileBuffer,
              ContentType: getContentType(sizeData.path),
            })
          )
        }

        entry.cdn = {
          synced: true,
          baseUrl: publicUrl,
          syncedAt: new Date().toISOString(),
        }

        for (const sizeData of Object.values(entry.sizes)) {
          const localPath = path.join(process.cwd(), 'public', sizeData.path)
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
      const entry = meta.images[imageKey]
      if (!entry) {
        errors.push(`Image not found in meta: ${imageKey}`)
        continue
      }

      try {
        let buffer: Buffer

        const originalPath = path.join(process.cwd(), 'public', entry.original.path)
        try {
          buffer = await fs.readFile(originalPath)
        } catch {
          if (entry.cdn?.synced) {
            buffer = await downloadFromCdn(entry.original.path)
          } else {
            throw new Error('Original not found locally and not on CDN')
          }
        }

        const updatedEntry = await processImage(buffer, entry, imageKey)
        meta.images[imageKey] = updatedEntry

        if (entry.cdn?.synced) {
          await uploadToCdn(updatedEntry)
          await deleteLocalFiles(updatedEntry)
        }

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

async function handleCountUnprocessed() {
  try {
    const meta = await loadMeta()
    const unprocessedImages: string[] = []

    // Scan public folder recursively for images, excluding public/images/
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
            // Check if this image is already in meta
            if (!meta.images[relPath]) {
              unprocessedImages.push(relPath)
            }
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    const publicDir = path.join(process.cwd(), 'public')
    await scanPublicFolder(publicDir)

    return NextResponse.json({
      count: unprocessedImages.length,
      images: unprocessedImages,
    })
  } catch (error) {
    console.error('Failed to count unprocessed images:', error)
    return NextResponse.json({ error: 'Failed to count unprocessed images' }, { status: 500 })
  }
}

async function handleProcessAll() {
  try {
    const meta = await loadMeta()
    const processed: string[] = []
    const errors: string[] = []
    const orphansRemoved: string[] = []

    // Step 1: Scan public folder for unprocessed images (excluding public/images/)
    const unprocessedImages: Array<{ key: string; fullPath: string }> = []

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
            // Check if this image is already in meta
            if (!meta.images[relPath]) {
              unprocessedImages.push({ key: relPath, fullPath })
            }
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    const publicDir = path.join(process.cwd(), 'public')
    await scanPublicFolder(publicDir)

    // Step 2: Process each unprocessed image
    for (const { key, fullPath } of unprocessedImages) {
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

          const sizePath = `/images/${imageDir === '.' ? '' : imageDir + '/'}${fileName}`
          meta.images[key] = {
            original: {
              path: `/${key}`,
              width: 0,
              height: 0,
              fileSize: buffer.length,
            },
            sizes: {
              full: { path: sizePath, width: 0, height: 0 },
              large: { path: sizePath, width: 0, height: 0 },
              medium: { path: sizePath, width: 0, height: 0 },
              small: { path: sizePath, width: 0, height: 0 },
            },
            blurhash: '',
            dominantColor: '#888888',
            cdn: null,
          }
        } else {
          // Raster image: full processing
          const dummyEntry: ImageEntry = {
            original: {
              path: `/${key}`,
              width: 0,
              height: 0,
              fileSize: buffer.length,
            },
            sizes: {
              full: { path: '', width: 0, height: 0 },
              large: { path: '', width: 0, height: 0 },
              medium: { path: '', width: 0, height: 0 },
              small: { path: '', width: 0, height: 0 },
            },
            blurhash: '',
            dominantColor: '#888888',
            cdn: null,
          }

          const processedEntry = await processImage(buffer, dummyEntry, key)
          meta.images[key] = processedEntry
        }

        processed.push(key)
      } catch (error) {
        console.error(`Failed to process ${key}:`, error)
        errors.push(key)
      }
    }

    // Step 3: Remove orphaned thumbnails (files in public/images/ not tracked in meta)
    const trackedPaths = new Set<string>()
    for (const entry of Object.values(meta.images)) {
      for (const sizeData of Object.values(entry.sizes)) {
        trackedPaths.add(sizeData.path)
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
              // This is an orphan - delete it
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

    // Step 4: Clean up empty directories in public/images/
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

    return NextResponse.json({
      success: true,
      processed,
      orphansRemoved,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to process all:', error)
    return NextResponse.json({ error: 'Failed to process all images' }, { status: 500 })
  }
}

// ============================================================================
// Helper functions
// ============================================================================

async function loadMeta(): Promise<StudioMeta> {
  const metaPath = path.join(process.cwd(), '_data', '_meta.json')
  try {
    const content = await fs.readFile(metaPath, 'utf-8')
    const parsed = JSON.parse(content)
    
    if (parsed.images && typeof parsed.images === 'object') {
      return parsed
    }
    
    // Return empty meta if format is invalid
    return {
      $schema: 'https://gallop.software/schemas/studio-meta.json',
      version: 1,
      generatedAt: new Date().toISOString(),
      images: {},
    }
  } catch {
    return {
      $schema: 'https://gallop.software/schemas/studio-meta.json',
      version: 1,
      generatedAt: new Date().toISOString(),
      images: {},
    }
  }
}

async function saveMeta(meta: StudioMeta): Promise<void> {
  const metaPath = path.join(process.cwd(), '_data', '_meta.json')
  await fs.mkdir(path.join(process.cwd(), '_data'), { recursive: true })
  meta.generatedAt = new Date().toISOString()
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
  entry: ImageEntry,
  imageKey: string
): Promise<ImageEntry> {
  const sharpInstance = sharp(buffer)
  const metadata = await sharpInstance.metadata()
  const originalWidth = metadata.width || 0
  const originalHeight = metadata.height || 0

  const baseName = path.basename(imageKey, path.extname(imageKey))
  const ext = path.extname(imageKey).toLowerCase()
  const imageDir = path.dirname(imageKey)

  const imagesPath = path.join(process.cwd(), 'public', 'images', imageDir === '.' ? '' : imageDir)
  await fs.mkdir(imagesPath, { recursive: true })

  const sizes: Record<ImageSize, { path: string; width: number; height: number }> = {
    full: { path: '', width: originalWidth, height: originalHeight },
    large: { path: '', width: 0, height: 0 },
    medium: { path: '', width: 0, height: 0 },
    small: { path: '', width: 0, height: 0 },
  }

  const fullFileName = imageDir === '.' ? `${baseName}${ext}` : `${imageDir}/${baseName}${ext}`
  const fullPath = path.join(process.cwd(), 'public', 'images', fullFileName)
  await sharp(buffer).jpeg({ quality: 85 }).toFile(fullPath)
  sizes.full.path = `/images/${fullFileName}`

  for (const [sizeName, maxWidth] of Object.entries(DEFAULT_SIZES) as [ImageSize, number][]) {
    if (originalWidth <= maxWidth) {
      sizes[sizeName] = { ...sizes.full }
      continue
    }

    const ratio = originalHeight / originalWidth
    const newHeight = Math.round(maxWidth * ratio)
    const sizeFileName = `${baseName}-${maxWidth}${ext === '.png' ? '.png' : '.jpg'}`
    const sizeFilePath = imageDir === '.' ? sizeFileName : `${imageDir}/${sizeFileName}`
    const sizePath = path.join(process.cwd(), 'public', 'images', sizeFilePath)

    await sharp(buffer).resize(maxWidth, newHeight).jpeg({ quality: 80 }).toFile(sizePath)

    sizes[sizeName] = {
      path: `/images/${sizeFilePath}`,
      width: maxWidth,
      height: newHeight,
    }
  }

  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)

  const { dominant } = await sharp(buffer).stats()
  const dominantColor = `#${dominant.r.toString(16).padStart(2, '0')}${dominant.g.toString(16).padStart(2, '0')}${dominant.b.toString(16).padStart(2, '0')}`

  return {
    ...entry,
    original: {
      ...entry.original,
      width: originalWidth,
      height: originalHeight,
      fileSize: buffer.length,
    },
    sizes,
    blurhash,
    dominantColor,
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

async function uploadToCdn(entry: ImageEntry): Promise<void> {
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

  for (const sizeData of Object.values(entry.sizes)) {
    const localPath = path.join(process.cwd(), 'public', sizeData.path)
    const fileBuffer = await fs.readFile(localPath)

    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: sizeData.path.replace(/^\//, ''),
        Body: fileBuffer,
        ContentType: getContentType(sizeData.path),
      })
    )
  }
}

async function deleteLocalFiles(entry: ImageEntry): Promise<void> {
  for (const sizeData of Object.values(entry.sizes)) {
    const localPath = path.join(process.cwd(), 'public', sizeData.path)
    try {
      await fs.unlink(localPath)
    } catch {
      // File might not exist
    }
  }
}
