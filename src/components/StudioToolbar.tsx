/** @jsxImportSource @emotion/react */
'use client'

import { useCallback, useRef, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { useStudio } from './StudioContext'
import { ConfirmModal, AlertModal } from './StudioModal'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const styles = {
  toolbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  `,
  left: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  right: css`
    display: flex;
    align-items: center;
    gap: 16px;
  `,
  btn: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    background: none;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s;
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
  btnDefault: css`
    color: #374151;
    
    &:hover:not(:disabled) {
      background-color: white;
    }
  `,
  btnDanger: css`
    color: #dc2626;
    
    &:hover:not(:disabled) {
      background-color: #fef2f2;
    }
  `,
  icon: css`
    width: 16px;
    height: 16px;
  `,
  iconSpin: css`
    animation: ${spin} 1s linear infinite;
  `,
  selectionCount: css`
    font-size: 14px;
    color: #4b5563;
  `,
  clearBtn: css`
    margin-left: 8px;
    color: #9333ea;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    
    &:hover {
      text-decoration: underline;
    }
  `,
  viewToggle: css`
    display: flex;
    align-items: center;
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  `,
  viewBtn: css`
    padding: 8px;
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.15s;
    
    &:hover {
      background-color: #f9fafb;
    }
  `,
  viewBtnActive: css`
    background-color: #f3e8ff;
    color: #7c3aed;
  `,
}

export function StudioToolbar() {
  const { selectedItems, viewMode, setViewMode, clearSelection, currentPath, triggerRefresh } = useStudio()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null)

  // Check if we're in the images folder (uploads not allowed there)
  const isInImagesFolder = currentPath === 'public/images' || currentPath.startsWith('public/images/')

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    triggerRefresh()
    // Stop spinning after a short delay (the actual refresh is instant)
    setTimeout(() => setRefreshing(false), 600)
  }, [triggerRefresh])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', currentPath)

        const response = await fetch('/api/studio/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          // Only log server errors (500s), not validation messages (400s)
          if (response.status >= 500) {
            console.error('Upload error:', error)
            setAlertMessage({
              title: 'Upload Failed',
              message: `Failed to upload ${file.name}: ${error.error || 'Unknown error'}`,
            })
          } else {
            // Validation message - not an error, just guidance
            setAlertMessage({
              title: 'Cannot Upload Here',
              message: error.error || 'Upload not allowed in this location.',
            })
          }
        }
      }
      triggerRefresh()
    } catch (error) {
      console.error('Upload error:', error)
      setAlertMessage({
        title: 'Upload Failed',
        message: 'Upload failed. Check console for details.',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [currentPath, triggerRefresh])

  const handleReprocess = useCallback(() => {
    console.log('Reprocess clicked', selectedItems)
  }, [selectedItems])

  const handleDeleteClick = useCallback(() => {
    if (selectedItems.size === 0) return
    setShowDeleteConfirm(true)
  }, [selectedItems])

  const handleDeleteConfirm = useCallback(async () => {
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
  }, [selectedItems, clearSelection, triggerRefresh])

  const handleSyncCdn = useCallback(() => {
    console.log('Sync CDN clicked', selectedItems)
  }, [selectedItems])

  const handleScan = useCallback(() => {
    console.log('Scan clicked')
  }, [])

  const hasSelection = selectedItems.size > 0

  return (
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

      <div css={styles.toolbar}>
        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      
      <div css={styles.left}>
        <ToolbarButton 
          onClick={handleUpload} 
          icon="upload" 
          label={uploading ? 'Uploading...' : 'Upload'} 
          disabled={uploading || isInImagesFolder}
        />
        <ToolbarButton
          onClick={handleReprocess}
          icon="refresh"
          label="Reprocess"
          disabled={!hasSelection}
        />
        <ToolbarButton
          onClick={handleDeleteClick}
          icon="trash"
          label="Delete"
          disabled={!hasSelection}
          variant="danger"
        />
        <ToolbarButton
          onClick={handleSyncCdn}
          icon="cloud"
          label="Sync CDN"
          disabled={!hasSelection}
        />
        <ToolbarButton onClick={handleScan} icon="scan" label="Scan" />
      </div>

      <div css={styles.right}>
        {hasSelection && (
          <span css={styles.selectionCount}>
            {selectedItems.size} selected
            <button css={styles.clearBtn} onClick={clearSelection}>
              Clear
            </button>
          </span>
        )}

        <ToolbarButton
          onClick={handleRefresh}
          icon="reload"
          label="Refresh"
          spinning={refreshing}
        />

        <div css={styles.viewToggle}>
          <button
            css={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <GridIcon />
          </button>
          <button
            css={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <ListIcon />
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  icon: 'upload' | 'refresh' | 'trash' | 'cloud' | 'scan' | 'reload'
  label: string
  disabled?: boolean
  variant?: 'default' | 'danger'
  spinning?: boolean
}

function ToolbarButton({
  onClick,
  icon,
  label,
  disabled,
  variant = 'default',
  spinning,
}: ToolbarButtonProps) {
  return (
    <button
      css={[styles.btn, variant === 'danger' ? styles.btnDanger : styles.btnDefault]}
      onClick={onClick}
      disabled={disabled}
    >
      <IconComponent icon={icon} spinning={spinning} />
      {label}
    </button>
  )
}

function IconComponent({ icon, spinning }: { icon: string; spinning?: boolean }) {
  switch (icon) {
    case 'upload':
      return (
        <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    case 'refresh':
      return (
        <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    case 'trash':
      return (
        <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    case 'cloud':
      return (
        <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      )
    case 'scan':
      return (
        <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    case 'reload':
      return (
        <svg css={[styles.icon, spinning && styles.iconSpin]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    default:
      return null
  }
}

function GridIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}
