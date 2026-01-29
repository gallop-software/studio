/** @jsxImportSource @emotion/react */
'use client'

import { useState } from 'react'
import { css } from '@emotion/react'
import { useStudio } from './StudioContext'
import { ConfirmModal, AlertModal } from './StudioModal'

const styles = {
  panel: css`
    width: 320px;
    border-left: 1px solid #e5e7eb;
    background-color: #f9fafb;
    padding: 16px;
    overflow: auto;
  `,
  title: css`
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    margin: 0 0 16px 0;
  `,
  imageContainer: css`
    background-color: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 8px;
    margin-bottom: 16px;
  `,
  image: css`
    width: 100%;
    height: auto;
    border-radius: 4px;
  `,
  info: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  row: css`
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  `,
  label: css`
    color: #6b7280;
  `,
  value: css`
    color: #111827;
  `,
  valueTruncate: css`
    max-width: 128px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  section: css`
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
  `,
  sectionTitle: css`
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 8px 0;
  `,
  cdnStatus: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #16a34a;
  `,
  cdnIcon: css`
    width: 16px;
    height: 16px;
  `,
  copyBtn: css`
    margin-top: 8px;
    font-size: 12px;
    color: #9333ea;
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
    border-radius: 4px;
  `,
  emptyState: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
  `,
  emptyText: css`
    font-size: 14px;
    color: #9ca3af;
    margin: 0;
  `,
  actions: css`
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  actionBtn: css`
    width: 100%;
    padding: 8px 12px;
    font-size: 14px;
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s;
    color: #374151;
    
    &:hover {
      background-color: #f9fafb;
    }
  `,
  actionBtnDanger: css`
    color: #dc2626;
    
    &:hover {
      background-color: #fef2f2;
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
  const imageKey = selectedPath
    .replace(/^public\/images\//, '')
    .replace(/^public\/originals\//, '')

  const imageData = meta?.images?.[imageKey]

  return (
    <>
      {modals}
      <div css={styles.panel}>
        <h3 css={styles.title}>Preview</h3>

        <div css={styles.imageContainer}>
          <img
            css={styles.image}
            src={selectedPath.replace('public', '')}
            alt="Preview"
          />
        </div>

      <div css={styles.info}>
        <InfoRow label="Filename" value={selectedPath.split('/').pop() || ''} />

        {imageData && (
          <>
            <InfoRow
              label="Original"
              value={`${imageData.original.width}x${imageData.original.height}`}
            />
            <InfoRow
              label="File size"
              value={formatFileSize(imageData.original.fileSize)}
            />

            <div css={styles.section}>
              <p css={styles.sectionTitle}>Generated sizes</p>
              {Object.entries(imageData.sizes).map(([size, data]) => (
                <InfoRow key={size} label={size} value={`${data.width}x${data.height}`} />
              ))}
            </div>

            {imageData.cdn?.synced && (
              <div css={styles.section}>
                <p css={styles.sectionTitle}>CDN</p>
                <div css={styles.cdnStatus}>
                  <svg css={styles.cdnIcon} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Synced to CDN
                </div>
                <button
                  css={styles.copyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(`${imageData.cdn?.baseUrl}${imageData.sizes.full.path}`)
                  }}
                >
                  Copy CDN URL
                </button>
              </div>
            )}

            {imageData.blurhash && (
              <div css={styles.section}>
                <InfoRow label="Blurhash" value={imageData.blurhash} truncate />
                <div
                  css={styles.colorSwatch}
                  style={{ backgroundColor: imageData.dominantColor }}
                  title={`Dominant color: ${imageData.dominantColor}`}
                />
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
