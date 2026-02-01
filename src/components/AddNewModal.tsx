/** @jsxImportSource @emotion/react */
'use client'

import React, { useState, useRef, useCallback } from 'react'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize, fontStack, baseReset } from './tokens'

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
  tabs: css`
    display: flex;
    gap: 0;
    margin-top: 16px;
    border-bottom: 1px solid ${colors.border};
  `,
  tab: css`
    padding: 12px 20px;
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.textSecondary};
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    transition: color 0.15s;
    
    &:hover {
      color: ${colors.text};
    }
  `,
  tabActive: css`
    color: ${colors.primary};
    
    &::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background-color: ${colors.primary};
    }
  `,
  body: css`
    padding: 24px;
    min-height: 200px;
  `,
  dropzone: css`
    border: 2px dashed ${colors.border};
    border-radius: 8px;
    padding: 40px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s;
    
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
    margin: 0 auto 16px;
    color: ${colors.textMuted};
  `,
  dropzoneText: css`
    font-size: ${fontSize.base};
    color: ${colors.text};
    margin: 0 0 4px;
  `,
  dropzoneHint: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 0;
  `,
  textarea: css`
    width: 100%;
    min-height: 150px;
    padding: 12px;
    font-size: ${fontSize.sm};
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    border: 1px solid ${colors.border};
    border-radius: 8px;
    resize: vertical;
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 3px ${colors.primaryLight};
    }
    
    &::placeholder {
      color: ${colors.textMuted};
    }
  `,
  textareaLabel: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 0 0 8px;
  `,
  footer: css`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid ${colors.border};
    background-color: ${colors.background};
  `,
  btn: css`
    padding: 10px 18px;
    font-size: ${fontSize.base};
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    letter-spacing: -0.01em;
  `,
  btnCancel: css`
    background-color: ${colors.surface};
    border: 1px solid ${colors.border};
    color: ${colors.text};
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  btnConfirm: css`
    background-color: ${colors.primary};
    border: 1px solid ${colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
  fileInput: css`
    display: none;
  `,
  selectedFiles: css`
    margin-top: 16px;
    padding: 12px;
    background-color: ${colors.background};
    border-radius: 6px;
    font-size: ${fontSize.sm};
    color: ${colors.text};
  `,
}

interface StreamingOperation {
  execute: (config: {
    endpoint: string
    body: Record<string, unknown>
    title: string
    onComplete?: () => void
    onError?: (message: string) => void
  }) => Promise<void>
  stop: () => void
  isRunning: boolean
}

interface ProgressState {
  current: number
  total: number
  percent: number
  status: string
  message?: string
  currentFile?: string
}

interface AddNewModalProps {
  currentPath: string
  onClose: () => void
  onUploadComplete: () => void
  streamingOperation?: StreamingOperation
  // For file upload progress
  setShowProgress?: (show: boolean) => void
  setProgressTitle?: (title: string) => void
  setProgressState?: (state: Partial<ProgressState> | ((prev: ProgressState) => ProgressState)) => void
}

