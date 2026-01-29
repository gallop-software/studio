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
