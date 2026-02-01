'use client'

import { useState, useCallback, useRef } from 'react'
import type { ActionState, ProgressState } from './StudioContext'
import type { FileItem } from '../types'

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
  const abortControllerRef = useRef<AbortController | null>(null)

  // Helper to update progress state
  const setProgressState = useCallback((update: Partial<ProgressState> | ((prev: ProgressState) => ProgressState)) => {
    setActionState(prev => ({
      ...prev,
      progressState: typeof update === 'function' 
        ? update(prev.progressState) 
        : { ...prev.progressState, ...update }
    }))
  }, [])

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

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
      showProgress: true,
      progressTitle: 'Moving Files',
      progressState: {
        current: 0,
        total: paths.length,
        percent: 0,
        status: 'processing',
        message: 'Moving files...',
      },
    }))

    try {
      const response = await fetch('/api/studio/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, destination }),
      })

      if (!response.ok) {
        const error = await response.json()
        setProgressState({
          status: 'error',
          message: error.error || 'Move failed',
        })
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
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
                
                if (data.type === 'start') {
                  setProgressState(prev => ({ ...prev, total: data.total }))
                } else if (data.type === 'progress') {
                  setProgressState({
                    current: data.current,
                    total: data.total,
                    percent: Math.round((data.current / data.total) * 100),
                    status: 'processing',
                    message: data.message,
                  })
                } else if (data.type === 'complete') {
                  setProgressState(prev => ({
                    ...prev,
                    status: 'complete',
                    message: `Moved ${data.moved} file${data.moved !== 1 ? 's' : ''}${data.errors > 0 ? `, ${data.errors} error${data.errors !== 1 ? 's' : ''}` : ''}`,
                  }))
                  if (data.errors > 0 && data.errorMessages?.length > 0) {
                    showError('Move Failed', data.errorMessages.join('\n'))
                  }
                  clearSelection()
                  setFocusedItem(null)
                  triggerRefresh()
                } else if (data.type === 'error') {
                  setProgressState(prev => ({
                    ...prev,
                    status: 'error',
                    message: data.message || 'Unknown error',
                  }))
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }
    } catch (error) {
      console.error('Move error:', error)
      setProgressState(prev => ({
        ...prev,
        status: 'error',
        message: 'Failed to move files. Check console for details.',
      }))
    }
  }, [actionState.actionPaths, clearSelection, setFocusedItem, triggerRefresh, showError, setProgressState])

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
    const progressTitle = isRemove ? 'Removing Thumbnails' : 'Generating Thumbnails'
    const progressMessage = isRemove ? 'Removing thumbnails...' : 'Generating thumbnails...'
    
    setActionState(prev => ({
      ...prev,
      showProcessConfirm: false,
      showProgress: true,
      progressTitle,
      progressState: {
        current: 0,
        total: imageKeys.length,
        percent: 0,
        status: 'processing',
        message: progressMessage,
      },
    }))

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageKeys }),
        signal,
      })

      if (!response.ok) {
        const error = await response.json()
        setProgressState({
          current: 0,
          total: imageKeys.length,
          percent: 0,
          status: 'error',
          message: error.error || (isRemove ? 'Failed to remove thumbnails' : 'Processing failed'),
        })
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
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
                
                if (data.type === 'start') {
                  setProgressState(prev => ({
                    ...prev,
                    total: data.total,
                  }))
                } else if (data.type === 'progress') {
                  setProgressState({
                    current: data.current,
                    total: data.total,
                    percent: data.percent,
                    status: 'processing',
                    message: data.message,
                  })
                } else if (data.type === 'cleanup') {
                  setProgressState(prev => ({
                    ...prev,
                    status: 'cleanup',
                    message: data.message,
                  }))
                } else if (data.type === 'complete') {
                  setProgressState({
                    current: data.processed,
                    total: data.processed,
                    percent: 100,
                    status: data.errors > 0 ? 'error' : 'complete',
                    message: data.message,
                  })
                  triggerRefresh()
                } else if (data.type === 'error') {
                  setProgressState(prev => ({
                    ...prev,
                    status: 'error',
                    message: data.message,
                  }))
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }
    } catch (error) {
      if (signal.aborted) {
        setProgressState(prev => ({
          ...prev,
          status: 'stopped',
          message: isRemove ? 'Removal stopped by user' : 'Processing stopped by user',
        }))
      } else {
        console.error('Processing error:', error)
        setProgressState({
          current: 0,
          total: imageKeys.length,
          percent: 0,
          status: 'error',
          message: isRemove ? 'Failed to remove thumbnails. Check console for details.' : 'Processing failed. Check console for details.',
        })
      }
    } finally {
      abortControllerRef.current = null
    }
  }, [actionState.actionPaths, actionState.processMode, triggerRefresh, setProgressState])

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

  return {
    actionState,
    setActionState,
    abortController: abortControllerRef.current,
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
  }
}
