import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { encode } from 'blurhash'
import type { StudioMeta, ImageEntry, ImageSize } from '../types'

// Default thumbnail sizes
const DEFAULT_SIZES = {
  small: 300,
  medium: 700,
  large: 1400,
}

/**
 * API route handler for uploading images
 * Saves to originals/, generates thumbnails, updates meta
 * 
 * Usage in consuming project:
 * ```ts
 * // src/app/api/studio/upload/route.ts
 * export { POST } from '@gallop.software/studio/api/upload'
 * ```
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const targetPath = formData.get('path') as string || 'public/originals'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine file paths
    const fileName = file.name
    const baseName = path.basename(fileName, path.extname(fileName))
    const ext = path.extname(fileName).toLowerCase()

    // Check if file already exists in meta
    const metaPath = path.join(process.cwd(), '_data', '_meta.json')
    let meta: StudioMeta
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8')
      meta = JSON.parse(metaContent)
    } catch {
      meta = {
        $schema: 'https://gallop.software/schemas/studio-meta.json',
        version: 1,
        generatedAt: new Date().toISOString(),
        images: {},
      }
    }

    // Generate image key
    const imageKey = targetPath
      .replace(/^public\/originals\/?/, '')
      .replace(/^public\/images\/?/, '')
    const fullImageKey = imageKey ? `${imageKey}/${fileName}` : fileName

    if (meta.images[fullImageKey]) {
      return NextResponse.json(
        { error: `File '${fullImageKey}' already exists in meta` },
        { status: 409 }
      )
    }

    // Save original
    const originalsPath = path.join(process.cwd(), 'public', 'originals', imageKey)
    await fs.mkdir(originalsPath, { recursive: true })
    const originalFilePath = path.join(originalsPath, fileName)
    await fs.writeFile(originalFilePath, buffer)

    // Get original dimensions
    const sharpInstance = sharp(buffer)
    const metadata = await sharpInstance.metadata()
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0

    // Generate thumbnails
    const imagesPath = path.join(process.cwd(), 'public', 'images', imageKey)
    await fs.mkdir(imagesPath, { recursive: true })

    const sizes: Record<ImageSize, { path: string; width: number; height: number }> = {
      full: { path: '', width: originalWidth, height: originalHeight },
      large: { path: '', width: 0, height: 0 },
      medium: { path: '', width: 0, height: 0 },
      small: { path: '', width: 0, height: 0 },
    }

    // Save full size (optimized)
    const fullPath = path.join(imagesPath, fileName)
    await sharp(buffer)
      .jpeg({ quality: 85 })
      .toFile(fullPath)
    sizes.full.path = `/images/${imageKey ? imageKey + '/' : ''}${fileName}`

    // Generate each size
    for (const [sizeName, maxWidth] of Object.entries(DEFAULT_SIZES) as [ImageSize, number][]) {
      if (originalWidth <= maxWidth) {
        // Original is smaller, use full
        sizes[sizeName] = { ...sizes.full }
        continue
      }

      const ratio = originalHeight / originalWidth
      const newHeight = Math.round(maxWidth * ratio)
      const sizeFileName = `${baseName}-${maxWidth}${ext === '.png' ? '.png' : '.jpg'}`
      const sizePath = path.join(imagesPath, sizeFileName)

      await sharp(buffer)
        .resize(maxWidth, newHeight)
        .jpeg({ quality: 80 })
        .toFile(sizePath)

      sizes[sizeName] = {
        path: `/images/${imageKey ? imageKey + '/' : ''}${sizeFileName}`,
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

    // Create meta entry
    const entry: ImageEntry = {
      original: {
        path: `/originals/${imageKey ? imageKey + '/' : ''}${fileName}`,
        width: originalWidth,
        height: originalHeight,
        fileSize: buffer.length,
      },
      sizes,
      blurhash,
      dominantColor,
      cdn: null,
    }

    // Update meta
    meta.images[fullImageKey] = entry
    meta.generatedAt = new Date().toISOString()

    // Ensure _data directory exists
    await fs.mkdir(path.join(process.cwd(), '_data'), { recursive: true })
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))

    return NextResponse.json({
      success: true,
      imageKey: fullImageKey,
      entry,
    })
  } catch (error) {
    console.error('Failed to upload:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
