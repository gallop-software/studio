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
    flex: 1;
    min-height: 300px;
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
    flex: 1;
    min-height: 300px;
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
    width: 18px;
    height: 18px;
    accent-color: ${colors.primary};
    cursor: pointer;
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
  statusBtn: css`
    position: absolute;
    top: 4px;
    right: 28px;
    z-index: 10;
    height: 28px;
    width: 28px;
    background: transparent;
    border: none;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  cloudIcon: css`
    width: 20px;
    height: 20px;
    color: #f59e0b;
    transform: translateY(1px);
  `,
  folderStats: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 2px 0 0 0;
  `,
  folderStat: css`
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: ${fontSize.xs};
  `,
  folderStatLocal: css`
    color: ${colors.textMuted};
  `,
  folderStatCloud: css`
    color: #f59e0b;
  `,
  folderStatRemote: css`
    color: #ef4444;
  `,
  folderStatUpdate: css`
    color: #f59e0b;
  `,
  folderStatIcon: css`
    width: 14px;
    height: 14px;
  `,
  folderStatIconCloud: css`
    width: 14px;
    height: 14px;
    color: #f59e0b;
  `,
  folderStatIconLocal: css`
    width: 14px;
    height: 14px;
    color: ${colors.textSecondary};
  `,
  folderStatIconRemote: css`
    width: 14px;
    height: 14px;
    color: #ef4444;
  `,
  folderStatIconUpdate: css`
    width: 14px;
    height: 14px;
    color: #f59e0b;
  `,
  updateLabel: css`
    color: #f59e0b;
    font-size: ${fontSize.xs};
  `,
  updateCloudIcon: css`
    width: 14px;
    height: 14px;
    color: #f59e0b;
  `,
  updateSyncIcon: css`
    width: 14px;
    height: 14px;
    color: #f59e0b;
  `,
  storedLabel: css`
    display: flex;
    align-items: center;
    margin: 2px 0 0 0;
  `,
  statusRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 2px 0 0 0;
    gap: 4px;
  `,
  statusLeft: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  thumbChips: css`
    display: flex;
    align-items: center;
    gap: 3px;
    margin-left: auto;
  `,
  thumbChip: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px 4px;
    font-size: 9px;
    font-weight: 600;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.08);
    color: ${colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.02em;
  `,
  storedIconCloud: css`
    width: 16px;
    height: 16px;
    color: #f59e0b;
  `,
  storedIconRemote: css`
    width: 16px;
    height: 16px;
    color: #ef4444;
  `,
  globeIcon: css`
    width: 18px;
    height: 18px;
    color: #ef4444;
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
    direction: rtl;
    text-align: left;
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
    triggerScan,
  } = useFileList()

  if (loading) {
    return (
      <div css={styles.loading}>
        <div css={styles.spinner} />
      </div>
    )
  }

  // Show scan prompt when meta is empty
  if (metaEmpty && isAtRoot) {
    return (
      <div css={styles.empty}>
        <svg css={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p css={styles.emptyText}>No files tracked yet</p>
        <p css={styles.emptyText}>Click Scan to discover files in your public folder</p>
        <button 
          css={styles.scanButton}
          onClick={triggerScan}
        >
          Scan for Files
        </button>
      </div>
    )
  }

  if (sortedItems.length === 0 && isAtRoot) {
    return (
      <div css={styles.empty}>
        <svg css={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p css={styles.emptyText}>No files in this folder</p>
        <p css={styles.emptyText}>Upload images or click Scan in the toolbar</p>
      </div>
    )
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
        {/* Parent folder navigation - hide when searching */}
        {!isAtRoot && !isSearching && (
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

// Detect if an image is a thumbnail itself (in /images/sm/, /images/md/, etc.)
function getThumbnailSizeFromPath(path: string): string | null {
  if (path.includes('/images/sm/')) return 'SM'
  if (path.includes('/images/md/')) return 'MD'
  if (path.includes('/images/lg/')) return 'LG'
  if (path.includes('/images/full/')) return 'FULL'
  return null
}

function GridItem({ item, isSelected, onClick, onOpen, onGenerateThumbnail }: GridItemProps) {
  const [showCopied, setShowCopied] = useState(false)
  const isFolder = item.type === 'folder'
  const isImage = !isFolder && item.thumbnail !== undefined
  const isProtected = item.isProtected || (isFolder && item.name === 'images' && item.path === 'public/images')
  
  // Check if this image is in a thumbnail folder (e.g., /images/sm/, /images/md/)
  const thumbnailSize = getThumbnailSizeFromPath(item.path)
  
  // Determine which chips to show
  const showChips = !isFolder && (item.hasSm || item.hasMd || item.hasLg || item.hasFull || thumbnailSize)

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation()
    const pathToCopy = '/' + item.path.replace(/^public\//, '')
    navigator.clipboard.writeText(pathToCopy)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1500)
  }

  const handleClick = (e: React.MouseEvent) => {
    // Protected items cannot be selected, only opened
    if (isProtected) {
      e.stopPropagation()
      onOpen()
      return
    }
    onClick(e)
  }

  return (
    <div 
      css={[styles.item, isSelected && !isProtected && styles.itemSelected]} 
      onClick={handleClick}
    >
      {!isProtected && (
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
      )}


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
          isProtected ? (
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
        ) : isImage && item.thumbnail ? (
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
              <div css={styles.folderStats}>
                {item.localCount !== undefined && item.localCount > 0 && (
                  <span css={[styles.folderStat, styles.folderStatLocal]} title={`${item.localCount} local`}>
                    <svg css={styles.folderStatIconLocal} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {item.localCount}
                  </span>
                )}
                {item.cloudCount !== undefined && item.cloudCount > 0 && (
                  <span css={[styles.folderStat, styles.folderStatCloud]} title={`${item.cloudCount} in cloud`}>
                    <svg css={styles.folderStatIconCloud} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    {item.cloudCount}
                  </span>
                )}
                {item.remoteCount !== undefined && item.remoteCount > 0 && (
                  <span css={[styles.folderStat, styles.folderStatRemote]} title={`${item.remoteCount} remote`}>
                    <svg css={styles.folderStatIconRemote} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {item.remoteCount}
                  </span>
                )}
                {item.updateCount !== undefined && item.updateCount > 0 && (
                  <span css={[styles.folderStat, styles.folderStatUpdate]} title={`${item.updateCount} pending update${item.updateCount !== 1 ? 's' : ''}`}>
                    <svg css={styles.folderStatIconUpdate} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {item.updateCount}
                  </span>
                )}
                {!item.localCount && !item.cloudCount && !item.remoteCount && !item.updateCount && item.fileCount !== undefined && (
                  <span css={styles.size}>{item.fileCount} files</span>
                )}
              </div>
            ) : (
              <div css={styles.statusRow}>
                <div css={styles.statusLeft}>
                  {item.hasUpdate ? (
                    <>
                      <svg css={styles.updateCloudIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                      <svg css={styles.updateSyncIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span css={styles.updateLabel}>update</span>
                    </>
                  ) : item.cdnPushed ? (
                    <svg css={item.isRemote ? styles.storedIconRemote : styles.storedIconCloud} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.isRemote ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      )}
                    </svg>
                  ) : item.size !== undefined ? (
                    <span css={styles.size}>{formatFileSize(item.size)}</span>
                  ) : null}
                </div>
                {showChips && (
                  <span css={styles.thumbChips}>
                    {thumbnailSize ? (
                      <span css={styles.thumbChip}>{thumbnailSize}</span>
                    ) : (
                      <>
                        {item.hasSm && <span css={styles.thumbChip}>SM</span>}
                        {item.hasMd && <span css={styles.thumbChip}>MD</span>}
                        {item.hasLg && <span css={styles.thumbChip}>LG</span>}
                        {item.hasFull && <span css={styles.thumbChip}>FULL</span>}
                      </>
                    )}
                  </span>
                )}
              </div>
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

