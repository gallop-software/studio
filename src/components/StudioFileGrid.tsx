'use client'

import { useEffect, useState } from 'react'
import { useStudio } from './StudioContext'
import type { FileItem } from '../types'

/**
 * Grid view of files and folders
 */
export function StudioFileGrid() {
  const { currentPath, setCurrentPath, selectedItems, toggleSelection } =
    useStudio()
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadItems() {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/studio/list?path=${encodeURIComponent(currentPath)}`
        )
        if (response.ok) {
          const data = await response.json()
          setItems(data.items || [])
        }
      } catch (error) {
        console.error('Failed to load items:', error)
      }
      setLoading(false)
    }
    loadItems()
  }, [currentPath])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg
          className="w-12 h-12 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p>No files in this folder</p>
        <p className="text-sm">Upload images to get started</p>
      </div>
    )
  }

  // Sort: folders first, then files
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {sortedItems.map((item) => (
        <GridItem
          key={item.path}
          item={item}
          isSelected={selectedItems.has(item.path)}
          onSelect={() => toggleSelection(item.path)}
          onOpen={() => {
            if (item.type === 'folder') {
              setCurrentPath(item.path)
            }
          }}
        />
      ))}
    </div>
  )
}

interface GridItemProps {
  item: FileItem
  isSelected: boolean
  onSelect: () => void
  onOpen: () => void
}

function GridItem({ item, isSelected, onSelect, onOpen }: GridItemProps) {
  const isFolder = item.type === 'folder'

  return (
    <div
      className={`relative group rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-50'
          : 'border-transparent hover:border-gray-200 bg-gray-50'
      }`}
      onDoubleClick={onOpen}
    >
      {/* Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
      </div>

      {/* CDN badge */}
      {item.cdnSynced && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
            CDN
          </span>
        </div>
      )}

      {/* Content */}
      <div className="aspect-square flex items-center justify-center p-4">
        {isFolder ? (
          <FolderIcon />
        ) : (
          <img
            src={item.path.replace('public', '')}
            alt={item.name}
            className="max-w-full max-h-full object-contain rounded"
            loading="lazy"
          />
        )}
      </div>

      {/* Label */}
      <div className="px-2 py-1.5 bg-white border-t">
        <p className="text-xs text-gray-700 truncate" title={item.name}>
          {item.name}
        </p>
        {item.size && (
          <p className="text-xs text-gray-400">
            {formatFileSize(item.size)}
          </p>
        )}
      </div>
    </div>
  )
}

function FolderIcon() {
  return (
    <svg
      className="w-16 h-16 text-yellow-400"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
    </svg>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
