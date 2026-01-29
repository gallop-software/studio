import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { encode } from 'blurhash'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import type { StudioMeta, ImageEntry, ImageSize } from '../types'

// Default thumbnail sizes
const DEFAULT_SIZES = {
  small: 300,
  medium: 700,
  large: 1400,
}

/**
 * API route handler for reprocessing images
 * Regenerates thumbnails from originals (or downloads from CDN if needed)
 * 
 * Usage in consuming project:
 * ```ts
 * // src/app/api/studio/reprocess/route.ts
 * export { POST } from '@gallop.software/studio/api/reprocess'
 * ```
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const { imageKeys } = await request.json() as { imageKeys: string[] }

    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return NextResponse.json({ error: 'No image keys provided' }, { status: 400 })
    }

    // Load meta
    const metaPath = path.join(process.cwd(), '_data', '_meta.json')
    let meta: StudioMeta
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8')
      meta = JSON.parse(metaContent)
    } catch {
      return NextResponse.json({ error: 'Meta file not found' }, { status: 404 })
    }

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

        // Check if we have local original
        const originalPath = path.join(process.cwd(), 'public', entry.original.path)
        try {
          buffer = await fs.readFile(originalPath)
        } catch {
          // Original not found locally, try to download from CDN
          if (entry.cdn?.synced) {
            buffer = await downloadFromCdn(entry.original.path)
          } else {
            throw new Error('Original not found locally and not on CDN')
          }
        }

        // Regenerate thumbnails
        const updatedEntry = await processImage(buffer, entry, imageKey)
        meta.images[imageKey] = updatedEntry

        // If was on CDN, re-upload and delete local
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

    // Save updated meta
    meta.generatedAt = new Date().toISOString()
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))

    return NextResponse.json({
      success: true,
      processed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to reprocess:', error)
    return NextResponse.json(
      { error: 'Failed to reprocess images' },
      { status: 500 }
    )
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

  // Ensure images directory exists
  const imagesPath = path.join(process.cwd(), 'public', 'images', imageDir)
  await fs.mkdir(imagesPath, { recursive: true })

  const sizes: Record<ImageSize, { path: string; width: number; height: number }> = {
    full: { path: '', width: originalWidth, height: originalHeight },
    large: { path: '', width: 0, height: 0 },
    medium: { path: '', width: 0, height: 0 },
    small: { path: '', width: 0, height: 0 },
  }

  // Save full size (optimized)
  const fullFileName = imageDir ? `${imageDir}/${baseName}${ext}` : `${baseName}${ext}`
  const fullPath = path.join(process.cwd(), 'public', 'images', fullFileName)
  await sharp(buffer).jpeg({ quality: 85 }).toFile(fullPath)
  sizes.full.path = `/images/${fullFileName}`

  // Generate each size
  for (const [sizeName, maxWidth] of Object.entries(DEFAULT_SIZES) as [ImageSize, number][]) {
    if (originalWidth <= maxWidth) {
      sizes[sizeName] = { ...sizes.full }
      continue
    }

    const ratio = originalHeight / originalWidth
    const newHeight = Math.round(maxWidth * ratio)
    const sizeFileName = `${baseName}-${maxWidth}${ext === '.png' ? '.png' : '.jpg'}`
    const sizeFilePath = imageDir ? `${imageDir}/${sizeFileName}` : sizeFileName
    const sizePath = path.join(process.cwd(), 'public', 'images', sizeFilePath)

    await sharp(buffer)
      .resize(maxWidth, newHeight)
      .jpeg({ quality: 80 })
      .toFile(sizePath)

    sizes[sizeName] = {
      path: `/images/${sizeFilePath}`,
      width: maxWidth,
      height: newHeight,
    }
  }

  // Generate blurhash
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const blurhash = encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  )

  // Get dominant color
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
    default:
      return 'application/octet-stream'
  }
}
