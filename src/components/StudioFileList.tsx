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
  checkbox: css`
    width: 16px;
    height: 16px;
    accent-color: #9333ea;
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
    <table css={styles.table}>
      <thead>
        <tr>
          <th css={[styles.th, styles.thCheckbox]}>
            {files.length > 0 && (
              <input
                type="checkbox"
                css={styles.checkbox}
                checked={allFilesSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someFilesSelected && !allFilesSelected
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
}

function ListRow({ item, isSelected, onClick }: ListRowProps) {
  const isFolder = item.type === 'folder'

  return (
    <tr css={[styles.row, isSelected && styles.rowSelected]} onClick={onClick}>
      <td css={styles.td}>
        {/* Only show checkbox for files, not folders */}
        {!isFolder && (
          <input
            type="checkbox"
            css={styles.checkbox}
            checked={isSelected}
            onChange={() => {}}
            onClick={(e) => {
              e.stopPropagation()
              // Trigger the same click handler as the row
              onClick(e as unknown as React.MouseEvent)
            }}
          />
        )}
      </td>
      <td css={styles.td}>
        <div css={styles.nameCell}>
          {isFolder ? (
            <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
            </svg>
          ) : (
            <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <span css={styles.name}>{item.name}</span>
        </div>
      </td>
      <td css={[styles.td, styles.meta]}>
        {item.size ? formatFileSize(item.size) : '--'}
      </td>
      <td css={[styles.td, styles.meta]}>
        {item.dimensions ? `${item.dimensions.width}x${item.dimensions.height}` : '--'}
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
