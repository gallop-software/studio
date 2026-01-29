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
  table: css`
    width: 100%;
    border-collapse: collapse;
  `,
  th: css`
    text-align: left;
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-bottom: 8px;
    font-weight: normal;
  `,
  thCheckbox: css`
    width: 32px;
  `,
  thSize: css`
    width: 96px;
  `,
  thDimensions: css`
    width: 128px;
  `,
  thCdn: css`
    width: 96px;
  `,
  tbody: css`
    border-top: 1px solid #f3f4f6;
  `,
  row: css`
    cursor: pointer;
    transition: background-color 0.15s;
    user-select: none;
    
    &:hover {
      background-color: #f9fafb;
    }
  `,
  rowSelected: css`
    background-color: #faf5ff;
    
    &:hover {
      background-color: #faf5ff;
    }
  `,
  td: css`
    padding: 8px 0;
    border-bottom: 1px solid #f3f4f6;
  `,
  checkboxCell: css`
    padding: 8px 12px;
    cursor: pointer;
  `,
  checkbox: css`
    width: 16px;
    height: 16px;
    accent-color: #9333ea;
    cursor: pointer;
  `,
  nameCell: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  folderIcon: css`
    width: 20px;
    height: 20px;
    color: #facc15;
  `,
  fileIcon: css`
    width: 20px;
    height: 20px;
    color: #9ca3af;
  `,
  thumbnail: css`
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  `,
  name: css`
    font-size: 14px;
    color: #111827;
  `,
  meta: css`
    font-size: 14px;
    color: #6b7280;
  `,
  cdnBadge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #15803d;
  `,
  cdnIcon: css`
    width: 12px;
    height: 12px;
  `,
  cdnEmpty: css`
    font-size: 12px;
    color: #9ca3af;
  `,
}

export function StudioFileList() {
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
        <p>No files in this folder</p>
      </div>
    )
  }

  const sortedItems = [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name)
  })

  const handleItemClick = (item: FileItem, e: React.MouseEvent) => {
    // For both files and folders, clicking toggles selection
    if (e.shiftKey && lastSelectedPath) {
      selectRange(lastSelectedPath, item.path, sortedItems)
    } else {
      toggleSelection(item.path)
    }
  }

  const handleItemDoubleClick = (item: FileItem) => {
    // Double-click on folder navigates into it
    if (item.type === 'folder') {
      setCurrentPath(item.path)
    }
  }

  // Count all items for select all (now includes folders)
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
    <table css={styles.table}>
      <thead>
        <tr>
          <th css={[styles.th, styles.thCheckbox]}>
            {sortedItems.length > 0 && (
              <input
                type="checkbox"
                css={styles.checkbox}
                checked={allItemsSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someItemsSelected && !allItemsSelected
                }}
                onChange={handleSelectAll}
              />
            )}
          </th>
          <th css={styles.th}>Name</th>
          <th css={[styles.th, styles.thSize]}>Size</th>
          <th css={[styles.th, styles.thDimensions]}>Dimensions</th>
          <th css={[styles.th, styles.thCdn]}>CDN</th>
        </tr>
      </thead>
      <tbody css={styles.tbody}>
        {sortedItems.map((item) => (
          <ListRow
            key={item.path}
            item={item}
            isSelected={selectedItems.has(item.path)}
            onClick={(e) => handleItemClick(item, e)}
            onDoubleClick={() => handleItemDoubleClick(item)}
          />
        ))}
      </tbody>
    </table>
  )
}

interface ListRowProps {
  item: FileItem
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}

function ListRow({ item, isSelected, onClick, onDoubleClick }: ListRowProps) {
  const isFolder = item.type === 'folder'

  return (
    <tr 
      css={[styles.row, isSelected && styles.rowSelected]} 
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <td
        css={[styles.td, styles.checkboxCell]}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Show checkbox for both files and folders */}
        <input
          type="checkbox"
          css={styles.checkbox}
          checked={isSelected}
          onChange={() => onClick({} as React.MouseEvent)}
        />
      </td>
      <td css={styles.td}>
        <div css={styles.nameCell}>
          {isFolder ? (
            <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
            </svg>
          ) : item.thumbnail ? (
            <img css={styles.thumbnail} src={item.thumbnail} alt={item.name} loading="lazy" />
          ) : (
            <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
          <span css={styles.name}>{item.name}</span>
        </div>
      </td>
      <td css={[styles.td, styles.meta]}>
        {isFolder 
          ? (item.fileCount !== undefined ? `${item.fileCount} files` : '--')
          : (item.size !== undefined ? formatFileSize(item.size) : '--')
        }
      </td>
      <td css={[styles.td, styles.meta]}>
        {isFolder 
          ? (item.totalSize !== undefined ? formatFileSize(item.totalSize) : '--')
          : (item.dimensions ? `${item.dimensions.width}x${item.dimensions.height}` : '--')
        }
      </td>
      <td css={styles.td}>
        {item.cdnSynced ? (
          <span css={styles.cdnBadge}>
            <svg css={styles.cdnIcon} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Synced
          </span>
        ) : (
          <span css={styles.cdnEmpty}>--</span>
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
