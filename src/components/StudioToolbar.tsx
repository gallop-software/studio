/** @jsxImportSource @emotion/react */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { useStudio } from './StudioContext'
import { ConfirmModal, AlertModal, ProgressModal, InputModal, type ProgressState } from './StudioModal'
import { StudioFolderPicker } from './StudioFolderPicker'
import { R2SetupModal } from './R2SetupModal'
import { AddNewModal } from './AddNewModal'
import { colors, fontSize } from './tokens'

// Standard button height for consistency
const btnHeight = '36px'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const styles = {
  toolbar: css`
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 16px;
    background-color: ${colors.surface};
    border-bottom: 1px solid ${colors.border};
    overflow-x: auto;
    min-width: 0;
    
    @media (min-width: 768px) {
      padding: 12px 24px;
    }
  `,
  left: css`
    display: flex;
    flex-wrap: nowrap;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
  `,
  right: css`
    display: flex;
    flex-wrap: nowrap;
    flex-shrink: 0;
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
  searchWrapper: css`
    position: relative;
    display: flex;
    align-items: center;
  `,
  searchInput: css`
    height: ${btnHeight};
    padding: 0 32px 0 12px;
    border: 1px solid ${colors.border};
    border-radius: 6px;
    font-size: ${fontSize.base};
    background: ${colors.surface};
    color: ${colors.text};
    width: 180px;
    transition: all 0.15s ease;
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 2px ${colors.primaryLight};
    }
    
    &::placeholder {
      color: ${colors.textMuted};
    }
  `,
  searchClearBtn: css`
    position: absolute;
    right: 5px;
    top: 5px;
    bottom: 5px;
    background: ${colors.primary};
    border: none;
    padding: 0 6px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.15s ease;
    
    &:hover {
      background: ${colors.primaryHover};
    }
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
    background-color: ${colors.primaryLight};
    color: ${colors.primary};
    
    &:hover {
      background-color: ${colors.primaryLight};
      color: ${colors.primary};
    }
  `,
}

export function StudioToolbar() {
  const { selectedItems, viewMode, setViewMode, clearSelection, currentPath, triggerRefresh, focusedItem, scanRequested, clearScanRequest, fileItems, requestProcess, actionState } = useStudio()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [showAddNewModal, setShowAddNewModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [syncImageCount, setSyncImageCount] = useState(0)
  const [syncHasRemote, setSyncHasRemote] = useState(false)
  const [syncHasLocal, setSyncHasLocal] = useState(false)
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [downloadImageCount, setDownloadImageCount] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const [progressTitle, setProgressTitle] = useState('Processing Images')
  const [progressState, setProgressState] = useState<ProgressState>({
    current: 0,
    total: 0,
    percent: 0,
    status: 'processing',
  })
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showR2SetupModal, setShowR2SetupModal] = useState(false)
  const [pushing, setPushing] = useState(false)

  // Check if we're in the images folder (uploads not allowed there)
  const isInImagesFolder = currentPath === 'public/images' || currentPath.startsWith('public/images/')

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleScan = useCallback(async () => {
    setScanning(true)
    setProgressTitle('Scanning Files')
    setShowProgress(true)
    setProgressState({
      current: 0,
      total: 0,
      percent: 0,
      status: 'processing',
      message: 'Scanning for files...',
    })

    try {
      const response = await fetch('/api/studio/scan', { method: 'POST' })
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

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
          const data = JSON.parse(line.slice(6))

          if (data.type === 'start') {
            setProgressState({
              current: 0,
              total: data.total,
              percent: 0,
              status: 'processing',
              message: `Scanning ${data.total} files...`,
            })
          } else if (data.type === 'progress') {
            setProgressState({
              current: data.current,
              total: data.total,
              percent: data.percent,
              status: 'processing',
              currentFile: data.currentFile,
            })
          } else if (data.type === 'cleanup') {
            setProgressState(prev => ({
              ...prev,
              message: data.message,
            }))
          } else if (data.type === 'complete') {
            let message = data.renamed > 0 ? `${data.renamed} file(s) renamed due to conflicts. ` : ''
            if (data.orphanedFiles && data.orphanedFiles.length > 0) {
              message += `Found ${data.orphanedFiles.length} orphaned thumbnail(s) in images folder.`
            }
            setProgressState({
              current: data.total || 0,
              total: data.total || 0,
              percent: 100,
              status: 'complete',
              processed: data.added,
              alreadyProcessed: data.existingCount,
              errors: data.errors,
              orphanedFiles: data.orphanedFiles,
              message: message || undefined,
              isScan: true,
            })
            triggerRefresh()
          } else if (data.type === 'error') {
            setProgressState({
              current: 0,
              total: 0,
              percent: 0,
              status: 'error',
              message: data.message || 'Scan failed',
            })
          }
        }
      }
    } catch (error) {
      console.error('Scan error:', error)
      setProgressState({
        current: 0,
        total: 0,
        percent: 0,
        status: 'error',
        message: 'Scan failed',
      })
    } finally {
      setScanning(false)
    }
  }, [triggerRefresh])

  // Handle scan request from file pane
  useEffect(() => {
    if (scanRequested && !scanning) {
      clearScanRequest()
      handleScan()
    }
  }, [scanRequested, scanning, clearScanRequest, handleScan])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileList = Array.from(files)
    
    // Show progress modal for multiple files
    if (fileList.length > 1) {
      setProgressState({
        current: 0,
        total: fileList.length,
        percent: 0,
        status: 'processing',
        message: 'Uploading files...',
      })
      setShowProgress(true)
    } else {
      setUploading(true)
    }

    let uploaded = 0
    let errors = 0

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        
        if (fileList.length > 1) {
          setProgressState({
            current: i + 1,
            total: fileList.length,
            percent: Math.round(((i + 1) / fileList.length) * 100),
            status: 'processing',
            currentFile: file.name,
          })
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', currentPath)

        try {
          const response = await fetch('/api/studio/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            errors++
            if (fileList.length === 1) {
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
          } else {
            uploaded++
          }
        } catch {
          errors++
        }
      }

      if (fileList.length > 1) {
        setProgressState({
          current: fileList.length,
          total: fileList.length,
          percent: 100,
          status: 'complete',
          processed: uploaded,
          errors: errors,
        })
      }
      
      triggerRefresh()
    } catch (error) {
      console.error('Upload error:', error)
      if (fileList.length > 1) {
        setProgressState({
          current: 0,
          total: 0,
          percent: 0,
          status: 'error',
          message: 'Upload failed.',
        })
      } else {
        setAlertMessage({
          title: 'Upload Failed',
          message: 'Upload failed. Check console for details.',
        })
      }
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
      const selectedPaths = Array.from(selectedItems)
      
      // Separate folders and files (files have extensions)
      const selectedFilePaths = selectedPaths.filter(p => {
        const lastPart = p.split('/').pop() || ''
        return lastPart.includes('.') && !p.endsWith('/')
      })
      const selectedFolders = selectedPaths.filter(p => {
        const lastPart = p.split('/').pop() || ''
        return !lastPart.includes('.') || p.endsWith('/')
      })
      
      // If folders are selected, fetch all files from them
      if (selectedFolders.length > 0) {
        try {
          const response = await fetch(`/api/studio/folder-images?folders=${encodeURIComponent(selectedFolders.join(','))}`)
          const data = await response.json()
          
          if (data.images) {
            // Add folder files to selectedFilePaths (as public/ paths)
            for (const img of data.images) {
              const fullPath = `public/${img}`
              if (!selectedFilePaths.includes(fullPath)) {
                selectedFilePaths.push(fullPath)
              }
            }
          }
        } catch (error) {
          console.error('Failed to get folder files:', error)
        }
      }
      
      if (selectedFilePaths.length === 0) {
        setAlertMessage({
          title: 'No Files Found',
          message: 'No files found in the selected items.',
        })
        return
      }
      
      // Use shared process modal
      requestProcess(selectedFilePaths)
    } else {
      // Get ALL image paths for "process all"
      try {
        const response = await fetch('/api/studio/count-images')
        const data = await response.json()
        
        if (!data.images || data.images.length === 0) {
          setAlertMessage({
            title: 'No Images Found',
            message: 'No images found in the public folder to process.',
          })
          return
        }
        
        // Convert to full paths and use shared process modal
        const allImagePaths = data.images.map((img: string) => `public/${img}`)
        requestProcess(allImagePaths)
      } catch (error) {
        console.error('Failed to get images:', error)
        setAlertMessage({
          title: 'Error',
          message: 'Failed to get images.',
        })
      }
    }
  }, [selectedItems, requestProcess])

  const handleStopProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const handleDeleteOrphans = useCallback(async () => {
    const orphanedFiles = progressState.orphanedFiles
    if (!orphanedFiles || orphanedFiles.length === 0) return

    try {
      const response = await fetch('/api/studio/delete-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: orphanedFiles }),
      })

      const data = await response.json()

      if (response.ok) {
        setProgressState(prev => ({
          ...prev,
          orphanedFiles: undefined,
          orphansRemoved: data.deleted,
          message: `Deleted ${data.deleted} orphaned thumbnail${data.deleted !== 1 ? 's' : ''}.`,
        }))
        triggerRefresh()
      } else {
        setAlertMessage({
          title: 'Delete Failed',
          message: data.error || 'Failed to delete orphaned files.',
        })
      }
    } catch (error) {
      console.error('Delete orphans error:', error)
      setAlertMessage({
        title: 'Delete Failed',
        message: 'Failed to delete orphaned files. Check console for details.',
      })
    }
  }, [progressState.orphanedFiles, triggerRefresh])

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

  const handleSyncClick = useCallback(async () => {
    if (selectedItems.size === 0) return

    const selectedPaths = Array.from(selectedItems)
    
    // Separate folders and files (files have extensions)
    const selectedFilePaths = selectedPaths.filter(p => {
      const lastPart = p.split('/').pop() || ''
      return lastPart.includes('.') && !p.endsWith('/')
    })
    const selectedFolders = selectedPaths.filter(p => {
      const lastPart = p.split('/').pop() || ''
      return !lastPart.includes('.') || p.endsWith('/')
    })

    // If folders are selected, fetch all files from them
    if (selectedFolders.length > 0) {
      try {
        const response = await fetch(`/api/studio/folder-images?folders=${encodeURIComponent(selectedFolders.join(','))}`)
        const data = await response.json()
        
        if (data.images) {
          for (const img of data.images) {
            const fullPath = `public/${img}`
            if (!selectedFilePaths.includes(fullPath)) {
              selectedFilePaths.push(fullPath)
            }
          }
        }
      } catch (error) {
        console.error('Failed to get folder files:', error)
      }
    }

    if (selectedFilePaths.length === 0) {
      setAlertMessage({
        title: 'No Files Found',
        message: 'No files found in the selected items.',
      })
      return
    }

    // Determine what types of files are selected
    let hasRemote = false
    let hasLocal = false
    
    for (const filePath of selectedFilePaths) {
      const item = fileItems.find(f => f.path === filePath)
      if (item) {
        if (item.isRemote) {
          hasRemote = true
        } else if (!item.cdnPushed) {
          hasLocal = true
        }
      }
    }

    // Store info and show confirm modal
    setSyncImageCount(selectedFilePaths.length)
    setSyncHasRemote(hasRemote)
    setSyncHasLocal(hasLocal)
    setShowSyncConfirm(true)
  }, [selectedItems, fileItems])

  const handleSyncConfirm = useCallback(async () => {
    setShowSyncConfirm(false)
    
    const selectedPaths = Array.from(selectedItems)
    
    // Separate folders and files (files have extensions)
    const selectedFilePaths = selectedPaths.filter(p => {
      const lastPart = p.split('/').pop() || ''
      return lastPart.includes('.') && !p.endsWith('/')
    })
    const selectedFolders = selectedPaths.filter(p => {
      const lastPart = p.split('/').pop() || ''
      return !lastPart.includes('.') || p.endsWith('/')
    })

    // If folders are selected, fetch all files from them
    if (selectedFolders.length > 0) {
      try {
        const response = await fetch(`/api/studio/folder-images?folders=${encodeURIComponent(selectedFolders.join(','))}`)
        const data = await response.json()
        
        if (data.images) {
          for (const img of data.images) {
            const fullPath = `public/${img}`
            if (!selectedFilePaths.includes(fullPath)) {
              selectedFilePaths.push(fullPath)
            }
          }
        }
      } catch (error) {
        console.error('Failed to get folder files:', error)
      }
    }

    // Convert to file keys
    const imageKeys = selectedFilePaths.map(p => '/' + p.replace(/^public\//, ''))

    // Show progress modal
    setProgressTitle('Pushing to CDN')
    setProgressState({
      current: 0,
      total: imageKeys.length,
      percent: 0,
      status: 'processing',
      message: 'Pushing to CDN...',
    })
    setShowProgress(true)

    let pushed = 0
    let errors = 0
    const errorMessages: string[] = []

    try {
      // Push images one by one for progress tracking
      for (let i = 0; i < imageKeys.length; i++) {
        const imageKey = imageKeys[i]
        
        setProgressState({
          current: i + 1,
          total: imageKeys.length,
          percent: Math.round(((i + 1) / imageKeys.length) * 100),
          status: 'processing',
          currentFile: imageKey.replace(/^\//, ''),
        })

        // Retry logic for transient network errors
        let success = false
        let lastError: string | undefined
        
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            const response = await fetch('/api/studio/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageKeys: [imageKey] }),
            })

            const data = await response.json()

            if (!response.ok) {
              // Check if it's an R2 configuration error
              if (data.error?.includes('R2 not configured') || data.error?.includes('CLOUDFLARE_R2')) {
                setShowProgress(false)
                setShowR2SetupModal(true)
                return
              }
              lastError = data.error || `Failed: ${imageKey}`
            } else if (data.pushed?.length > 0) {
              pushed++
              success = true
            } else if (data.errors?.length > 0) {
              // Server-side errors from handler
              for (const errMsg of data.errors) {
                lastError = errMsg
              }
            } else {
              // Already pushed or no action needed
              success = true
            }
          } catch (err) {
            lastError = `Network error: ${imageKey}`
            // Wait before retry (exponential backoff: 500ms, 1s)
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
            }
          }
        }
        
        if (!success && lastError) {
          errors++
          errorMessages.push(lastError)
        }
      }

      setProgressState({
        current: imageKeys.length,
        total: imageKeys.length,
        percent: 100,
        status: 'complete',
        processed: pushed,
        errors: errors,
        errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
      })
      
      clearSelection()
      triggerRefresh()
    } catch (error) {
      console.error('Push error:', error)
      setProgressState({
        current: 0,
        total: 0,
        percent: 0,
        status: 'error',
        message: 'Failed to push to CDN.',
      })
    }
  }, [selectedItems, clearSelection, triggerRefresh])

  // Download from R2 to local
  const handleDownloadClick = useCallback(async () => {
    if (selectedItems.size === 0) return

    const selectedPaths = Array.from(selectedItems)
    
    // Get only files (not folders)
    const selectedFilePaths = selectedPaths.filter(p => {
      const lastPart = p.split('/').pop() || ''
      return lastPart.includes('.') && !p.endsWith('/')
    })

    if (selectedFilePaths.length === 0) {
      setAlertMessage({
        title: 'No Files Found',
        message: 'No files found in the selected items.',
      })
      return
    }

    setDownloadImageCount(selectedFilePaths.length)
    setShowDownloadConfirm(true)
  }, [selectedItems])

  const handleDownloadConfirm = useCallback(async () => {
    setShowDownloadConfirm(false)
    
    const selectedPaths = Array.from(selectedItems)
    
    // Get only files (not folders)
    const selectedFilePaths = selectedPaths.filter(p => {
      const lastPart = p.split('/').pop() || ''
      return lastPart.includes('.') && !p.endsWith('/')
    })

    // Convert to file keys
    const imageKeys = selectedFilePaths.map(p => '/' + p.replace(/^public\//, ''))

    // Show progress modal
    setProgressTitle('Downloading from CDN')
    setShowProgress(true)
    setProgressState({
      current: 0,
      total: imageKeys.length,
      percent: 0,
      status: 'processing',
    })

    try {
      const response = await fetch('/api/studio/download-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageKeys }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Download request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
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
              if (data.type === 'progress') {
                setProgressState({
                  current: data.current,
                  total: data.total,
                  percent: Math.round((data.current / data.total) * 100),
                  status: 'processing',
                  message: data.message,
                })
              } else if (data.type === 'complete') {
                setProgressState({
                  current: data.total || imageKeys.length,
                  total: data.total || imageKeys.length,
                  percent: 100,
                  status: 'complete',
                  message: data.message,
                })
              } else if (data.type === 'error') {
                setProgressState({
                  current: 0,
                  total: 0,
                  percent: 0,
                  status: 'error',
                  message: data.message,
                })
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      clearSelection()
      triggerRefresh()
    } catch (error) {
      console.error('Download error:', error)
      setProgressState({
        current: 0,
        total: 0,
        percent: 0,
        status: 'error',
        message: 'Failed to download from CDN.',
      })
    }
  }, [selectedItems, clearSelection, triggerRefresh])

  const handleCreateFolder = useCallback(async (folderName: string) => {
    setShowNewFolderModal(false)
    
    try {
      const response = await fetch('/api/studio/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPath: currentPath, name: folderName }),
      })

      if (response.ok) {
        triggerRefresh()
      } else {
        const error = await response.json()
        setAlertMessage({
          title: 'Create Folder Failed',
          message: error.error || 'Unknown error',
        })
      }
    } catch (error) {
      console.error('Create folder error:', error)
      setAlertMessage({
        title: 'Create Folder Failed',
        message: 'Failed to create folder. Check console for details.',
      })
    }
  }, [currentPath, triggerRefresh])

  const handleMoveClick = useCallback(() => {
    if (selectedItems.size === 0) return
    setShowMoveModal(true)
  }, [selectedItems])

  const handleMoveConfirm = useCallback(async (destination: string) => {
    const paths = Array.from(selectedItems)
    
    // Show progress modal
    setProgressTitle('Moving Files')
    setShowProgress(true)
    setProgressState({
      current: 0,
      total: paths.length,
      percent: 0,
      status: 'processing',
    })

    try {
      const response = await fetch('/api/studio/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, destination }),
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

            if (data.type === 'start') {
              setProgressState(prev => ({ ...prev, total: data.total }))
            } else if (data.type === 'progress') {
              setProgressState({
                current: data.current,
                total: data.total,
                percent: data.percent,
                currentFile: data.currentFile,
                status: 'processing',
              })
            } else if (data.type === 'complete') {
              setProgressState(prev => ({
                ...prev,
                status: 'complete',
                processed: data.moved,
                errors: data.errors,
                errorMessages: data.errorMessages,
                isMove: true,
              }))
              clearSelection()
              triggerRefresh()
            } else if (data.type === 'error') {
              setProgressState(prev => ({
                ...prev,
                status: 'error',
                errorMessage: data.message,
              }))
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('Move error:', error)
      setProgressState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Failed to move items. Check console for details.',
      }))
    }
  }, [selectedItems, clearSelection, triggerRefresh])

  const { searchQuery, setSearchQuery } = useStudio()
  
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [setSearchQuery])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation() // Prevent closing the studio
      setSearchQuery('')
      ;(e.target as HTMLInputElement).blur()
    }
  }, [setSearchQuery])

  const hasSelection = selectedItems.size > 0
  
  // Check if any selected items are already in our R2 (for Push CDN disabling)
  // Remote images (from other CDNs) can still be pushed to our R2
  const hasR2Selection = hasSelection && Array.from(selectedItems).some(path => {
    const item = fileItems.find(f => f.path === path)
    return item && item.cdnPushed && !item.isRemote
  })
  
  // Check if ALL selected items are R2 cloud files (for Download button)
  const allR2Selection = hasSelection && Array.from(selectedItems).every(path => {
    const item = fileItems.find(f => f.path === path)
    // Only file items, not folders, and must be on R2 (cdnPushed && !isRemote)
    return item && item.type === 'file' && item.cdnPushed && !item.isRemote
  })
  
  // Check if exactly one folder is selected (for rename)
  const selectedPaths = Array.from(selectedItems)
  const singleFolderSelected = selectedPaths.length === 1 && !selectedPaths[0].includes('.')
  const selectedFolderPath = singleFolderSelected ? selectedPaths[0] : null
  const selectedFolderName = selectedFolderPath ? selectedFolderPath.split('/').pop() || '' : ''

  const handleRenameFolder = useCallback(async (newName: string) => {
    if (!selectedFolderPath) return
    setShowRenameFolderModal(false)
    try {
      const response = await fetch('/api/studio/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: selectedFolderPath, newName }),
      })
      if (response.ok) {
        clearSelection()
        triggerRefresh()
      }
    } catch (error) {
      console.error('Failed to rename folder:', error)
    }
  }, [selectedFolderPath, clearSelection, triggerRefresh])

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

      {showSyncConfirm && (
        <ConfirmModal
          title="Push to CDN"
          message={`Push ${syncImageCount} image${syncImageCount !== 1 ? 's' : ''} to Cloudflare R2?${syncHasRemote ? ' Remote images will be downloaded first.' : ''}${syncHasLocal ? ' After pushing, local files will be deleted.' : ''}`}
          confirmLabel="Push"
          onConfirm={handleSyncConfirm}
          onCancel={() => setShowSyncConfirm(false)}
        />
      )}

      {showDownloadConfirm && (
        <ConfirmModal
          title="Download from CDN"
          message={`Download ${downloadImageCount} image${downloadImageCount !== 1 ? 's' : ''} from Cloudflare R2 to local storage? Images will be removed from the CDN.`}
          confirmLabel="Download"
          onConfirm={handleDownloadConfirm}
          onCancel={() => setShowDownloadConfirm(false)}
        />
      )}

      {showProgress && (
        <ProgressModal
          title={progressTitle}
          progress={progressState}
          onStop={handleStopProcessing}
          onDeleteOrphans={handleDeleteOrphans}
          onClose={() => {
            setShowProgress(false)
            setProgressState({
              current: 0,
              total: 0,
              percent: 0,
              status: 'processing',
            })
          }}
        />
      )}

      {showNewFolderModal && (
        <InputModal
          title="New Folder"
          message="Enter a name for the new folder:"
          placeholder="Folder name"
          confirmLabel="Create"
          onConfirm={handleCreateFolder}
          onCancel={() => setShowNewFolderModal(false)}
        />
      )}

      {showMoveModal && (
        <StudioFolderPicker
          selectedItems={selectedItems}
          currentPath={currentPath}
          onMove={(destination) => {
            setShowMoveModal(false)
            handleMoveConfirm(destination)
          }}
          onCancel={() => setShowMoveModal(false)}
        />
      )}

      {showRenameFolderModal && selectedFolderPath && (
        <InputModal
          title="Rename Folder"
          message="Enter a new name for the folder:"
          placeholder={selectedFolderName}
          defaultValue={selectedFolderName}
          confirmLabel="Rename"
          onConfirm={handleRenameFolder}
          onCancel={() => setShowRenameFolderModal(false)}
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

      {showAddNewModal && (
        <AddNewModal
          currentPath={currentPath}
          onClose={() => setShowAddNewModal(false)}
          onUploadComplete={() => {
            setShowAddNewModal(false)
            triggerRefresh()
          }}
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
            onClick={() => setShowAddNewModal(true)}
            disabled={uploading || isInImagesFolder}
          >
            <UploadIcon />
            Add New
          </button>
          <button
            css={styles.btn}
            onClick={() => singleFolderSelected ? setShowRenameFolderModal(true) : setShowNewFolderModal(true)}
            disabled={isInImagesFolder && !singleFolderSelected}
            title={isInImagesFolder && !singleFolderSelected ? 'Cannot create folders in protected images folder' : undefined}
          >
            {singleFolderSelected ? <RenameIcon /> : <FolderPlusIcon />}
            {singleFolderSelected ? 'Rename Folder' : 'New Folder'}
          </button>
          
          <div css={styles.divider} />
          
          <button
            css={styles.btn}
            onClick={handleProcessImages}
            disabled={actionState.showProgress || isInImagesFolder}
            title={isInImagesFolder ? 'Cannot process images folder' : undefined}
          >
            <ImageStackIcon />
            Process Images
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
            onClick={handleMoveClick}
            disabled={!hasSelection}
          >
            <MoveIcon />
            Move
          </button>
          {allR2Selection ? (
            <button
              css={styles.btn}
              onClick={handleDownloadClick}
              disabled={!hasSelection}
            >
              <CloudDownloadIcon />
              Download
            </button>
          ) : (
            <button
              css={styles.btn}
              onClick={handleSyncClick}
              disabled={!hasSelection || hasR2Selection}
              title={hasR2Selection ? 'Selected files are already in R2' : undefined}
            >
              <CloudIcon />
              Push CDN
            </button>
          )}
          <div css={styles.searchWrapper}>
            <input
              css={styles.searchInput}
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <button
                css={styles.searchClearBtn}
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
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
            css={styles.btn}
            onClick={handleScan}
            disabled={scanning}
          >
            <ScanIcon spinning={scanning} />
            Scan
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

function ScanIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg css={[styles.icon, spinning && styles.iconSpin]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

function FolderPlusIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  )
}

function RenameIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function MoveIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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

function CloudDownloadIcon() {
  return (
    <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
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
