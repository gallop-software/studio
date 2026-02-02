/** @jsxImportSource @emotion/react */
'use client'

import { useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { useFileList } from '../hooks/useFileList'
import { ProgressModal, type ProgressState } from './StudioModal'
import { FeaturedImageModal } from './FeaturedImageModal'
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
  statusBtn: css`
    flex-shrink: 0;
    height: 32px;
    width: 32px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    padding: 0;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
  cloudIcon: css`
    width: 18px;
    height: 18px;
    color: #f59e0b;
    transform: translateY(1px);
  `,
  folderStats: css`
    display: flex;
    align-items: center;
    gap: 8px;
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
    display: flex;
    align-items: center;
    gap: 4px;
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
    width: 16px;
    height: 16px;
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
    border-radius: 4px;
  `,
  thumbnailCloud: css`
    background: #fff7ed;
  `,
  thumbnailRemote: css`
    background: #fef2f2;
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
  cdnBadgeRemote: css`
    display: inline-flex;
    align-items: center;
    font-size: ${fontSize.xs};
    font-weight: 500;
    color: #ef4444;
  `,
  cdnIcon: css`
    width: 12px;
    height: 12px;
  `,
  cdnEmpty: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
  `,
  featuredRow: css`
    cursor: pointer;
    transition: background-color 0.15s ease;
    border: 2px dashed ${colors.primary};
    
    &:hover {
      background-color: rgba(99, 102, 241, 0.08);
    }
    
    td {
      border-bottom: none !important;
    }
  `,
  featuredIcon: css`
    width: 24px;
    height: 24px;
    color: ${colors.primary};
  `,
  featuredText: css`
    color: ${colors.primary};
    font-weight: 500;
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
    missingFeaturedImage,
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
    triggerRefresh,
  } = useFileList()

  const [showFeaturedModal, setShowFeaturedModal] = useState(false)
  const [showFeaturedProgress, setShowFeaturedProgress] = useState(false)
  const [featuredProgress, setFeaturedProgress] = useState<ProgressState>({
    current: 0,
    total: 3,
    percent: 0,
    status: 'processing',
    message: 'Generating featured image...',
  })

  const handleOpenFeaturedModal = () => {
    setShowFeaturedModal(true)
  }

  const handleGenerateFeaturedImage = async (url: string) => {
    setShowFeaturedModal(false)
    setShowFeaturedProgress(true)
    setFeaturedProgress({
      current: 0,
      total: 4,
      percent: 0,
      status: 'processing',
      message: 'Starting...',
    })

    try {
      const response = await fetch('/api/studio/generate-featured-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const error = await response.json()
        setFeaturedProgress({
          current: 0,
          total: 4,
          percent: 0,
          status: 'error',
          message: error.error || 'Failed to generate featured image',
        })
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'start') {
                  setFeaturedProgress(prev => ({
                    ...prev,
                    total: data.total,
                    message: `Screenshotting ${data.url}...`,
                  }))
                } else if (data.type === 'progress') {
                  setFeaturedProgress({
                    current: data.current,
                    total: data.total,
                    percent: data.percent,
                    status: 'processing',
                    message: data.message,
                  })
                } else if (data.type === 'complete') {
                  setFeaturedProgress({
                    current: data.processed,
                    total: data.processed,
                    percent: 100,
                    status: data.errors > 0 ? 'error' : 'complete',
                    message: data.message,
                  })
                  triggerRefresh()
                } else if (data.type === 'error') {
                  setFeaturedProgress(prev => ({
                    ...prev,
                    status: 'error',
                    message: data.message,
                  }))
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }
    } catch (error) {
      console.error('Featured image generation error:', error)
      setFeaturedProgress({
        current: 0,
        total: 3,
        percent: 0,
        status: 'error',
        message: 'An error occurred while generating the featured image',
      })
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
        <p>No files in this folder</p>
        <p css={styles.emptyHint}>Upload images or click Scan in the toolbar</p>
      </div>
    )
  }

  return (
    <>
      <FeaturedImageModal
        isOpen={showFeaturedModal}
        onClose={() => setShowFeaturedModal(false)}
        onSelect={handleGenerateFeaturedImage}
      />
      {showFeaturedProgress && (
        <ProgressModal
          title="Generating Featured Image"
          progress={featuredProgress}
          onClose={() => setShowFeaturedProgress(false)}
        />
      )}
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

            {/* Featured image placeholder - show at end when missing */}
            {isAtRoot && missingFeaturedImage && !isSearching && (
              <tr
                css={styles.featuredRow}
                onClick={handleOpenFeaturedModal}
                title={`Generate ${missingFeaturedImage.filename}`}
              >
                <td css={styles.td}></td>
                <td css={styles.td}>
                  <div css={styles.nameCell}>
                    <div css={styles.folderIconWrapper}>
                      <svg css={styles.featuredIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span css={[styles.name, styles.featuredText]}>{missingFeaturedImage.filename}</span>
                  </div>
                </td>
                <td css={[styles.td, styles.meta, styles.featuredText]}>--</td>
                <td css={[styles.td, styles.meta, styles.featuredText]}>Click to generate</td>
                <td css={[styles.td, styles.featuredText]}>--</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
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
  const isProtected = item.isProtected || (isFolder && item.name === 'images' && item.path === 'public/images')

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
    <tr
      css={[styles.row, isSelected && !isProtected && styles.rowSelected]}
      onClick={handleClick}
    >
      <td
        css={[styles.td, styles.checkboxCell]}
        onClick={(e) => e.stopPropagation()}
      >
        {!isProtected && (
          <input
            type="checkbox"
            css={styles.checkbox}
            checked={isSelected}
            onChange={() => onClick({} as React.MouseEvent)}
          />
        )}
      </td>
      <td css={styles.td}>
        <div css={styles.nameCell}>
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
              <div css={styles.folderIconWrapper}>
                <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
                </svg>
              </div>
            )
          ) : isImage && item.thumbnail ? (
            <div css={[styles.thumbnailWrapper, item.isCloud && styles.thumbnailCloud, item.isRemote && styles.thumbnailRemote]}>
              <img css={styles.thumbnail} src={item.thumbnail} alt={item.name} loading="lazy" />
            </div>
          ) : (
            <div css={[styles.thumbnailWrapper, item.isCloud && styles.thumbnailCloud, item.isRemote && styles.thumbnailRemote]}>
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
              <span>{item.fileCount} files</span>
            )}
            {!item.localCount && !item.cloudCount && !item.remoteCount && !item.updateCount && item.fileCount === undefined && '--'}
          </div>
        ) : item.hasUpdate ? (
          <span css={styles.updateLabel}>
            <svg css={styles.updateCloudIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            <svg css={styles.updateSyncIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            update
          </span>
        ) : item.cdnPushed ? (
          <span css={styles.storedLabel}>
            <svg css={item.isRemote ? styles.storedIconRemote : styles.storedIconCloud} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {item.isRemote ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              )}
            </svg>
          </span>
        ) : (
          item.size !== undefined ? formatFileSize(item.size) : '--'
        )}
      </td>
      <td css={[styles.td, styles.meta]}>
        {isFolder
          ? (item.totalSize !== undefined ? formatFileSize(item.totalSize) : '--')
          : (item.dimensions ? `${item.dimensions.width}x${item.dimensions.height}` : '--')
        }
      </td>
      <td css={styles.td}>
        {item.cdnPushed ? (
          item.isRemote ? (
            <span css={styles.cdnBadgeRemote}>Remote</span>
          ) : (
            <span css={styles.cdnBadge}>
              <svg css={styles.cdnIcon} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Pushed
            </span>
          )
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
