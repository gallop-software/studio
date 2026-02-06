/** @jsxImportSource @emotion/react */
'use client'

import React, { useState, useRef, useCallback } from 'react'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize, fontStack, baseReset } from './tokens'
import type { ProgressState } from './StudioContext'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { 
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`

const styles = {
  overlay: css`
    position: fixed;
    inset: 0;
    background-color: rgba(26, 31, 54, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: ${fadeIn} 0.15s ease-out;
    font-family: ${fontStack};
  `,
  modal: css`
    ${baseReset}
    background-color: ${colors.surface};
    border-radius: 12px;
    box-shadow: 0 30px 60px -12px rgba(50, 50, 93, 0.25), 0 18px 36px -18px rgba(0, 0, 0, 0.3);
    max-width: 520px;
    width: 90%;
    animation: ${slideIn} 0.2s ease-out;
    overflow: hidden;
  `,
  header: css`
    padding: 24px 24px 0;
  `,
  title: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
    letter-spacing: -0.02em;
  `,
  content: css`
    padding: 24px;
  `,
  dropzone: css`
    border: 2px dashed ${colors.border};
    border-radius: 8px;
    padding: 40px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s ease;
    background-color: ${colors.background};
    
    &:hover {
      border-color: ${colors.primary};
      background-color: ${colors.primaryLight};
    }
  `,
  dropzoneActive: css`
    border-color: ${colors.primary};
    background-color: ${colors.primaryLight};
  `,
  dropzoneIcon: css`
    width: 48px;
    height: 48px;
    color: ${colors.textMuted};
    margin: 0 auto 16px;
  `,
  dropzoneText: css`
    font-size: ${fontSize.base};
    color: ${colors.text};
    margin: 0 0 8px;
  `,
  dropzoneHint: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
    margin: 0;
  `,
  fileList: css`
    margin-top: 16px;
    max-height: 200px;
    overflow-y: auto;
  `,
  fileItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: ${colors.background};
    border-radius: 6px;
    margin-bottom: 4px;
    font-size: ${fontSize.sm};
    
    &:last-child {
      margin-bottom: 0;
    }
  `,
  fileName: css`
    color: ${colors.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-right: 8px;
  `,
  fileSize: css`
    color: ${colors.textMuted};
    flex-shrink: 0;
  `,
  removeBtn: css`
    background: none;
    border: none;
    color: ${colors.textMuted};
    cursor: pointer;
    padding: 4px;
    margin-left: 8px;
    
    &:hover {
      color: ${colors.danger};
    }
  `,
  footer: css`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    background-color: ${colors.background};
    border-top: 1px solid ${colors.border};
  `,
  btn: css`
    padding: 10px 20px;
    border-radius: 6px;
    font-size: ${fontSize.base};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  `,
  btnSecondary: css`
    background-color: ${colors.surface};
    border: 1px solid ${colors.border};
    color: ${colors.text};
    
    &:hover {
      background-color: ${colors.background};
    }
  `,
  btnPrimary: css`
    background-color: ${colors.primary};
    border: 1px solid ${colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background-color: ${colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
}

interface AddNewFontModalProps {
  currentPath: string
  onClose: () => void
  onUploadComplete: () => void
  setShowProgress: (show: boolean) => void
  setProgressTitle: (title: string) => void
  setProgress: React.Dispatch<React.SetStateAction<ProgressState>>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AddNewFontModal({ 
  currentPath, 
  onClose, 
  onUploadComplete, 
  setShowProgress, 
  setProgressTitle, 
  setProgress 
}: AddNewFontModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stopUploadRef = useRef(false)

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files) {
      // Filter to only TTF files
      const ttfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.ttf'))
      setSelectedFiles(prev => [...prev, ...ttfFiles])
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return

    onClose() // Close modal first so progress modal shows
    stopUploadRef.current = false

    setProgressTitle('Uploading Font Files')
    setShowProgress(true)
    setProgress({
      current: 0,
      total: selectedFiles.length,
      percent: 0,
      status: 'progress',
      message: 'Uploading...',
    })

    let uploaded = 0
    const errors: string[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      if (stopUploadRef.current) {
        setProgress(prev => ({
          ...prev,
          status: 'complete',
          message: `Stopped. Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''}.`,
        }))
        onUploadComplete()
        return
      }

      const file = selectedFiles[i]
      
      setProgress({
        current: i,
        total: selectedFiles.length,
        percent: Math.round((i / selectedFiles.length) * 100),
        status: 'progress',
        message: `Uploading ${file.name}...`,
      })

      // Small delay for visibility
      await new Promise(resolve => setTimeout(resolve, 500))

      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', currentPath)

      try {
        const response = await fetch('/api/studio/fonts/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          uploaded++
        } else {
          errors.push(file.name)
        }
      } catch {
        errors.push(file.name)
      }
    }

    setProgress({
      current: uploaded,
      total: selectedFiles.length,
      percent: 100,
      status: 'complete',
      message: errors.length > 0 
        ? `Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''}. ${errors.length} failed.`
        : `Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''} successfully.`,
    })
    onUploadComplete()
  }, [selectedFiles, currentPath, onClose, onUploadComplete, setShowProgress, setProgressTitle, setProgress])

  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.modal} onClick={e => e.stopPropagation()}>
        <div css={styles.header}>
          <h2 css={styles.title}>Add Font Files</h2>
        </div>
        
        <div css={styles.content}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".ttf"
            style={{ display: 'none' }}
            onChange={e => handleFileSelect(e.target.files)}
          />
          
          <div
            css={[styles.dropzone, isDragging && styles.dropzoneActive]}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <svg css={styles.dropzoneIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p css={styles.dropzoneText}>
              {isDragging ? 'Drop files here' : 'Click to select or drag and drop'}
            </p>
            <p css={styles.dropzoneHint}>TTF font files only</p>
          </div>
          
          {selectedFiles.length > 0 && (
            <div css={styles.fileList}>
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} css={styles.fileItem}>
                  <span css={styles.fileName}>{file.name}</span>
                  <span css={styles.fileSize}>{formatFileSize(file.size)}</span>
                  <button css={styles.removeBtn} onClick={() => handleRemoveFile(index)}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div css={styles.footer}>
          <button css={[styles.btn, styles.btnSecondary]} onClick={onClose}>
            Cancel
          </button>
          <button 
            css={[styles.btn, styles.btnPrimary]} 
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
          >
            Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddNewFontModal
