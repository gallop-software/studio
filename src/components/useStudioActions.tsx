'use client'

import { useState, useCallback } from 'react'
import type { ActionState, ProgressState } from './StudioContext'
import type { FileItem } from '../types'
import { useStreamingOperation } from './useStreamingOperation'

const defaultActionState: ActionState = {
  showProgress: false,
  progressTitle: '',
  progressState: { current: 0, total: 0, percent: 0, status: 'processing' },
  showDeleteConfirm: false,
  showMoveModal: false,
  showSyncConfirm: false,
  showProcessConfirm: false,
  showDownloadConfirm: false,
  actionPaths: [],
  syncImageCount: 0,
  syncHasRemote: false,
  syncHasLocal: false,
  processMode: 'generate',
  downloadImageCount: 0,
  downloadTotalSelected: 0,
}

interface UseStudioActionsProps {
  triggerRefresh: () => void
  clearSelection: () => void
  setFocusedItem: (item: FileItem | null) => void
  showError: (title: string, message: string) => void
}

export function useStudioActions({
  triggerRefresh,
  clearSelection,
  setFocusedItem,
  showError,
}: UseStudioActionsProps) {
  const [actionState, setActionState] = useState<ActionState>(defaultActionState)

  // Helper to update progress state
  const setProgressState = useCallback((update: Partial<ProgressState> | ((prev: ProgressState) => ProgressState)) => {
    setActionState(prev => ({
      ...prev,
      progressState: typeof update === 'function' 
        ? update(prev.progressState) 
        : { ...prev.progressState, ...update }
    }))
  }, [])

  // Helper to show/hide progress modal
  const setShowProgress = useCallback((show: boolean) => {
    setActionState(prev => ({
      ...prev,
      showProgress: show,
    }))
  }, [])

  // Helper to set progress title
  const setProgressTitle = useCallback((title: string) => {
    setActionState(prev => ({
      ...prev,
      progressTitle: title,
    }))
  }, [])

  // Unified streaming operation hook
  const streamingOperation = useStreamingOperation({
    setShowProgress,
    setProgressTitle,
    setProgressState,
    triggerRefresh,
  })

  // Request handlers (show confirmation modals)
  const requestDelete = useCallback((paths: string[]) => {
    setActionState(prev => ({
      ...prev,
      actionPaths: paths,
      showDeleteConfirm: true,
    }))
  }, [])

  const requestMove = useCallback((paths: string[]) => {
    setActionState(prev => ({
      ...prev,
      actionPaths: paths,
      showMoveModal: true,
    }))
  }, [])

  const requestSync = useCallback((paths: string[], fileItems: FileItem[]) => {
    // Calculate sync info
    const imageKeys = paths.map(p => '/' + p.replace(/^public\//, ''))
    let hasRemote = false
    let hasLocal = false
    
    for (const path of paths) {
      const item = fileItems.find(f => f.path === path)
      if (item) {
        if (item.isRemote) {
          hasRemote = true
        } else if (!item.cdnPushed) {
          hasLocal = true
        }
      }
    }
    
    setActionState(prev => ({
      ...prev,
      actionPaths: paths,
      syncImageCount: imageKeys.length,
      syncHasRemote: hasRemote,
      syncHasLocal: hasLocal,
      showSyncConfirm: true,
    }))
  }, [])

  const requestDownload = useCallback((paths: string[], fileItems: FileItem[]) => {
    // Calculate downloadable files (those in R2, not remote)
    const downloadable: string[] = []
    
    for (const path of paths) {
      const item = fileItems.find(f => f.path === path)
      if (item && item.cdnPushed && !item.isRemote) {
        downloadable.push(path)
      }
    }
    
    setActionState(prev => ({
      ...prev,
      actionPaths: downloadable,
      downloadImageCount: downloadable.length,
      downloadTotalSelected: paths.length,
      showDownloadConfirm: true,
    }))
  }, [])

  const requestProcess = useCallback((paths: string[]) => {
    setActionState(prev => ({
      ...prev,
      actionPaths: paths,
      showProcessConfirm: true,
      // Keep processMode as-is - it should be set by setProcessMode before this call
    }))
  }, [])

  const setProcessMode = useCallback((mode: 'generate' | 'remove') => {
    setActionState(prev => ({
      ...prev,
      processMode: mode,
    }))
  }, [])

  // Cancel action
  const cancelAction = useCallback(() => {
    setActionState(prev => ({
      ...prev,
      showDeleteConfirm: false,
      showMoveModal: false,
      showSyncConfirm: false,
      showProcessConfirm: false,
      showDownloadConfirm: false,
    }))
  }, [])

  // Close progress modal
  const closeProgress = useCallback(() => {
    setActionState(defaultActionState)
  }, [])

  // Stop processing
  const stopProcessing = useCallback(() => {
    streamingOperation.stop()
  }, [streamingOperation])

  // Confirm delete
  const confirmDelete = useCallback(async () => {
    const paths = actionState.actionPaths
    setActionState(prev => ({ ...prev, showDeleteConfirm: false }))
    
    try {
      const response = await fetch('/api/studio/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })

      if (response.ok) {
        clearSelection()
        setFocusedItem(null)
        triggerRefresh()
      } else {
        const error = await response.json()
        showError('Delete Failed', error.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Delete error:', error)
      showError('Delete Failed', 'Delete failed. Check console for details.')
    }
  }, [actionState.actionPaths, clearSelection, setFocusedItem, triggerRefresh, showError])

  // Confirm move
  const confirmMove = useCallback(async (destination: string) => {
    const paths = actionState.actionPaths
    setActionState(prev => ({
      ...prev,
      showMoveModal: false,
    }))

    await streamingOperation.execute({
      endpoint: '/api/studio/move',
      body: { paths, destination },
      title: 'Moving Files',
      onComplete: (event) => {
        if (event.errors && event.errors > 0 && event.errorMessages?.length) {
          showError('Move Failed', event.errorMessages.join('\n'))
        }
        clearSelection()
        setFocusedItem(null)
      },
    })
  }, [actionState.actionPaths, clearSelection, setFocusedItem, showError, streamingOperation])

  // Confirm sync (push to CDN)
  const confirmSync = useCallback(async () => {
    const paths = actionState.actionPaths
    const imageKeys = paths.map(p => '/' + p.replace(/^public\//, ''))
    
    setActionState(prev => ({
      ...prev,
      showSyncConfirm: false,
      showProgress: true,
      progressTitle: 'Pushing to CDN',
      progressState: {
        current: 0,
        total: imageKeys.length,
        percent: 0,
        status: 'processing',
        message: 'Pushing to CDN...',
      },
    }))

    let pushed = 0
    const errors: string[] = []

    for (let i = 0; i < imageKeys.length; i++) {
      const imageKey = imageKeys[i]

      try {
        const response = await fetch('/api/studio/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageKeys: [imageKey] }),
        })

        if (response.ok) {
          pushed++
        } else {
          const data = await response.json()
          errors.push(`${imageKey}: ${data.error || 'Unknown error'}`)
        }
      } catch (error) {
        errors.push(`${imageKey}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Update progress AFTER processing each file
      setProgressState({
        current: i + 1,
        total: imageKeys.length,
        percent: Math.round(((i + 1) / imageKeys.length) * 100),
        status: 'processing',
        message: `Pushed ${imageKey}`,
      })
    }

    setProgressState({
      current: imageKeys.length,
      total: imageKeys.length,
      percent: 100,
      status: errors.length > 0 ? 'error' : 'complete',
      message: `Pushed ${pushed} file${pushed !== 1 ? 's' : ''}${errors.length > 0 ? `, ${errors.length} error${errors.length !== 1 ? 's' : ''}` : ''}`,
    })

    if (errors.length > 0) {
      showError('Push Errors', errors.join('\n'))
    }

    clearSelection()
    triggerRefresh()
  }, [actionState.actionPaths, clearSelection, triggerRefresh, showError, setProgressState])

  // Confirm process (generate or remove thumbnails based on mode)
  const confirmProcess = useCallback(async () => {
    const paths = actionState.actionPaths
    const mode = actionState.processMode
    const imageKeys = paths.map(p => {
      const key = p.replace(/^public\//, '')
      return key.startsWith('/') ? key : `/${key}`
    })
    
    const isRemove = mode === 'remove'
    const endpoint = isRemove ? '/api/studio/unprocess-stream' : '/api/studio/reprocess-stream'
    const title = isRemove ? 'Removing Thumbnails' : 'Generating Thumbnails'
    
    setActionState(prev => ({
      ...prev,
      showProcessConfirm: false,
    }))

    await streamingOperation.execute({
      endpoint,
      body: { imageKeys },
      title,
    })
  }, [actionState.actionPaths, actionState.processMode, streamingOperation])

  // Delete orphans
  const deleteOrphans = useCallback(async () => {
    const orphanedFiles = actionState.progressState.orphanedFiles
    if (!orphanedFiles || orphanedFiles.length === 0) return

    try {
      const response = await fetch('/api/studio/delete-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: orphanedFiles }),
      })

      if (response.ok) {
        setProgressState(prev => ({
          ...prev,
          orphanedFiles: undefined,
          message: prev.message?.replace(/Found \d+ orphaned thumbnail\(s\).*/, 'Orphaned thumbnails deleted.'),
        }))
        triggerRefresh()
      } else {
        const error = await response.json()
        showError('Delete Failed', error.error || 'Failed to delete orphaned files')
      }
    } catch (error) {
      console.error('Delete orphans error:', error)
      showError('Delete Failed', 'Failed to delete orphaned files. Check console for details.')
    }
  }, [actionState.progressState.orphanedFiles, triggerRefresh, showError, setProgressState])

  // Upload files with progress modal
  const uploadFiles = useCallback(async (files: File[], targetPath: string) => {
    if (files.length === 0) return

    setProgressTitle('Uploading Files')
    setShowProgress(true)
    setProgressState({
      current: 0,
      total: files.length,
      percent: 0,
      status: 'processing',
      message: 'Uploading...',
    })

    let uploaded = 0
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', targetPath)

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
      } catch (error) {
        console.error('Upload error:', error)
        errors.push(file.name)
      }

      setProgressState({
        current: i + 1,
        total: files.length,
        percent: Math.round(((i + 1) / files.length) * 100),
        status: 'processing',
        message: `Uploaded ${file.name}`,
      })
    }

    setProgressState({
      current: files.length,
      total: files.length,
      percent: 100,
      status: errors.length > 0 ? 'error' : 'complete',
      message: `Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''}${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
    })

    triggerRefresh()
  }, [setShowProgress, setProgressTitle, setProgressState, triggerRefresh])

  return {
    actionState,
    setActionState,
    requestDelete,
    requestMove,
    requestSync,
    requestDownload,
    requestProcess,
    setProcessMode,
    cancelAction,
    closeProgress,
    stopProcessing,
    confirmDelete,
    confirmMove,
    confirmSync,
    confirmProcess,
    deleteOrphans,
    uploadFiles,
  }
}
