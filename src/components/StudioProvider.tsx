'use client'

import { StudioButton } from './StudioButton'
import { StudioModal } from './StudioModal'
import { StudioContext, useStudioState } from './StudioContext'

/**
 * StudioProvider - Renders the floating button and modal.
 * Only renders in development mode.
 *
 * Usage:
 * ```tsx
 * // In your root layout
 * import { StudioProvider } from '@gallop.software/studio'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <StudioProvider />
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function StudioProvider() {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return <StudioProviderInner />
}

function StudioProviderInner() {
  const state = useStudioState()

  return (
    <StudioContext.Provider value={state}>
      <StudioButton />
      <StudioModal />
    </StudioContext.Provider>
  )
}
