'use client'

// Components
export { StudioProvider } from './components/StudioProvider'
export { StudioButton } from './components/StudioButton'
export { StudioModal } from './components/StudioModal'

// Types
export type {
  ImageSize,
  SizeEntry,
  CdnStatus,
  ImageEntry,
  StudioMeta,
  FileItem,
  StudioConfig,
} from './types'

// Meta utilities
export { meta, getImageUrl, getStudioMeta, initializeMeta, getImageSize } from './lib/meta'

// Note: API handlers are exported from separate entry points
// import { GET } from '@gallop.software/studio/api/list'
