/** @jsxImportSource @emotion/react */
'use client'

import { useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { useFileList } from '../hooks/useFileList'
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
  emptyHint: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
    margin-top: 4px;
  `,
  scanButton: css`
    margin-top: 16px;
    padding: 10px 24px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.primary};
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease;
    
    &:hover:not(:disabled) {
      background: ${colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
  tableWrapper: css`
    background: ${colors.surface};
    border-radius: 8px;
    border: 1px solid ${colors.border};
    overflow-x: auto;
  `,
  table: css`
    width: 100%;
    min-width: 600px;
    border-collapse: collapse;
    white-space: nowrap;
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
    border-bottom: 1px solid ${colors.border};
    
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
    vertical-align: middle;
  `,
  checkbox: css`
    width: 18px;
    height: 18px;
    accent-color: ${colors.primary};
    cursor: pointer;
    display: block;
  `,
  actionsCell: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-left: auto;
    flex-shrink: 0;
  `,
  copyBtn: css`
    position: relative;
    flex-shrink: 0;
    height: 32px;
    width: 32px;
    font-size: ${fontSize.xs};
    color: ${colors.textSecondary};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
      color: ${colors.text};
    }
  `,
  copyIcon: css`
    width: 16px;
    height: 16px;
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
    
    &::after {
      content: '';
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 4px solid transparent;
      border-left-color: #1a1f36;
    }
  `,
  nameCell: css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  `,
  thumbnailWrapper: css`
    width: 48px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `,
  folderIconWrapper: css`
    width: 48px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `,
  folderIcon: css`
    width: 24px;
    height: 24px;
    color: #f9935e;
  `,
  imagesFolderWrapper: css`
    width: 48px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    align-items: center;
  `,
  imagesFolderIcon: css`
    width: 24px;
    height: 24px;
    color: ${colors.imagesFolder};
  `,
  lockIcon: css`
    width: 10px;
    height: 10px;
    color: ${colors.imagesFolder};
    margin-left: -6px;
    margin-top: 8px;
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
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 4px;
    border: 1px solid ${colors.borderLight};
  `,
  noThumbnail: css`
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${colors.background};
    border: 1px dashed ${colors.border};
    border-radius: 4px;
    flex-shrink: 0;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      border-color: ${colors.primary};
      background: ${colors.surfaceHover};
    }
  `,
  noThumbnailIcon: css`
    width: 16px;
    height: 16px;
    color: ${colors.textMuted};
  `,
  name: css`
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
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
    height: 32px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.primary};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    padding: 0 14px;
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
}

export function StudioFileList() {
  const {
    loading,
    sortedItems,
    metaEmpty,
    isAtRoot,
    isSearching,
    allItemsSelected,
    someItemsSelected,
    selectedItems,
    navigateUp,
    handleItemClick,
    handleOpen,
    handleGenerateThumbnail,
    handleSelectAll,
  } = useFileList()
  
  const [scanning, setScanning] = useState(false)
  
  const handleScan = async () => {
    setScanning(true)
    try {
      await fetch('/api/studio/scan', { method: 'POST' })
      window.location.reload()
    } catch (error) {
      console.error('Scan failed:', error)
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div css={styles.loading}>
        <div css={styles.spinner} />
      </div>
    )
  }

  if (metaEmpty && isAtRoot) {
    return (
      <div css={styles.empty}>
        <p>No files tracked yet</p>
        <p css={styles.emptyHint}>Click Scan to discover files in your public folder</p>
        <button 
          css={styles.scanButton}
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? 'Scanning...' : 'Scan for Files'}
        </button>
      </div>
    )
  }

  if (sortedItems.length === 0 && isAtRoot) {
    return (
      <div css={styles.empty}>
        <p>No files in this folder</p>
        <p css={styles.emptyHint}>Upload images or click Scan in the toolbar</p>
      </div>
    )
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
          {/* Parent folder navigation - hide when searching */}
          {!isAtRoot && !isSearching && (
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
              onGenerateThumbnail={() => handleGenerateThumbnail(item)}
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
  onGenerateThumbnail: () => void
}

function ListRow({ item, isSelected, onClick, onOpen, onGenerateThumbnail }: ListRowProps) {
  const [showCopied, setShowCopied] = useState(false)
  const isFolder = item.type === 'folder'
  const isImage = !isFolder && item.thumbnail !== undefined
  const isImagesFolder = isFolder && (item.name === 'images' || item.path.includes('/images/'))

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation()
    const pathToCopy = '/' + item.path.replace(/^public\//, '')
    navigator.clipboard.writeText(pathToCopy)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1500)
  }

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
              <div css={styles.folderIconWrapper}>
                <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
                </svg>
              </div>
            )
          ) : isImage && item.hasThumbnail ? (
            <div css={styles.thumbnailWrapper}>
              <img css={styles.thumbnail} src={item.thumbnail} alt={item.name} loading="lazy" />
            </div>
          ) : isImage && !item.hasThumbnail ? (
            <div css={styles.thumbnailWrapper}>
              <button 
                css={styles.noThumbnail} 
                onClick={(e) => { e.stopPropagation(); onGenerateThumbnail(); }}
                title="Generate thumbnail"
              >
                <svg css={styles.noThumbnailIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          ) : (
            <div css={styles.thumbnailWrapper}>
              <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <span css={styles.name} title={item.name}>{truncateMiddle(item.name)}</span>
          <div css={styles.actionsCell}>
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

function getParentPath(path: string): string {
  const parts = path.split('/')
  parts.pop() // Remove current folder
  return parts.join('/') + '/'
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
