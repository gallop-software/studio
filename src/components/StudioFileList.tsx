/** @jsxImportSource @emotion/react */
'use client'

import { useEffect, useState, useRef } from 'react'
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
  tableWrapper: css`
    background: ${colors.surface};
    border-radius: 8px;
    border: 1px solid ${colors.border};
    overflow: hidden;
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
  `,
  th: css`
    text-align: left;
    font-size: 11px;
    color: ${colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 12px 16px;
    font-weight: 600;
    background: ${colors.background};
    border-bottom: 1px solid ${colors.border};
  `,
  thCheckbox: css`
    width: 48px;
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
  tbody: css``,
  row: css`
    cursor: pointer;
    transition: background-color 0.15s ease;
    user-select: none;
    
    &:hover {
      background-color: ${colors.surfaceHover};
    }
    
    &:not(:last-child) td {
      border-bottom: 1px solid ${colors.borderLight};
    }
  `,
  rowSelected: css`
    background-color: ${colors.primaryLight};
    
    &:hover {
      background-color: ${colors.primaryLight};
    }
  `,
  parentRow: css`
    cursor: pointer;
    
    &:hover {
      background-color: ${colors.surfaceHover};
    }
  `,
  td: css`
    padding: 12px 16px;
  `,
  checkboxCell: css`
    padding: 12px 16px;
    cursor: pointer;
  `,
  checkbox: css`
    width: 16px;
    height: 16px;
    accent-color: ${colors.primary};
    cursor: pointer;
  `,
  nameCell: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  folderIcon: css`
    width: 20px;
    height: 20px;
    color: #f5a623;
    flex-shrink: 0;
  `,
  parentIcon: css`
    width: 20px;
    height: 20px;
    color: ${colors.textMuted};
    flex-shrink: 0;
  `,
  fileIcon: css`
    width: 20px;
    height: 20px;
    color: ${colors.textMuted};
    flex-shrink: 0;
  `,
  thumbnail: css`
    width: 36px;
    height: 36px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
    border: 1px solid ${colors.borderLight};
  `,
  name: css`
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
    letter-spacing: -0.01em;
  `,
  meta: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
  `,
  cdnBadge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${fontSize.xs};
    font-weight: 500;
    color: ${colors.success};
  `,
  cdnIcon: css`
    width: 12px;
    height: 12px;
  `,
  cdnEmpty: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
  `,
  openBtn: css`
    height: 28px;
    font-size: ${fontSize.xs};
    font-weight: 500;
    color: ${colors.primary};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    padding: 0 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    margin-left: auto;
    
    &:hover {
      background-color: ${colors.primaryLight};
      border-color: ${colors.primary};
    }
  `,
}

export function StudioFileList() {
  const { currentPath, setCurrentPath, navigateUp, selectedItems, toggleSelection, selectRange, lastSelectedPath, selectAll, clearSelection, refreshKey, setFocusedItem } = useStudio()
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const isInitialLoad = useRef(true)
  const lastPath = useRef(currentPath)

  useEffect(() => {
    async function loadItems() {
      // Only show loading spinner on initial load or path change, not on refresh
      const isPathChange = lastPath.current !== currentPath
      if (isInitialLoad.current || isPathChange) {
        setLoading(true)
      }
      lastPath.current = currentPath
      
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
      isInitialLoad.current = false
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

  if (items.length === 0 && isAtRoot) {
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
    <div css={styles.tableWrapper}>
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
          {/* Parent folder navigation */}
          {!isAtRoot && (
            <tr css={styles.parentRow} onClick={navigateUp}>
              <td css={styles.td}></td>
              <td css={styles.td}>
                <div css={styles.nameCell}>
                  <svg css={styles.parentIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span css={styles.name}>..</span>
                </div>
              </td>
              <td css={[styles.td, styles.meta]}>--</td>
              <td css={[styles.td, styles.meta]}>Parent folder</td>
              <td css={styles.td}>--</td>
            </tr>
          )}
          
          {sortedItems.map((item) => (
            <ListRow
              key={item.path}
              item={item}
              isSelected={selectedItems.has(item.path)}
              onClick={(e) => handleItemClick(item, e)}
              onOpen={() => handleOpen(item)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ListRowProps {
  item: FileItem
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onOpen: () => void
}

function ListRow({ item, isSelected, onClick, onOpen }: ListRowProps) {
  const isFolder = item.type === 'folder'

  return (
    <tr 
      css={[styles.row, isSelected && styles.rowSelected]} 
      onClick={onClick}
    >
      <td
        css={[styles.td, styles.checkboxCell]}
        onClick={(e) => e.stopPropagation()}
      >
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
          <span css={styles.name} title={item.name}>{truncateMiddle(item.name)}</span>
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

function truncateMiddle(str: string, maxLength: number = 32): string {
  if (str.length <= maxLength) return str
  
  // Find the extension
  const lastDot = str.lastIndexOf('.')
  const ext = lastDot > 0 ? str.substring(lastDot) : ''
  const name = lastDot > 0 ? str.substring(0, lastDot) : str
  
  // Calculate how much we can show of the name
  const availableLength = maxLength - ext.length - 3 // 3 for "..."
  if (availableLength < 6) {
    // Too short, just truncate from end
    return str.substring(0, maxLength - 3) + '...'
  }
  
  const startLength = Math.ceil(availableLength / 2)
  const endLength = Math.floor(availableLength / 2)
  
  return name.substring(0, startLength) + '...' + name.substring(name.length - endLength) + ext
}
