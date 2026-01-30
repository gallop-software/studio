/** @jsxImportSource @emotion/react */
'use client'

import { useState } from 'react'
import { css } from '@emotion/react'
import { useStudio } from './StudioContext'
import { ConfirmModal, AlertModal, InputModal, ProgressModal, type ProgressState } from './StudioModal'
import { R2SetupModal } from './R2SetupModal'
import { StudioFolderPicker } from './StudioFolderPicker'
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
  statusIcon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  `,
  cloudIcon: css`
    width: 22px;
    height: 22px;
    color: #f59e0b;
    transform: translateY(1px);
  `,
  globeIcon: css`
    width: 20px;
    height: 20px;
    color: #ef4444;
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
  infoLink: css`
    color: ${colors.primary};
    font-weight: 500;
    text-align: right;
    max-width: 160px;
    word-break: break-all;
    white-space: normal;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
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
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showProcessConfirm, setShowProcessConfirm] = useState(false)
  const [showR2SetupModal, setShowR2SetupModal] = useState(false)
  const [processProgress, setProcessProgress] = useState<ProgressState | null>(null)
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null)
  const [showCopied, setShowCopied] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [moving, setMoving] = useState(false)

  if (!focusedItem) return null

  const isImage = isImageFile(focusedItem.name)
  const isVideo = isVideoFile(focusedItem.name)
  const relativePath = '/' + focusedItem.path.replace(/^public\//, '')
  
  // For preview: use CDN URL if pushed, otherwise use local path
  const imageSrc = focusedItem.cdnPushed && focusedItem.cdnBaseUrl
    ? `${focusedItem.cdnBaseUrl}${relativePath}`
    : relativePath
  
  // For display URL: use CDN URL if pushed, otherwise use current origin
  const localOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const fullUrl = focusedItem.cdnPushed && focusedItem.cdnBaseUrl 
    ? `${focusedItem.cdnBaseUrl}${relativePath}`
    : `${localOrigin}${relativePath}`

  const handleClose = () => {
    setFocusedItem(null)
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(fullUrl)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1500)
  }

  const handleRename = async (newName: string) => {
    setShowRenameModal(false)
    if (newName && newName !== focusedItem.name) {
      try {
        const response = await fetch('/api/studio/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldPath: focusedItem.path,
            newName: newName,
          }),
        })
        
        if (response.ok) {
          triggerRefresh()
          setFocusedItem(null)
        } else {
          const data = await response.json()
          setAlertMessage({
            title: 'Rename Failed',
            message: data.error || 'Failed to rename file',
          })
        }
      } catch (error) {
        console.error('Rename error:', error)
        setAlertMessage({
          title: 'Rename Failed',
          message: 'An error occurred while renaming the file',
        })
      }
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

  const handleMove = async (destination: string) => {
    setShowMoveModal(false)
    setMoving(true)
    
    try {
      const response = await fetch('/api/studio/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [focusedItem.path], destination }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'complete') {
              if (data.errors > 0 && data.errorMessages?.length > 0) {
                setAlertMessage({
                  title: 'Move Failed',
                  message: data.errorMessages.join('\n'),
                })
              } else {
                clearSelection()
                triggerRefresh()
                setFocusedItem(null)
              }
            } else if (data.type === 'error') {
              setAlertMessage({
                title: 'Move Failed',
                message: data.message || 'Unknown error',
              })
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('Move error:', error)
      setAlertMessage({
        title: 'Move Failed',
        message: 'Failed to move file. Check console for details.',
      })
    } finally {
      setMoving(false)
    }
  }

  const handleSync = async () => {
    const imageKey = '/' + focusedItem.path.replace(/^public\//, '')
    
    setPushing(true)
    
    try {
      const response = await fetch('/api/studio/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageKeys: [imageKey] }),
      })

      const data = await response.json()

      if (response.ok) {
        setAlertMessage({
          title: 'Push Complete',
          message: 'Successfully pushed to CDN.',
        })
        triggerRefresh()
      } else {
        // Check if it's an R2 configuration error
        if (data.error?.includes('R2 not configured') || data.error?.includes('CLOUDFLARE_R2')) {
          setShowR2SetupModal(true)
        } else {
          setAlertMessage({
            title: 'Push Failed',
            message: data.error || 'Failed to push to CDN.',
          })
        }
      }
    } catch (error) {
      console.error('Push error:', error)
      setAlertMessage({
        title: 'Push Failed',
        message: 'Failed to push to CDN. Check console for details.',
      })
    } finally {
      setPushing(false)
    }
  }

  const handleProcessImage = async () => {
    setShowProcessConfirm(false)
    
    setProcessProgress({
      current: 0,
      total: 1,
      percent: 0,
      status: 'processing',
      currentFile: focusedItem.name,
    })

    try {
      const imageKey = focusedItem.path.replace(/^public\//, '')
      const formattedKey = imageKey.startsWith('/') ? imageKey : `/${imageKey}`
      const response = await fetch('/api/studio/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageKeys: [formattedKey],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed')
      }

      if (data.processed?.length > 0) {
        setProcessProgress({
          current: 1,
          total: 1,
          percent: 100,
          status: 'complete',
          message: `Processed ${focusedItem.name}`,
        })
      } else if (data.errors?.length > 0) {
        setProcessProgress({
          current: 0,
          total: 1,
          percent: 0,
          status: 'error',
          message: `Failed to process: ${data.errors.join(', ')}`,
        })
      }

      triggerRefresh()
    } catch (error) {
      console.error('Process error:', error)
      setProcessProgress({
        current: 0,
        total: 1,
        percent: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process image',
      })
    }
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

      <R2SetupModal
        isOpen={showR2SetupModal}
        onClose={() => setShowR2SetupModal(false)}
      />

      {showRenameModal && (
        <InputModal
          title="Rename File"
          message="Enter a new name for the file:"
          defaultValue={focusedItem.name}
          placeholder="Enter new filename"
          confirmLabel="Rename"
          onConfirm={handleRename}
          onCancel={() => setShowRenameModal(false)}
        />
      )}

      {showMoveModal && (
        <StudioFolderPicker
          selectedItems={new Set([focusedItem.path])}
          currentPath={focusedItem.path.split('/').slice(0, -1).join('/')}
          onMove={handleMove}
          onCancel={() => setShowMoveModal(false)}
        />
      )}

      {showProcessConfirm && (
        <ConfirmModal
          title="Process Image"
          message={`Generate thumbnails for "${focusedItem.name}"?`}
          confirmLabel="Process"
          onConfirm={handleProcessImage}
          onCancel={() => setShowProcessConfirm(false)}
        />
      )}

      {processProgress && (
        <ProgressModal
          title="Processing Image"
          progress={processProgress}
          onClose={() => setProcessProgress(null)}
        />
      )}

      <div css={styles.overlay} onClick={handleClose}>
        <div css={styles.container} onClick={(e) => e.stopPropagation()}>
          <div css={styles.main}>
            <div css={styles.headerButtons}>
              {/* Cloud status icons */}
              {focusedItem.cdnPushed && !focusedItem.isRemote && (
                <span css={styles.statusIcon} title="Pushed to CDN">
                  <svg css={styles.cloudIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </span>
              )}
              {focusedItem.isRemote && (
                <span css={styles.statusIcon} title="Remote image">
                  <svg css={styles.globeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </span>
              )}
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
                <span css={styles.infoValue}>
                  {focusedItem.cdnPushed 
                    ? (focusedItem.isRemote ? 'Remote' : 'Pushed')
                    : 'Local'}
                </span>
              </div>
              <div css={styles.infoRow}>
                <span css={styles.infoLabel}>URL</span>
                <a 
                  href={fullUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  css={styles.infoLink}
                  title={fullUrl}
                >
                  {fullUrl}
                </a>
              </div>
            </div>

            <div css={styles.actions}>
              <button css={styles.actionBtn} onClick={() => setShowRenameModal(true)}>
                <svg css={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <button 
                css={styles.actionBtn} 
                onClick={() => setShowMoveModal(true)}
                disabled={moving}
              >
                <svg css={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {moving ? 'Moving...' : 'Move'}
              </button>
              <button 
                css={styles.actionBtn} 
                onClick={handleSync} 
                disabled={pushing || (focusedItem.cdnPushed && !focusedItem.isRemote)}
                title={focusedItem.cdnPushed && !focusedItem.isRemote ? 'Already in R2' : undefined}
              >
                <svg css={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {pushing ? 'Pushing...' : 'Push to CDN'}
              </button>
              <button 
                css={styles.actionBtn} 
                onClick={() => setShowProcessConfirm(true)}
              >
                <svg css={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Process Image
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
