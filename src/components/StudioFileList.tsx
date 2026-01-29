'use client'

import { useEffect, useState } from 'react'
import { useStudio } from './StudioContext'
import type { FileItem } from '../types'

/**
 * List view of files and folders
 */
export function StudioFileList() {
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
        <p>No files in this folder</p>
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
    <table className="w-full">
      <thead>
        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
          <th className="w-8 pb-2"></th>
          <th className="pb-2">Name</th>
          <th className="pb-2 w-24">Size</th>
          <th className="pb-2 w-32">Dimensions</th>
          <th className="pb-2 w-24">CDN</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {sortedItems.map((item) => (
          <ListRow
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
      </tbody>
    </table>
  )
}

interface ListRowProps {
  item: FileItem
  isSelected: boolean
  onSelect: () => void
  onOpen: () => void
}

function ListRow({ item, isSelected, onSelect, onOpen }: ListRowProps) {
  const isFolder = item.type === 'folder'

  return (
    <tr
      className={`cursor-pointer transition-colors ${
        isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
      }`}
      onDoubleClick={onOpen}
    >
      <td className="py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
      </td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          {isFolder ? (
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-gray-400"
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
          )}
          <span className="text-sm text-gray-900">{item.name}</span>
        </div>
      </td>
      <td className="py-2 text-sm text-gray-500">
        {item.size ? formatFileSize(item.size) : '--'}
      </td>
      <td className="py-2 text-sm text-gray-500">
        {item.dimensions
          ? `${item.dimensions.width}x${item.dimensions.height}`
          : '--'}
      </td>
      <td className="py-2">
        {item.cdnSynced ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-700">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Synced
          </span>
        ) : (
          <span className="text-xs text-gray-400">--</span>
        )}
      </td>
    </tr>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
