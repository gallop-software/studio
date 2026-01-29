'use client'

import { useEffect, useCallback } from 'react'
import { useStudio } from './StudioContext'
import { StudioToolbar } from './StudioToolbar'
import { StudioBreadcrumb } from './StudioBreadcrumb'
import { StudioFileGrid } from './StudioFileGrid'
import { StudioFileList } from './StudioFileList'
import { StudioPreview } from './StudioPreview'
import { StudioSettings } from './StudioSettings'

/**
 * Main Studio modal overlay
 */
export function StudioModal() {
  const { isOpen, closeStudio, viewMode } = useStudio()

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeStudio()
      }
    },
    [closeStudio]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeStudio}
      />

      {/* Modal */}
      <div className="absolute inset-8 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Studio</h1>
          <div className="flex items-center gap-2">
            <StudioSettings />
            <button
              onClick={closeStudio}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close Studio"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-gray-500"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <StudioToolbar />

        {/* Breadcrumb */}
        <StudioBreadcrumb />

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* File browser */}
          <div className="flex-1 overflow-auto p-4">
            {viewMode === 'grid' ? <StudioFileGrid /> : <StudioFileList />}
          </div>

          {/* Preview panel */}
          <StudioPreview />
        </div>
      </div>
    </div>
  )
}
