/** @jsxImportSource @emotion/react */
'use client'

import { useState } from 'react'
import { css } from '@emotion/react'
import { useStudio } from './StudioContext'
import { ConfirmModal, AlertModal } from './StudioModal'
import { colors, fontSize } from './tokens'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.tif']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v']

function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return IMAGE_EXTENSIONS.includes(ext)
}

function isVideoFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return VIDEO_EXTENSIONS.includes(ext)
}

const styles = {
  overlay: css`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    display: flex;
    background: transparent;
  `,
  container: css`
    display: flex;
    flex: 1;
    margin: 24px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  `,
  main: css`
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: ${colors.background};
    overflow: auto;
  `,
  headerButtons: css`
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
    z-index: 10;
  `,
  copyBtn: css`
    position: relative;
    padding: 8px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  copyIcon: css`
    width: 20px;
    height: 20px;
    color: ${colors.textSecondary};
  `,
  tooltip: css`
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    background: #1a1f36;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    margin-right: 8px;
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
  mainCloseBtn: css`
    padding: 8px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  mainCloseIcon: css`
    width: 20px;
    height: 20px;
    color: ${colors.textSecondary};
  `,
  mediaWrapper: css`
    max-width: 100%;
    max-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  image: css`
    max-width: 100%;
    max-height: calc(100vh - 200px);
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  `,
  video: css`
    max-width: 100%;
    max-height: calc(100vh - 200px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  `,
  filePlaceholder: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px;
    background: ${colors.surface};
    border-radius: 12px;
    border: 1px solid ${colors.border};
  `,
  fileIcon: css`
    width: 80px;
    height: 80px;
    color: ${colors.textMuted};
    margin-bottom: 16px;
  `,
  fileName: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
  `,
  sidebar: css`
    width: 280px;
    background: ${colors.surface};
    border-left: 1px solid ${colors.border};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  sidebarHeader: css`
    padding: 16px 20px;
    border-bottom: 1px solid ${colors.border};
  `,
  sidebarTitle: css`
    font-size: ${fontSize.base};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
  `,
  sidebarContent: css`
    flex: 1;
    padding: 20px;
    overflow: auto;
  `,
  info: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  `,
  infoRow: css`
    display: flex;
    justify-content: space-between;
    font-size: ${fontSize.sm};
  `,
  infoLabel: css`
    color: ${colors.textSecondary};
  `,
  infoValue: css`
    color: ${colors.text};
    font-weight: 500;
    text-align: right;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  infoValueWrap: css`
    color: ${colors.text};
    font-weight: 500;
    text-align: right;
    max-width: 160px;
    word-break: break-all;
    white-space: normal;
  `,
  actions: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  actionBtn: css`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 14px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: ${colors.text};
    text-align: left;
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  actionBtnDanger: css`
    color: ${colors.danger};
    
    &:hover {
      background-color: ${colors.dangerLight};
      border-color: ${colors.danger};
    }
  `,
  actionIcon: css`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  `,
}

export function StudioDetailView() {
  const { focusedItem, setFocusedItem, triggerRefresh, clearSelection } = useStudio()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null)
  const [showCopied, setShowCopied] = useState(false)

  if (!focusedItem) return null

  const isImage = isImageFile(focusedItem.name)
  const isVideo = isVideoFile(focusedItem.name)
  const imageSrc = focusedItem.path.replace('public', '')

  const handleClose = () => {
    setFocusedItem(null)
  }

  const handleCopyPath = () => {
    const pathToCopy = '/' + focusedItem.path
    navigator.clipboard.writeText(pathToCopy)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1500)
  }

  const handleRename = () => {
    const newName = prompt('Enter new name:', focusedItem.name)
    if (newName && newName !== focusedItem.name) {
      console.log('Rename to:', newName)
      // TODO: Implement rename API
    }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    try {
      const response = await fetch('/api/studio/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [focusedItem.path] }),
      })

      if (response.ok) {
        clearSelection()
        triggerRefresh()
        setFocusedItem(null)
      } else {
        const error = await response.json()
        setAlertMessage({
          title: 'Delete Failed',
          message: error.error || 'Unknown error',
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      setAlertMessage({
        title: 'Delete Failed',
        message: 'Delete failed. Check console for details.',
      })
    }
  }

  const handleSync = () => {
    console.log('Sync to CDN:', focusedItem.path)
    // TODO: Implement sync API
  }

  const handleRegenerate = () => {
    console.log('Regenerate:', focusedItem.path)
    // TODO: Implement regenerate API
  }

  const renderMedia = () => {
    if (isImage) {
      return <img css={styles.image} src={imageSrc} alt={focusedItem.name} />
    }
    if (isVideo) {
      return <video css={styles.video} src={imageSrc} controls />
    }
    return (
      <div css={styles.filePlaceholder}>
        <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p css={styles.fileName}>{focusedItem.name}</p>
      </div>
    )
  }

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete File"
          message={`Are you sure you want to delete "${focusedItem.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {alertMessage && (
        <AlertModal
          title={alertMessage.title}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <div css={styles.overlay} onClick={handleClose}>
        <div css={styles.container} onClick={(e) => e.stopPropagation()}>
          <div css={styles.main}>
            <div css={styles.headerButtons}>
              <button css={styles.copyBtn} onClick={handleCopyPath} title="Copy file path">
                {showCopied && <span css={styles.tooltip}>Copied!</span>}
                <svg css={styles.copyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>
              <button css={styles.mainCloseBtn} onClick={handleClose} aria-label="Close">
                <svg css={styles.mainCloseIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div css={styles.mediaWrapper}>
              {renderMedia()}
            </div>
          </div>

          <div css={styles.sidebar}>
          <div css={styles.sidebarHeader}>
            <h3 css={styles.sidebarTitle}>Details</h3>
          </div>

          <div css={styles.sidebarContent}>
            <div css={styles.info}>
              <div css={styles.infoRow}>
                <span css={styles.infoLabel}>Name</span>
                <span css={styles.infoValueWrap}>{focusedItem.name}</span>
              </div>
              <div css={styles.infoRow}>
                <span css={styles.infoLabel}>Path</span>
                <span css={styles.infoValueWrap}>{focusedItem.path.replace(/^public\//, '')}</span>
              </div>
              {focusedItem.size !== undefined && (
                <div css={styles.infoRow}>
                  <span css={styles.infoLabel}>Size</span>
                  <span css={styles.infoValue}>{formatFileSize(focusedItem.size)}</span>
                </div>
              )}
              {focusedItem.dimensions && (
                <div css={styles.infoRow}>
                  <span css={styles.infoLabel}>Dimensions</span>
                  <span css={styles.infoValue}>{focusedItem.dimensions.width} × {focusedItem.dimensions.height}</span>
                </div>
              )}
              <div css={styles.infoRow}>
                <span css={styles.infoLabel}>CDN Status</span>
                <span css={styles.infoValue}>{focusedItem.cdnSynced ? 'Synced' : 'Not synced'}</span>
              </div>
            </div>

            <div css={styles.actions}>
              <button css={styles.actionBtn} onClick={handleRename}>
                <svg css={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <button css={styles.actionBtn} onClick={handleSync}>
                <svg css={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Sync to CDN
              </button>
              <button css={styles.actionBtn} onClick={handleRegenerate}>
                <svg css={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
              <button css={[styles.actionBtn, styles.actionBtnDanger]} onClick={() => setShowDeleteConfirm(true)}>
                <svg css={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
