'use client'

/**
 * @gallop.software/studio
 * 
 * Media manager for Gallop templates.
 * 
 * Usage:
 * ```tsx
 * // In your layout.tsx
 * import { StudioButton } from '@gallop.software/studio'
 * 
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <StudioButton />
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 * 
 * API handlers (in src/app/api/studio/[...path]/route.ts):
 * ```ts
 * export { GET, POST, DELETE } from '@gallop.software/studio/handlers'
 * ```
 */

// Main component - all-in-one button + modal
export { StudioButton } from './components/StudioButton'

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
