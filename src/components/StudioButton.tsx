'use client'

import { useStudio } from './StudioContext'

/**
 * Floating button that opens the Studio modal.
 * Fixed position in bottom-right corner.
 */
export function StudioButton() {
  const { openStudio, isOpen } = useStudio()

  // Don't show button when modal is open
  if (isOpen) return null

  return (
    <button
      onClick={openStudio}
      className="fixed bottom-6 right-6 z-[9998] w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
      title="Open Studio"
      aria-label="Open Studio media manager"
    >
      {/* Image icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>

      {/* Pulse animation ring */}
      <span className="absolute inset-0 rounded-full bg-purple-400 opacity-0 group-hover:opacity-0 animate-ping" />
    </button>
  )
}
