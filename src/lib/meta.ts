import type { StudioMeta, ImageEntry, ImageSize, SizeEntry } from '../types'

// Default empty meta - will be populated when reading from project
let _meta: StudioMeta = {
  $schema: 'https://gallop.software/schemas/studio-meta.json',
  version: 1,
  generatedAt: new Date().toISOString(),
  images: {},
}

/**
 * The meta object containing all image metadata.
 * This is read from _data/_meta.json in the consuming project.
 */
export const meta: StudioMeta = _meta

/**
 * Initialize meta from a JSON object (called during build/runtime)
 */
export function initializeMeta(data: StudioMeta): void {
  _meta = data
  Object.assign(meta, data)
}

/**
 * Get the resolved URL for an image, handling CDN vs local paths
 */
export function getImageUrl(
  imageKey: string,
  size: ImageSize = 'medium'
): string | undefined {
  const image = meta.images[imageKey]
  if (!image) return undefined

  const sizeData = image.sizes[size] || image.sizes.full
  if (!sizeData) return undefined

  // If synced to CDN, use CDN URL
  if (image.cdn?.synced && image.cdn.baseUrl) {
    return `${image.cdn.baseUrl}${sizeData.path}`
  }

  // Otherwise use local path
  return sizeData.path
}

/**
 * Get the full image entry for a key
 */
export function getStudioMeta(imageKey: string): ImageEntry | undefined {
  return meta.images[imageKey]
}

/**
 * Get size data for an image
 */
export function getImageSize(
  imageKey: string,
  size: ImageSize = 'medium'
): SizeEntry | undefined {
  const image = meta.images[imageKey]
  if (!image) return undefined
  return image.sizes[size] || image.sizes.full
}
