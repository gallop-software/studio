/** @jsxImportSource @emotion/react */
'use client'

import { useCallback, useRef, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { useStudio } from './StudioContext'
import { ConfirmModal, AlertModal } from './StudioModal'
import { colors, fontSize } from './tokens'

// Standard button height for consistency
const btnHeight = '36px'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const styles = {
  toolbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background-color: ${colors.surface};
    border-bottom: 1px solid ${colors.border};
  `,
  left: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  right: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: ${btnHeight};
    padding: 0 14px;
    border-radius: 6px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    cursor: pointer;
    transition: all 0.15s ease;
    color: ${colors.text};
    letter-spacing: -0.01em;
    
    &:hover:not(:disabled) {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
  btnIconOnly: css`
    padding: 0 10px;
  `,
  btnPrimary: css`
    background: ${colors.primary};
    border-color: ${colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
  `,
  btnDanger: css`
    color: ${colors.danger};
    
    &:hover:not(:disabled) {
      background-color: ${colors.dangerLight};
      border-color: ${colors.danger};
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
    font-size: ${fontSize.base};
    color: ${colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 8px;
  `,
  clearBtn: css`
    color: ${colors.primary};
    background: none;
    border: none;
    cursor: pointer;
    font-size: ${fontSize.base};
    font-weight: 500;
    padding: 0;
    
    &:hover {
      text-decoration: underline;
    }
  `,
  divider: css`
    width: 1px;
    height: 24px;
    background: ${colors.border};
    margin: 0 4px;
  `,
  viewToggle: css`
    display: flex;
    align-items: center;
    height: ${btnHeight};
    background-color: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    overflow: hidden;
  `,
  viewBtn: css`
    height: 100%;
    padding: 0 10px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${colors.textSecondary};
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      color: ${colors.text};
      background-color: ${colors.surfaceHover};
    }
  `,
  viewBtnActive: css`
    background-color: ${colors.background};
    color: ${colors.text};
  `,
}

export function StudioToolbar() {
  const { selectedItems, viewMode, setViewMode, clearSelection, currentPath, triggerRefresh, focusedItem } = useStudio()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showProcessConfirm, setShowProcessConfirm] = useState(false)
  const [processCount, setProcessCount] = useState(0)
  const [processMode, setProcessMode] = useState<'all' | 'selected'>('all')
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null)

  // Check if we're in the images folder (uploads not allowed there)
  const isInImagesFolder = currentPath === 'public/images' || currentPath.startsWith('public/images/')

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    triggerRefresh()
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
          if (response.status >= 500) {
            console.error('Upload error:', error)
            setAlertMessage({
              title: 'Upload Failed',
              message: `Failed to upload ${file.name}: ${error.error || 'Unknown error'}`,
            })
          } else {
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

  const handleProcessImages = useCallback(async () => {
    const hasSelection = selectedItems.size > 0
    
    if (hasSelection) {
      // Process selected images
      const selectedImagePaths = Array.from(selectedItems).filter(p => {
        const ext = p.split('.').pop()?.toLowerCase() || ''
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff', 'tif'].includes(ext)
      })
      
      if (selectedImagePaths.length === 0) {
        setAlertMessage({
          title: 'No Images Selected',
          message: 'Please select image files to process.',
        })
        return
      }
      
      setProcessCount(selectedImagePaths.length)
      setProcessMode('selected')
      setShowProcessConfirm(true)
    } else {
      // Count unprocessed images for "process all"
      try {
        const response = await fetch('/api/studio/count-unprocessed')
        const data = await response.json()
        
        if (data.count === 0) {
          setAlertMessage({
            title: 'All Images Processed',
            message: 'All images in the public folder have already been processed.',
          })
          return
        }
        
        setProcessCount(data.count)
        setProcessMode('all')
        setShowProcessConfirm(true)
      } catch (error) {
        console.error('Failed to count unprocessed images:', error)
        setAlertMessage({
          title: 'Error',
          message: 'Failed to count unprocessed images.',
        })
      }
    }
  }, [selectedItems])

  const handleProcessConfirm = useCallback(async () => {
    setShowProcessConfirm(false)
    setProcessing(true)

    try {
      if (processMode === 'all') {
        // Process all unprocessed images
        const response = await fetch('/api/studio/process-all', {
          method: 'POST',
        })
        
        const data = await response.json()
        
        if (response.ok) {
          const message = [
            `Processed ${data.processed?.length || 0} images.`,
            data.orphansRemoved?.length > 0 ? `Removed ${data.orphansRemoved.length} orphaned thumbnails.` : '',
            data.errors?.length > 0 ? `${data.errors.length} errors occurred.` : '',
          ].filter(Boolean).join(' ')
          
          setAlertMessage({
            title: 'Processing Complete',
            message,
          })
          triggerRefresh()
        } else {
          setAlertMessage({
            title: 'Processing Failed',
            message: data.error || 'Unknown error',
          })
        }
      } else {
        // Process selected images
        const selectedImageKeys = Array.from(selectedItems)
          .filter(p => {
            const ext = p.split('.').pop()?.toLowerCase() || ''
            return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff', 'tif'].includes(ext)
          })
          .map(p => p.replace(/^public\//, ''))
        
        const response = await fetch('/api/studio/reprocess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageKeys: selectedImageKeys }),
        })
        
        const data = await response.json()
        
        if (response.ok) {
          setAlertMessage({
            title: 'Processing Complete',
            message: `Processed ${data.processed?.length || 0} images.${data.errors?.length > 0 ? ` ${data.errors.length} errors occurred.` : ''}`,
          })
          clearSelection()
          triggerRefresh()
        } else {
          setAlertMessage({
            title: 'Processing Failed',
            message: data.error || 'Unknown error',
          })
        }
      }
    } catch (error) {
      console.error('Processing error:', error)
      setAlertMessage({
        title: 'Processing Failed',
        message: 'Processing failed. Check console for details.',
      })
    } finally {
      setProcessing(false)
    }
  }, [processMode, selectedItems, clearSelection, triggerRefresh])

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

  // Hide toolbar actions when viewing detail
  if (focusedItem) {
    return null
  }

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

      {showProcessConfirm && (
        <ConfirmModal
          title="Process Images"
          message={processMode === 'all' 
            ? `Found ${processCount} unprocessed image${processCount !== 1 ? 's' : ''} in the public folder. This will generate thumbnails and remove any orphaned files from the images folder.`
            : `Process ${processCount} selected image${processCount !== 1 ? 's' : ''}? This will regenerate thumbnails for these files.`
          }
          confirmLabel={processing ? 'Processing...' : 'Process'}
          onConfirm={handleProcessConfirm}
          onCancel={() => setShowProcessConfirm(false)}
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      
        <div css={styles.left}>
          <button
            css={[styles.btn, styles.btnPrimary]}
            onClick={handleUpload}
            disabled={uploading || isInImagesFolder}
          >
            <UploadIcon />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          
          <div css={styles.divider} />
          
          <button
            css={styles.btn}
            onClick={handleProcessImages}
            disabled={processing}
          >
            <ImageStackIcon />
            {processing ? 'Processing...' : 'Process Images'}
          </button>
          <button
            css={[styles.btn, styles.btnDanger]}
            onClick={handleDeleteClick}
            disabled={!hasSelection}
          >
            <TrashIcon />
            Delete
          </button>
          <button
            css={styles.btn}
            onClick={handleSyncCdn}
            disabled={!hasSelection}
          >
            <CloudIcon />
            Sync CDN
          </button>
          <button css={styles.btn} onClick={handleScan}>
            <ScanIcon />
            Scan
          </button>
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

          <button
            css={[styles.btn, styles.btnIconOnly]}
            onClick={handleRefresh}
          >
            <RefreshIcon spinning={refreshing} />
          </button>

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

function UploadIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg css={[styles.icon, spinning && styles.iconSpin]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function CloudIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function ScanIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
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

function ImageStackIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