export function AddNewModal({ currentPath, onClose, onUploadComplete, streamingOperation, setShowProgress, setProgressTitle, setProgressState }: AddNewModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'import'>('upload')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files) {
      setSelectedFiles(Array.from(files))
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // Ref to track if upload should be stopped
  const stopUploadRef = useRef(false)
  
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return
    
    // If progress callbacks available, use them
    if (setShowProgress && setProgressTitle && setProgressState) {
      onClose() // Close modal first so progress modal shows
      stopUploadRef.current = false
      
      setProgressTitle('Uploading Files')
      setShowProgress(true)
      setProgressState({
        current: 0,
        total: selectedFiles.length,
        percent: 0,
        status: 'processing',
        message: 'Uploading...',
      })
      
      let uploaded = 0
      const errors: string[] = []
      
      for (let i = 0; i < selectedFiles.length; i++) {
        // Check if stopped
        if (stopUploadRef.current) {
          setProgressState(prev => ({
            ...prev,
            status: 'stopped',
            message: `Stopped. Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''}.`,
          }))
          onUploadComplete()
          return
        }
        
        const file = selectedFiles[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', currentPath)
        
        try {
          const response = await fetch('/api/studio/upload', {
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
        
        setProgressState({
          current: i + 1,
          total: selectedFiles.length,
          percent: Math.round(((i + 1) / selectedFiles.length) * 100),
          status: 'processing',
          currentFile: file.name,
        })
      }
      
      setProgressState({
        current: selectedFiles.length,
        total: selectedFiles.length,
        percent: 100,
        status: 'complete',
        message: `Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''}.${errors.length > 0 ? ` ${errors.length} failed.` : ''}`,
      })
      onUploadComplete()
      return
    }
    
    // Fallback to old behavior
    setUploading(true)
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', currentPath)
        
        await fetch('/api/studio/upload', {
          method: 'POST',
          body: formData,
        })
      }
      
      onUploadComplete()
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }, [selectedFiles, currentPath, onUploadComplete, onClose, setShowProgress, setProgressTitle, setProgressState])

  const handleImport = useCallback(async () => {
    const urls = urlInput
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
    
    if (urls.length === 0) return
    
    // Use unified streaming if available
    if (streamingOperation) {
      onClose() // Close modal first so progress modal can show
      await streamingOperation.execute({
        endpoint: '/api/studio/import',
        body: { urls },
        title: 'Importing URLs',
        onComplete: () => {
          onUploadComplete()
        },
      })
      return
    }
    
    // Fallback to old behavior
    setImporting(true)
    
    try {
      const response = await fetch('/api/studio/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')
      
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = decoder.decode(value)
        const lines = text.split('\n\n').filter(line => line.startsWith('data: '))
        
        for (const line of lines) {
          const data = JSON.parse(line.replace('data: ', ''))
          if (data.type === 'complete') {
            onUploadComplete()
            onClose()
          }
        }
      }
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImporting(false)
    }
  }, [urlInput, onUploadComplete, onClose, streamingOperation])

  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.modal} onClick={e => e.stopPropagation()}>
        <div css={styles.header}>
          <h3 css={styles.title}>Add New</h3>
          <div css={styles.tabs}>
            <button
              css={[styles.tab, activeTab === 'upload' && styles.tabActive]}
              onClick={() => setActiveTab('upload')}
            >
              Upload Files
            </button>
            <button
              css={[styles.tab, activeTab === 'import' && styles.tabActive]}
              onClick={() => setActiveTab('import')}
            >
              Import URLs
            </button>
          </div>
        </div>
        
        <div css={styles.body}>
          {activeTab === 'upload' ? (
            <>
              <div
                css={[styles.dropzone, isDragging && styles.dropzoneActive]}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <svg css={styles.dropzoneIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p css={styles.dropzoneText}>
                  Drop files here or click to browse
                </p>
                <p css={styles.dropzoneHint}>
                  Supports images and other media files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                css={styles.fileInput}
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              {selectedFiles.length > 0 && (
                <div css={styles.selectedFiles}>
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </>
          ) : (
            <>
              <p css={styles.textareaLabel}>
                Paste image URLs (one per line)
              </p>
              <textarea
                css={styles.textarea}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={`https://cdn.example.com/photos/image1.jpg\nhttps://cdn.example.com/photos/image2.jpg`}
              />
            </>
          )}
        </div>
        
        <div css={styles.footer}>
          <button
            css={[styles.btn, styles.btnCancel]}
            onClick={onClose}
          >
            Cancel
          </button>
          {activeTab === 'upload' ? (
            <button
              css={[styles.btn, styles.btnConfirm]}
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          ) : (
            <button
              css={[styles.btn, styles.btnConfirm]}
              onClick={handleImport}
              disabled={!urlInput.trim() || importing}
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
