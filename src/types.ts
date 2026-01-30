/**
 * Image size variants
 */
export type ImageSize = 'small' | 'medium' | 'large' | 'full'

/**
 * Size entry with path and dimensions
 */
export interface SizeEntry {
  path: string
  width: number
  height: number
}

/**
 * CDN sync status
 */
export interface CdnStatus {
  synced: boolean
  baseUrl: string
  syncedAt: string
}

/**
 * Image entry in meta
 */
export interface ImageEntry {
  original: {
    path: string
    width: number
    height: number
    fileSize: number
  }
  sizes: Record<ImageSize, SizeEntry>
  blurhash: string
  dominantColor: string
  cdn: CdnStatus | null
}

/**
 * Studio meta schema
 */
export interface StudioMeta {
  $schema: string
  version: number
  generatedAt: string
  images: Record<string, ImageEntry>
}

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
 * Lean meta entry - minimal data per image
 */
export interface LeanImageEntry {
  w: number      // original width
  h: number      // original height
  blur: string   // blurhash
  s?: 1          // synced to CDN (omit if not synced)
}

/**
 * Lean meta schema - keyed by path from public folder
 * Example: { "/portfolio/photo.jpg": { w: 2400, h: 1600, blur: "..." } }
 */
export type LeanMeta = Record<string, LeanImageEntry>
