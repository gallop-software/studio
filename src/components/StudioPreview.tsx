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
  panel: css`
    width: 320px;
    border-left: 1px solid ${colors.border};
    background-color: ${colors.surface};
    padding: 20px;
    overflow: auto;
  `,
  title: css`
    font-size: ${fontSize.sm};
    font-weight: 600;
    color: ${colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 16px 0;
  `,
  imageContainer: css`
    background-color: ${colors.background};
    border-radius: 8px;
    border: 1px solid ${colors.border};
    padding: 12px;
    margin-bottom: 20px;
  `,
  image: css`
    width: 100%;
    height: auto;
    border-radius: 6px;
  `,
  info: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  row: css`
    display: flex;
    justify-content: space-between;
    font-size: ${fontSize.sm};
  `,
  label: css`
    color: ${colors.textSecondary};
  `,
  value: css`
    color: ${colors.text};
    font-weight: 500;
  `,
  valueTruncate: css`
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  section: css`
    padding-top: 12px;
    margin-top: 4px;
    border-top: 1px solid ${colors.borderLight};
  `,
  sectionTitle: css`
    font-size: ${fontSize.xs};
    font-weight: 600;
    color: ${colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 10px 0;
  `,
  cdnStatus: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${fontSize.sm};
    color: ${colors.success};
    font-weight: 500;
  `,
  cdnIcon: css`
    width: 16px;
    height: 16px;
  `,
  copyBtn: css`
    margin-top: 8px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.primary};
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    
    &:hover {
      text-decoration: underline;
    }
  `,
  colorSwatch: css`
    margin-top: 8px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid ${colors.border};
  `,
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    text-align: center;
  `,
  emptyText: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
    margin: 0;
  `,
  filePlaceholder: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    background: ${colors.background};
    border-radius: 6px;
  `,
  fileIcon: css`
    width: 56px;
    height: 56px;
    color: ${colors.textMuted};
  `,
  folderIcon: css`
    width: 56px;
    height: 56px;
    color: #f5a623;
  `,
  video: css`
    width: 100%;
    height: auto;
    border-radius: 6px;
  `,
  actions: css`
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid ${colors.border};
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  actionBtn: css`
    width: 100%;
    padding: 10px 14px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background-color: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: ${colors.text};
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: #d0d5dd;
    }
  `,
  actionBtnDanger: css`
    color: ${colors.danger};
    
    &:hover {
      background-color: ${colors.dangerLight};
      border-color: ${colors.danger};
    }
  `,
}

export function StudioPreview() {
  const { selectedItems, meta, triggerRefresh, clearSelection } = useStudio()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null)

  const handleDeleteClick = () => {
    if (selectedItems.size === 0) return
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false)

    try {
      const response = await fetch('/api/studio/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: Array.from(selectedItems) }),
      })

      if (response.ok) {
        clearSelection()
        triggerRefresh()
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

  const modals = (
    <>
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Items"
          message={`Are you sure you want to delete ${selectedItems.size} item(s)? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
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
    </>
  )

  // Always show the sidebar
  if (selectedItems.size === 0) {
    return (
      <>
        {modals}
        <div css={styles.panel}>
          <h3 css={styles.title}>Preview</h3>
          <div css={styles.emptyState}>
            <p css={styles.emptyText}>Select an image to preview</p>
          </div>
        </div>
      </>
    )
  }

  if (selectedItems.size > 1) {
    return (
      <>
        {modals}
        <div css={styles.panel}>
          <h3 css={styles.title}>{selectedItems.size} items selected</h3>
          <div css={styles.actions}>
            <button css={[styles.actionBtn, styles.actionBtnDanger]} onClick={handleDeleteClick}>
              Delete {selectedItems.size} items
            </button>
          </div>
        </div>
      </>
    )
  }

  const selectedPath = Array.from(selectedItems)[0]
  const isFolder = !selectedPath.includes('.') || selectedPath.endsWith('/')
  const filename = selectedPath.split('/').pop() || ''
  const isImage = isImageFile(filename)
  const isVideo = isVideoFile(filename)
  
  // Build the meta key (with leading slash)
  const imageKey = '/' + selectedPath
    .replace(/^public\/images\//, '')
    .replace(/^public\/originals\//, '')
    .replace(/^public\//, '')

  const imageData = meta?.[imageKey]

  const renderPreview = () => {
    if (isFolder) {
      return (
        <div css={styles.filePlaceholder}>
          <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
          </svg>
        </div>
      )
    }
    
    if (isImage) {
      return (
        <img
          css={styles.image}
          src={selectedPath.replace('public', '')}
          alt="Preview"
        />
      )
    }
    
    if (isVideo) {
      return (
        <video
          css={styles.video}
          src={selectedPath.replace('public', '')}
          controls
          muted
        />
      )
    }
    
    // Non-image/video file - show file icon
    return (
      <div css={styles.filePlaceholder}>
        <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <>
      {modals}
      <div css={styles.panel}>
        <h3 css={styles.title}>Preview</h3>

        <div css={styles.imageContainer}>
          {renderPreview()}
        </div>

      <div css={styles.info}>
        <InfoRow label="Filename" value={selectedPath.split('/').pop() || ''} />

        {imageData && (
          <>
            <InfoRow
              label="Dimensions"
              value={imageData.o ? `${imageData.o.w}x${imageData.o.h}` : 'Unknown'}
            />

            {imageData.c && (
              <div css={styles.section}>
                <p css={styles.sectionTitle}>CDN</p>
                <div css={styles.cdnStatus}>
                  <svg css={styles.cdnIcon} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Pushed to CDN
                </div>
              </div>
            )}

            {imageData.b && (
              <div css={styles.section}>
                <InfoRow label="Blurhash" value={imageData.b} truncate />
              </div>
            )}
          </>
        )}
      </div>

        <div css={styles.actions}>
          <button css={styles.actionBtn}>Rename</button>
          <button css={[styles.actionBtn, styles.actionBtnDanger]} onClick={handleDeleteClick}>Delete</button>
        </div>
      </div>
    </>
  )
}

function InfoRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div css={styles.row}>
      <span css={styles.label}>{label}</span>
      <span css={[styles.value, truncate && styles.valueTruncate]} title={truncate ? value : undefined}>
        {value}
      </span>
    </div>
  )
}

