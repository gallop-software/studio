/**
 * Dimensions object {w, h}
 */
export interface Dimensions {
  w: number
  h: number
}

/**
 * Meta entry - works for images and non-images
 * o: original dimensions, c: CDN index
 * sm/md/lg/f: thumbnail dimensions (presence implies processed)
 */
export interface MetaEntry {
  o?: Dimensions   // original dimensions {w, h}
  sm?: Dimensions  // small thumbnail (300px width)
  md?: Dimensions  // medium thumbnail (700px width)
  lg?: Dimensions  // large thumbnail (1400px width)
  f?: Dimensions   // full size (capped at 2560px width)
  c?: number       // CDN index - index into _cdns array
  u?: 1            // update pending - local file overrides cloud file
}

/**
 * Full meta schema including special keys
 * _cdns: Array of CDN base URLs
 * Other keys: file paths from public folder
 */
export interface FullMeta {
  _cdns?: string[]  // Array of CDN base URLs
  [key: string]: MetaEntry | string[] | undefined
}

/**
 * Meta schema - keyed by path from public folder
 * Example: { "/portfolio/photo.jpg": { o: {w:2400,h:1600}, sm: {w:300,h:200}, ... } }
 */
export type LeanMeta = Record<string, MetaEntry>

// Alias for compatibility
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
  isProcessed?: boolean
  cdnPushed?: boolean
  cdnBaseUrl?: string  // CDN base URL when pushed to cloud
  isRemote?: boolean   // true if CDN URL doesn't match R2 (external import)
  isProtected?: boolean // true for images folder and its contents (cannot select/modify)
  // Folder-specific properties
  fileCount?: number
  totalSize?: number
  cloudCount?: number   // Number of R2 cloud files in folder
  remoteCount?: number  // Number of remote (imported URL) files in folder
  localCount?: number   // Number of local files in folder
  // For showing thumbnails - path to -sm version if exists
  thumbnail?: string
  // Whether a processed thumbnail exists
  hasThumbnail?: boolean
  // Which thumbnail sizes exist
  hasSm?: boolean
  hasMd?: boolean
  hasLg?: boolean
  hasFull?: boolean
  // Update pending - local file overrides cloud file
  hasUpdate?: boolean
  // Number of files with pending updates in folder
  updateCount?: number
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

/**
 * Check if an image entry is processed (has any thumbnail dimensions)
 */
export function isProcessed(entry: MetaEntry | undefined): boolean {
  if (!entry) return false
  return !!(entry.f || entry.lg || entry.md || entry.sm)
}
