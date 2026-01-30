/**
 * Meta entry - works for images and non-images
 * Images have w, h, b (after processing)
 * Non-images just have c (if pushed to CDN)
 */
export interface MetaEntry {
  w?: number     // original width (images only)
  h?: number     // original height (images only)
  b?: string     // blurhash (images only, after processing)
  c?: 1          // pushed to CDN (omit if not pushed)
}

/**
 * Meta schema - keyed by path from public folder
 * Example: { "/portfolio/photo.jpg": { w: 2400, h: 1600, blur: "..." } }
 */
export type LeanMeta = Record<string, MetaEntry>

// Legacy alias for compatibility
export type LeanImageEntry = MetaEntry

/**
 * File/folder item for browser
 */
export interface FileItem {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  dimensions?: { width: number; height: number }
  cdnSynced?: boolean
  // Folder-specific properties
  fileCount?: number
  totalSize?: number
  // For showing thumbnails - path to -sm version if exists
  thumbnail?: string
  // Whether a processed thumbnail exists
  hasThumbnail?: boolean
}

/**
 * Studio configuration
 */
export interface StudioConfig {
  r2AccountId?: string
  r2AccessKeyId?: string
  r2SecretAccessKey?: string
  r2BucketName?: string
  r2PublicUrl?: string
  thumbnailSizes?: {
    small: number
    medium: number
    large: number
  }
}

/**
 * Get thumbnail path from original image path
 */
export function getThumbnailPath(originalPath: string, size: 'sm' | 'md' | 'lg' | 'full'): string {
  if (size === 'full') {
    const ext = originalPath.match(/\.\w+$/)?.[0] || '.jpg'
    const base = originalPath.replace(/\.\w+$/, '')
    const outputExt = ext.toLowerCase() === '.png' ? '.png' : '.jpg'
    return `/images${base}${outputExt}`
  }
  const ext = originalPath.match(/\.\w+$/)?.[0] || '.jpg'
  const base = originalPath.replace(/\.\w+$/, '')
  const outputExt = ext.toLowerCase() === '.png' ? '.png' : '.jpg'
  return `/images${base}-${size}${outputExt}`
}

/**
 * Get all thumbnail paths for an image
 */
export function getAllThumbnailPaths(originalPath: string): string[] {
  return [
    getThumbnailPath(originalPath, 'full'),
    getThumbnailPath(originalPath, 'lg'),
    getThumbnailPath(originalPath, 'md'),
    getThumbnailPath(originalPath, 'sm'),
  ]
}
