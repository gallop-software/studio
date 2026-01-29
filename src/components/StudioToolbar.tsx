'use client'

import { useCallback } from 'react'
import { useStudio } from './StudioContext'

/**
 * Toolbar with action buttons
 */
export function StudioToolbar() {
  const { selectedItems, viewMode, setViewMode, clearSelection } = useStudio()

  const handleUpload = useCallback(() => {
    // TODO: Implement upload
    console.log('Upload clicked')
  }, [])

  const handleReprocess = useCallback(() => {
    // TODO: Implement reprocess
    console.log('Reprocess clicked', selectedItems)
  }, [selectedItems])

  const handleDelete = useCallback(() => {
    // TODO: Implement delete
    console.log('Delete clicked', selectedItems)
  }, [selectedItems])

  const handleSyncCdn = useCallback(() => {
    // TODO: Implement CDN sync
    console.log('Sync CDN clicked', selectedItems)
  }, [selectedItems])

  const handleScan = useCallback(() => {
    // TODO: Implement scan
    console.log('Scan clicked')
  }, [])

  const hasSelection = selectedItems.size > 0

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-2">
        {/* Upload */}
        <ToolbarButton onClick={handleUpload} icon="upload" label="Upload" />

        {/* Reprocess */}
        <ToolbarButton
          onClick={handleReprocess}
          icon="refresh"
          label="Reprocess"
          disabled={!hasSelection}
        />

        {/* Delete */}
        <ToolbarButton
          onClick={handleDelete}
          icon="trash"
          label="Delete"
          disabled={!hasSelection}
          variant="danger"
        />

        {/* Sync CDN */}
        <ToolbarButton
          onClick={handleSyncCdn}
          icon="cloud"
          label="Sync CDN"
          disabled={!hasSelection}
        />

        {/* Scan */}
        <ToolbarButton onClick={handleScan} icon="scan" label="Scan" />
      </div>

      <div className="flex items-center gap-4">
        {/* Selection count */}
        {hasSelection && (
          <span className="text-sm text-gray-600">
            {selectedItems.size} selected
            <button
              onClick={clearSelection}
              className="ml-2 text-purple-600 hover:underline"
            >
              Clear
            </button>
          </span>
        )}

        {/* View toggle */}
        <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
            aria-label="Grid view"
          >
            <GridIcon />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
            aria-label="List view"
          >
            <ListIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  icon: 'upload' | 'refresh' | 'trash' | 'cloud' | 'scan'
  label: string
  disabled?: boolean
  variant?: 'default' | 'danger'
}

function ToolbarButton({
  onClick,
  icon,
  label,
  disabled,
  variant = 'default',
}: ToolbarButtonProps) {
  const baseStyles =
    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors'
  const variantStyles =
    variant === 'danger'
      ? 'text-red-600 hover:bg-red-50 disabled:text-red-300'
      : 'text-gray-700 hover:bg-white disabled:text-gray-400'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <IconComponent icon={icon} />
      {label}
    </button>
  )
}

function IconComponent({ icon }: { icon: string }) {
  const className = 'w-4 h-4'

  switch (icon) {
    case 'upload':
      return (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      )
    case 'refresh':
      return (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      )
    case 'trash':
      return (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      )
    case 'cloud':
      return (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      )
    case 'scan':
      return (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      )
    default:
      return null
  }
}

function GridIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  )
}
