/** @jsxImportSource @emotion/react */
'use client'

import { useEffect, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { useStudio } from './StudioContext'
import { colors, fontSize } from './tokens'
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
    border: 3px solid ${colors.border};
    border-top-color: ${colors.primary};
    animation: ${spin} 0.8s linear infinite;
  `,
  empty: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 256px;
    color: ${colors.textSecondary};
  `,
  emptyIcon: css`
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  `,
  emptyText: css`
    font-size: ${fontSize.base};
    margin: 0 0 4px 0;
    
    &:last-child {
      color: ${colors.textMuted};
      font-size: ${fontSize.sm};
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    
    @media (min-width: 640px) { grid-template-columns: repeat(3, 1fr); }
    @media (min-width: 768px) { grid-template-columns: repeat(4, 1fr); }
    @media (min-width: 1024px) { grid-template-columns: repeat(5, 1fr); }
    @media (min-width: 1280px) { grid-template-columns: repeat(6, 1fr); }
  `,
  item: css`
    position: relative;
    border-radius: 8px;
    border: 1px solid ${colors.border};
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s ease;
    background-color: ${colors.surface};
    user-select: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    
    &:hover {
      border-color: #d0d5dd;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    }
  `,
  itemSelected: css`
    border-color: ${colors.primary};
    box-shadow: 0 0 0 1px ${colors.primary};
    
    &:hover {
      border-color: ${colors.primary};
    }
  `,
  parentItem: css`
    cursor: pointer;
    
    &:hover {
      border-color: ${colors.primary};
    }
  `,
  checkboxWrapper: css`
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    padding: 8px;
    cursor: pointer;
  `,
  checkbox: css`
    width: 16px;
    height: 16px;
    accent-color: ${colors.primary};
    cursor: pointer;
  `,
  cdnBadge: css`
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    background-color: ${colors.successLight};
    color: ${colors.success};
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 4px;
  `,
  content: css`
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: ${colors.background};
  `,
  folderIcon: css`
    width: 56px;
    height: 56px;
    color: #f5a623;
  `,
  parentIcon: css`
    width: 56px;
    height: 56px;
    color: ${colors.textMuted};
  `,
  fileIcon: css`
    width: 40px;
    height: 40px;
    color: ${colors.textMuted};
  `,
  image: css`
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
  `,
  label: css`
    padding: 10px 12px;
    background-color: ${colors.surface};
    border-top: 1px solid ${colors.borderLight};
  `,
  labelRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  labelText: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    letter-spacing: -0.01em;
  `,
  size: css`
    font-size: ${fontSize.xs};
    color: ${colors.textMuted};
    margin: 2px 0 0 0;
  `,
  openBtn: css`
    flex-shrink: 0;
    height: 28px;
    font-size: ${fontSize.xs};
    font-weight: 500;
    color: ${colors.primary};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    padding: 0 10px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    
    &:hover {
      background-color: ${colors.primaryLight};
      border-color: ${colors.primary};
    }
  `,
  selectAllRow: css`
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: ${colors.surface};
    border-radius: 8px;
    border: 1px solid ${colors.border};
  `,
  selectAllLabel: css`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.textSecondary};
    cursor: pointer;
    
    &:hover {
      color: ${colors.text};
    }
  `,
  selectAllCheckbox: css`
    width: 16px;
    height: 16px;
    accent-color: ${colors.primary};
  `,
}

export function StudioFileGrid() {
  const { currentPath, setCurrentPath, navigateUp, selectedItems, toggleSelection, selectRange, lastSelectedPath, selectAll, clearSelection, refreshKey, setFocusedItem } = useStudio()
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

  const isAtRoot = currentPath === 'public'

  // Empty state only when truly empty (not counting parent folder)
  if (items.length === 0 && isAtRoot) {
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

  const handleItemClick = (item: FileItem, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedPath) {
      selectRange(lastSelectedPath, item.path, sortedItems)
    } else {
      toggleSelection(item.path)
    }
  }

  const handleOpen = (item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path)
    } else {
      setFocusedItem(item)
    }
  }

  const allItemsSelected = sortedItems.length > 0 && sortedItems.every(item => selectedItems.has(item.path))
  const someItemsSelected = sortedItems.some(item => selectedItems.has(item.path))

  const handleSelectAll = () => {
    if (allItemsSelected) {
      clearSelection()
    } else {
      selectAll(sortedItems)
    }
  }

  return (
    <div>
      {sortedItems.length > 0 && (
        <div css={styles.selectAllRow}>
          <label css={styles.selectAllLabel}>
            <input
              type="checkbox"
              css={styles.selectAllCheckbox}
              checked={allItemsSelected}
              ref={(el) => {
                if (el) el.indeterminate = someItemsSelected && !allItemsSelected
              }}
              onChange={handleSelectAll}
            />
            Select all ({sortedItems.length})
          </label>
        </div>
      )}
      <div css={styles.grid}>
        {/* Parent folder navigation */}
        {!isAtRoot && (
          <div 
            css={[styles.item, styles.parentItem]}
            onClick={navigateUp}
          >
            <div css={styles.content}>
              <svg css={styles.parentIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div css={styles.label}>
              <p css={styles.name}>..</p>
              <p css={styles.size}>Parent folder</p>
            </div>
          </div>
        )}
        
        {sortedItems.map((item) => (
          <GridItem
            key={item.path}
            item={item}
            isSelected={selectedItems.has(item.path)}
            onClick={(e) => handleItemClick(item, e)}
            onOpen={() => handleOpen(item)}
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
  onOpen: () => void
}

function GridItem({ item, isSelected, onClick, onOpen }: GridItemProps) {
  const isFolder = item.type === 'folder'

  return (
    <div 
      css={[styles.item, isSelected && styles.itemSelected]} 
      onClick={onClick}
    >
      <div
        css={styles.checkboxWrapper}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          css={styles.checkbox}
          checked={isSelected}
          onChange={() => onClick({} as React.MouseEvent)}
        />
      </div>

      {item.cdnSynced && <span css={styles.cdnBadge}>CDN</span>}

      <div css={styles.content}>
        {isFolder ? (
          <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
          </svg>
        ) : item.thumbnail ? (
          <img
            css={styles.image}
            src={item.thumbnail}
            alt={item.name}
            loading="lazy"
          />
        ) : (
          <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      <div css={styles.label}>
        <div css={styles.labelRow}>
          <div css={styles.labelText}>
            <p css={styles.name} title={item.name}>{item.name}</p>
            {isFolder ? (
              <p css={styles.size}>
                {item.fileCount !== undefined ? `${item.fileCount} files` : ''}
                {item.fileCount !== undefined && item.totalSize !== undefined ? ' · ' : ''}
                {item.totalSize !== undefined ? formatFileSize(item.totalSize) : ''}
              </p>
            ) : (
              item.size !== undefined && <p css={styles.size}>{formatFileSize(item.size)}</p>
            )}
          </div>
          <button
            css={styles.openBtn}
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
