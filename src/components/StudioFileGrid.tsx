/** @jsxImportSource @emotion/react */
'use client'

import { useEffect, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { useStudio } from './StudioContext'
import type { FileItem } from '../types'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const styles = {
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 256px;
  `,
  spinner: css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-bottom-color: #9333ea;
    animation: ${spin} 1s linear infinite;
  `,
  empty: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 256px;
    color: #6b7280;
  `,
  emptyIcon: css`
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
  `,
  emptyText: css`
    font-size: 14px;
    margin: 0;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    
    @media (min-width: 640px) { grid-template-columns: repeat(3, 1fr); }
    @media (min-width: 768px) { grid-template-columns: repeat(4, 1fr); }
    @media (min-width: 1024px) { grid-template-columns: repeat(5, 1fr); }
    @media (min-width: 1280px) { grid-template-columns: repeat(6, 1fr); }
  `,
  item: css`
    position: relative;
    border-radius: 8px;
    border: 2px solid transparent;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s;
    background-color: #f9fafb;
    
    &:hover {
      border-color: #e5e7eb;
    }
  `,
  itemSelected: css`
    border-color: #a855f7;
    background-color: #faf5ff;
    
    &:hover {
      border-color: #a855f7;
    }
  `,
  checkbox: css`
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 10;
    width: 16px;
    height: 16px;
    accent-color: #9333ea;
  `,
  cdnBadge: css`
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    background-color: #dcfce7;
    color: #15803d;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 9999px;
  `,
  content: css`
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `,
  folderIcon: css`
    width: 64px;
    height: 64px;
    color: #facc15;
  `,
  image: css`
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
  `,
  label: css`
    padding: 6px 8px;
    background-color: white;
    border-top: 1px solid #e5e7eb;
  `,
  name: css`
    font-size: 12px;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
  `,
  size: css`
    font-size: 12px;
    color: #9ca3af;
    margin: 0;
  `,
  selectAllRow: css`
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e7eb;
  `,
  selectAllLabel: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6b7280;
    cursor: pointer;
    
    &:hover {
      color: #374151;
    }
  `,
  selectAllCheckbox: css`
    width: 16px;
    height: 16px;
    accent-color: #9333ea;
  `,
}

export function StudioFileGrid() {
  const { currentPath, setCurrentPath, selectedItems, toggleSelection, selectRange, lastSelectedPath, selectAll, clearSelection, refreshKey } = useStudio()
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadItems() {
      setLoading(true)
      try {
        const response = await fetch(`/api/studio/list?path=${encodeURIComponent(currentPath)}`)
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
  }, [currentPath, refreshKey])

  if (loading) {
    return (
      <div css={styles.loading}>
        <div css={styles.spinner} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div css={styles.empty}>
        <svg css={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p css={styles.emptyText}>No files in this folder</p>
        <p css={styles.emptyText}>Upload images to get started</p>
      </div>
    )
  }

  const sortedItems = [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name)
  })

  const files = sortedItems.filter(item => item.type !== 'folder')
  const allFilesSelected = files.length > 0 && files.every(item => selectedItems.has(item.path))
  const someFilesSelected = files.some(item => selectedItems.has(item.path))

  const handleSelectAll = () => {
    if (allFilesSelected) {
      clearSelection()
    } else {
      selectAll(files)
    }
  }

  const handleItemClick = (item: FileItem, e: React.MouseEvent) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path)
      return
    }

    if (e.shiftKey && lastSelectedPath) {
      selectRange(lastSelectedPath, item.path, sortedItems)
    } else {
      toggleSelection(item.path)
    }
  }

  return (
    <div>
      {files.length > 0 && (
        <div css={styles.selectAllRow}>
          <label css={styles.selectAllLabel}>
            <input
              type="checkbox"
              css={styles.selectAllCheckbox}
              checked={allFilesSelected}
              ref={(el) => {
                if (el) el.indeterminate = someFilesSelected && !allFilesSelected
              }}
              onChange={handleSelectAll}
            />
            Select all ({files.length})
          </label>
        </div>
      )}
      <div css={styles.grid}>
        {sortedItems.map((item) => (
          <GridItem
            key={item.path}
            item={item}
            isSelected={selectedItems.has(item.path)}
            onClick={(e) => handleItemClick(item, e)}
          />
        ))}
      </div>
    </div>
  )
}

interface GridItemProps {
  item: FileItem
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}

function GridItem({ item, isSelected, onClick }: GridItemProps) {
  const isFolder = item.type === 'folder'

  return (
    <div css={[styles.item, isSelected && styles.itemSelected]} onClick={onClick}>
      {/* Only show checkbox for files, not folders */}
      {!isFolder && (
        <input
          type="checkbox"
          css={styles.checkbox}
          checked={isSelected}
          onChange={() => {}}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {item.cdnSynced && <span css={styles.cdnBadge}>CDN</span>}

      <div css={styles.content}>
        {isFolder ? (
          <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
          </svg>
        ) : (
          <img
            css={styles.image}
            src={item.path.replace('public', '')}
            alt={item.name}
            loading="lazy"
          />
        )}
      </div>

      <div css={styles.label}>
        <p css={styles.name} title={item.name}>{item.name}</p>
        {item.size && <p css={styles.size}>{formatFileSize(item.size)}</p>}
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
