import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { encode } from 'blurhash'
import type { MetaEntry, Dimensions } from '../../types'

export const FULL_MAX_WIDTH = 2560

export const DEFAULT_SIZES: Record<string, { width: number; suffix: string; key: 'sm' | 'md' | 'lg' }> = {
  small: { width: 300, suffix: '-sm', key: 'sm' },
  medium: { width: 700, suffix: '-md', key: 'md' },
  large: { width: 1400, suffix: '-lg', key: 'lg' },
}

export async function processImage(
  buffer: Buffer,
  imageKey: string
): Promise<MetaEntry> {
  const sharpInstance = sharp(buffer)
  const metadata = await sharpInstance.metadata()
  const originalWidth = metadata.width || 0
  const originalHeight = metadata.height || 0
  const ratio = originalHeight / originalWidth

  // Remove leading slash for path operations
  const keyWithoutSlash = imageKey.startsWith('/') ? imageKey.slice(1) : imageKey
  const baseName = path.basename(keyWithoutSlash, path.extname(keyWithoutSlash))
  const ext = path.extname(keyWithoutSlash).toLowerCase()
  const imageDir = path.dirname(keyWithoutSlash)

  const imagesPath = path.join(process.cwd(), 'public', 'images', imageDir === '.' ? '' : imageDir)
  await fs.mkdir(imagesPath, { recursive: true })

  const isPng = ext === '.png'
  const outputExt = isPng ? '.png' : '.jpg'

  // Build the result entry
  const entry: MetaEntry = {
    o: { w: originalWidth, h: originalHeight },
  }

  // Generate full size (capped at FULL_MAX_WIDTH)
  const fullFileName = imageDir === '.' ? `${baseName}${outputExt}` : `${imageDir}/${baseName}${outputExt}`
  const fullPath = path.join(process.cwd(), 'public', 'images', fullFileName)

  let fullWidth = originalWidth
  let fullHeight = originalHeight

  if (originalWidth > FULL_MAX_WIDTH) {
    fullWidth = FULL_MAX_WIDTH
    fullHeight = Math.round(FULL_MAX_WIDTH * ratio)
    if (isPng) {
      await sharp(buffer).resize(fullWidth, fullHeight).png({ quality: 85 }).toFile(fullPath)
    } else {
      await sharp(buffer).resize(fullWidth, fullHeight).jpeg({ quality: 85 }).toFile(fullPath)
    }
  } else {
    if (isPng) {
      await sharp(buffer).png({ quality: 85 }).toFile(fullPath)
    } else {
      await sharp(buffer).jpeg({ quality: 85 }).toFile(fullPath)
    }
  }
  entry.f = { w: fullWidth, h: fullHeight }

  // Generate thumbnail sizes
  for (const [, sizeConfig] of Object.entries(DEFAULT_SIZES)) {
    const { width: maxWidth, suffix, key } = sizeConfig
    if (originalWidth <= maxWidth) {
      continue // Skip if original is smaller than this size
    }

    const newHeight = Math.round(maxWidth * ratio)
    const sizeFileName = `${baseName}${suffix}${outputExt}`
    const sizeFilePath = imageDir === '.' ? sizeFileName : `${imageDir}/${sizeFileName}`
    const sizePath = path.join(process.cwd(), 'public', 'images', sizeFilePath)

    if (isPng) {
      await sharp(buffer).resize(maxWidth, newHeight).png({ quality: 80 }).toFile(sizePath)
    } else {
      await sharp(buffer).resize(maxWidth, newHeight).jpeg({ quality: 80 }).toFile(sizePath)
    }

    entry[key] = { w: maxWidth, h: newHeight }
  }

  // Generate blurhash
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  entry.b = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)

  return entry
}
