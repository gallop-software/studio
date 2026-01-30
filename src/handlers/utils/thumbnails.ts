import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { encode } from 'blurhash'
import type { MetaEntry } from '../../types'

export const DEFAULT_SIZES: Record<string, { width: number; suffix: string }> = {
  small: { width: 300, suffix: '-sm' },
  medium: { width: 700, suffix: '-md' },
  large: { width: 1400, suffix: '-lg' },
}

export async function processImage(
  buffer: Buffer,
  imageKey: string
): Promise<MetaEntry> {
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
    b: blurhash,
  }
}
