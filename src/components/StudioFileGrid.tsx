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
    grid-template-columns: 1fr;
    gap: 12px;
    
    @media (min-width: 480px) { grid-template-columns: repeat(2, 1fr); }
    @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
    @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
    @media (min-width: 1280px) { grid-template-columns: repeat(5, 1fr); }
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
      box-shadow: 0 0 0 1px ${colors.primary};
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
    position: relative;
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
    color: #f9935e;
  `,
  imagesFolderIcon: css`
    width: 56px;
    height: 56px;
    color: ${colors.imagesFolder};
  `,
  imagesFolderWrapper: css`
    position: relative;
  `,
  lockIcon: css`
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 16px;
    height: 16px;
    color: ${colors.imagesFolder};
    background: white;
    border-radius: 50%;
    padding: 2px;
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
  noThumbnail: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    background: ${colors.background};
    border: 2px dashed ${colors.border};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    width: 80%;
    height: 60%;
    
    &:hover {
      border-color: ${colors.primary};
      background: ${colors.surfaceHover};
    }
  `,
  noThumbnailIcon: css`
    width: 32px;
    height: 32px;
    color: ${colors.textMuted};
  `,
  noThumbnailText: css`
    font-size: ${fontSize.xs};
    color: ${colors.textMuted};
    text-align: center;
  `,
  label: css`
    padding: 10px 12px;
    background-color: ${colors.surface};
    border-top: 1px solid ${colors.borderLight};
  `,
  labelRow: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  labelText: css`
    flex: 1;
    min-width: 0;
  `,
  copyBtn: css`
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 10;
    height: 28px;
    width: 28px;
    color: ${colors.textMuted};
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      color: ${colors.text};
    }
  `,
  copyIcon: css`
    width: 18px;
    height: 18px;
  `,
  tooltip: css`
    position: absolute;
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    background: #1a1f36;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    margin-right: 6px;
    pointer-events: none;
    z-index: 100;
    
    &::before {
      content: '';
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 4px solid transparent;
      border-left-color: #1a1f36;
    }
  `,
  openBtn: css`
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 10;
    height: 28px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.primary};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    padding: 0 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    
    &:hover {
      background-color: ${colors.primaryLight};
      border-color: ${colors.primary};
    }
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
  const { currentPath, setCurrentPath, navigateUp, selectedItems, toggleSelection, selectRange, lastSelectedPath, selectAll, clearSelection, refreshKey, setFocusedItem, triggerRefresh, searchQuery } = useStudio()
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

  // Filter by search query (only images, requires 2+ characters)
  const filteredItems = searchQuery && searchQuery.length >= 2
    ? items.filter(item => {
        if (item.type === 'folder') return false // Hide folders when searching
        const query = searchQuery.toLowerCase()
        return item.path.toLowerCase().includes(query)
      })
    : items

  const sortedItems = [...filteredItems].sort((a, b) => {
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

  const handleGenerateThumbnail = async (item: FileItem) => {
    try {
      const imageKey = item.path.replace(/^public\//, '')
      await fetch('/api/studio/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageKeys: [imageKey] }),
      })
      triggerRefresh()
    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
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
            onGenerateThumbnail={() => handleGenerateThumbnail(item)}
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
  onGenerateThumbnail: () => void
}

function GridItem({ item, isSelected, onClick, onOpen, onGenerateThumbnail }: GridItemProps) {
  const [showCopied, setShowCopied] = useState(false)
  const isFolder = item.type === 'folder'
  const isImage = !isFolder && item.thumbnail !== undefined
  const isImagesFolder = isFolder && (item.name === 'images' || item.path.includes('/images/'))

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation()
    const pathToCopy = '/' + item.path
    navigator.clipboard.writeText(pathToCopy)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1500)
  }

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
        {/* Copy button - top right of image box */}
        <button
          css={styles.copyBtn}
          onClick={handleCopyPath}
          title="Copy file path"
        >
          {showCopied && <span css={styles.tooltip}>Copied!</span>}
          <svg css={styles.copyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        {/* Open button - bottom right of image box */}
        <button
          css={styles.openBtn}
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
        >
          Open
        </button>

        {isFolder ? (
          isImagesFolder ? (
            <div css={styles.imagesFolderWrapper}>
              <svg css={styles.imagesFolderIcon} fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
              </svg>
              <svg css={styles.lockIcon} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
            </svg>
          )
        ) : isImage && item.hasThumbnail ? (
          <img
            css={styles.image}
            src={item.thumbnail}
            alt={item.name}
            loading="lazy"
          />
        ) : isImage && !item.hasThumbnail ? (
          <button 
            css={styles.noThumbnail}
            onClick={(e) => { e.stopPropagation(); onGenerateThumbnail(); }}
            title="Generate thumbnail"
          >
            <svg css={styles.noThumbnailIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span css={styles.noThumbnailText}>Generate</span>
          </button>
        ) : (
          <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      <div css={styles.label}>
        <div css={styles.labelRow}>
          <div css={styles.labelText}>
            <p css={styles.name} title={item.name}>{truncateMiddle(item.name)}</p>
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

function getParentPath(path: string): string {
  const parts = path.split('/')
  parts.pop() // Remove current folder
  return parts.join('/') + '/'
}

function truncateMiddle(str: string, maxLength: number = 24): string {
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
