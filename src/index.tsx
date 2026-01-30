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
  LeanImageEntry,
  LeanMeta,
  FileItem,
  StudioConfig,
} from './types'

// Utilities
export { getThumbnailPath, getAllThumbnailPaths } from './types'
