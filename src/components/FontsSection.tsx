/** @jsxImportSource @emotion/react */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize } from './tokens'
import { InputModal, ConfirmModal, AlertModal, ProgressModal } from './StudioModal'
import { FontsAssignModal } from './FontsAssignModal'
import { FontsSettings } from './FontsSettings'
import { AddNewFontModal } from './AddNewFontModal'
import { useStreamingOperation } from './useStreamingOperation'
import { FontsToolbar } from './FontsToolbar'
import { FontsGrid } from './FontsGrid'
import { FontsList } from './FontsList'
import type { FileItem } from '../types'
import type { ProgressState } from './StudioContext'
import type { FolderStatus } from './FontsGrid'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const styles = {
  container: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  toolbar: css`
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 16px;
    background-color: ${colors.surface};
    border-bottom: 1px solid ${colors.border};

    @media (min-width: 768px) {
      padding: 12px 24px;
    }
  `,
  content: css`
    flex: 1;
    overflow: auto;
    padding: 20px 24px;
  `,
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 300px;
  `,
  spinner: css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid ${colors.border};
    border-top-color: ${colors.primary};
    animation: ${spin} 0.8s linear infinite;
  `,
  empty: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 300px;
    color: ${colors.textSecondary};
  `,
  emptyIcon: css`
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  `,
  emptyText: css`
    font-size: ${fontSize.base};
    margin: 0 0 4px 0;

    &:last-child {
      color: ${colors.textMuted};
      font-size: ${fontSize.sm};
    }
  `,
  dropOverlay: css`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(99, 91, 255, 0.1);
    border: 3px dashed ${colors.primary};
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    pointer-events: none;
  `,
  dropMessage: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: ${colors.primary};
    font-size: ${fontSize.lg};
    font-weight: 600;
  `,
  dropIcon: css`
    width: 48px;
    height: 48px;
  `,
  createBtn: css`
    margin-top: 16px;
    padding: 10px 24px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.primary};
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: ${colors.primaryHover};
    }
  `,
  folderIcon: css`
    width: 56px;
    height: 56px;
    color: #f9935e;
  `,
}

interface FontsSectionProps {
  currentPath: string
  setCurrentPath: (path: string) => void
  refreshKey: number
  triggerRefresh: () => void
}

export function FontsSection({ currentPath, setCurrentPath, refreshKey, triggerRefresh }: FontsSectionProps) {
  const [items, setItems] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [canCreate, setCanCreate] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false)
  const [showRenameFileModal, setShowRenameFileModal] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [refreshing, setRefreshing] = useState(false)

  // New state for assign workflow
  const [showAddNewModal, setShowAddNewModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState<ProgressState>({ status: 'idle', current: 0, total: 0, percent: 0 })
  const [progressTitle, setProgressTitle] = useState('Processing')
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null)
  const [folderStatuses, setFolderStatuses] = useState<Record<string, FolderStatus>>({})
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const { execute: executeStream, stop: stopStream } = useStreamingOperation({
    setShowProgress,
    setProgressTitle,
    setProgressState: setProgress,
    triggerRefresh,
  })

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/studio/fonts/list?path=${encodeURIComponent(currentPath)}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
        setCanCreate(data.canCreate === true)
      }
    } catch (error) {
      console.error('Failed to fetch fonts:', error)
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [currentPath])

  useEffect(() => {
    fetchItems()
    setSelectedItems(new Set())
  }, [fetchItems, refreshKey])

  // Scan folder statuses for badges
  const scanFolderStatuses = useCallback(async (folders: FileItem[]) => {
    const statuses: Record<string, FolderStatus> = {}

    for (const folder of folders) {
      if (folder.type !== 'folder') continue

      try {
        const res = await fetch('/api/studio/fonts/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: folder.path }),
        })

        if (res.ok) {
          const data = await res.json()
          statuses[folder.path] = {
            needsGeneration: data.needsGeneration,
            hasWoff2: data.woff2Files?.length > 0,
            assignments: data.assignments || [],
          }
        }
      } catch {
        // Ignore errors
      }
    }

    setFolderStatuses(statuses)
  }, [])

  useEffect(() => {
    const folders = items.filter(i => i.type === 'folder')
    if (folders.length > 0 && currentPath.startsWith('_fonts')) {
      scanFolderStatuses(folders)
    }
  }, [items, currentPath, scanFolderStatuses])

  // Filter items by search query
  const filteredItems = searchQuery
    ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items

  const isAtRoot = currentPath === '_fonts'

  const handleItemClick = useCallback((item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation()

    if (e.shiftKey && lastSelectedPath) {
      // Range selection
      const fromIndex = items.findIndex(i => i.path === lastSelectedPath)
      const toIndex = items.findIndex(i => i.path === item.path)

      if (fromIndex !== -1 && toIndex !== -1) {
        const start = Math.min(fromIndex, toIndex)
        const end = Math.max(fromIndex, toIndex)

        setSelectedItems(prev => {
          const next = new Set(prev)
          for (let i = start; i <= end; i++) {
            next.add(items[i].path)
          }
          return next
        })
      }
    } else {
      // Toggle selection
      setSelectedItems(prev => {
        const next = new Set(prev)
        if (next.has(item.path)) {
          next.delete(item.path)
        } else {
          next.add(item.path)
        }
        return next
      })
    }

    setLastSelectedPath(item.path)
  }, [items, lastSelectedPath])

  const handleOpen = useCallback((item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path)
      setSelectedItems(new Set())
    }
  }, [setCurrentPath])

  const handleNavigateUp = useCallback(() => {
    const parts = currentPath.split('/')
    parts.pop()
    const newPath = parts.join('/') || '_fonts'
    setCurrentPath(newPath)
    setSelectedItems(new Set())
  }, [currentPath, setCurrentPath])

  // Select all logic
  const allItemsSelected = items.length > 0 && selectedItems.size === items.length
  const someItemsSelected = selectedItems.size > 0

  const handleSelectAll = useCallback(() => {
    if (allItemsSelected) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.path)))
    }
  }, [allItemsSelected, items])

  const handleClearSelection = useCallback(() => {
    setSelectedItems(new Set())
    setLastSelectedPath(null)
  }, [])

  const handleSelectAllWoff = useCallback(() => {
    const woffFiles = items.filter(item =>
      item.type === 'file' && item.name.toLowerCase().endsWith('.woff2')
    )
    const allWoffSelected = woffFiles.every(item => selectedItems.has(item.path))

    if (allWoffSelected) {
      setSelectedItems(prev => {
        const next = new Set(prev)
        woffFiles.forEach(item => next.delete(item.path))
        return next
      })
    } else {
      setSelectedItems(prev => {
        const next = new Set(prev)
        woffFiles.forEach(item => next.add(item.path))
        return next
      })
    }
  }, [items, selectedItems])

  const handleSelectAllTtf = useCallback(() => {
    const ttfFiles = items.filter(item =>
      item.type === 'file' && item.name.toLowerCase().endsWith('.ttf')
    )
    const allTtfSelected = ttfFiles.every(item => selectedItems.has(item.path))

    if (allTtfSelected) {
      setSelectedItems(prev => {
        const next = new Set(prev)
        ttfFiles.forEach(item => next.delete(item.path))
        return next
      })
    } else {
      setSelectedItems(prev => {
        const next = new Set(prev)
        ttfFiles.forEach(item => next.add(item.path))
        return next
      })
    }
  }, [items, selectedItems])

  const handleCopyPath = useCallback((itemPath: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(itemPath).then(() => {
      setCopiedPath(itemPath)
      setTimeout(() => setCopiedPath(null), 1500)
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchItems()
    setRefreshing(false)
  }, [fetchItems])

  // Check if single folder selected for rename
  const selectedPaths = Array.from(selectedItems)
  const singleFolderSelected = selectedPaths.length === 1 && items.find(i => i.path === selectedPaths[0])?.type === 'folder'
  const selectedFolderPath = singleFolderSelected ? selectedPaths[0] : null
  const selectedFolderName = selectedFolderPath ? selectedFolderPath.split('/').pop() || '' : ''

  // Check if single file selected for rename
  const singleFileSelected = selectedPaths.length === 1 && items.find(i => i.path === selectedPaths[0])?.type === 'file'
  const selectedFilePath = singleFileSelected ? selectedPaths[0] : null
  const selectedFileName = selectedFilePath ? selectedFilePath.split('/').pop() || '' : ''

  // Check if woff2 files are selected for assignment
  const selectedWoff2Files = selectedPaths.filter(path => {
    const item = items.find(i => i.path === path)
    return item?.type === 'file' && item.name.toLowerCase().endsWith('.woff2')
  })
  const hasSelectedWoff2Files = selectedWoff2Files.length > 0
  const canAssign = singleFolderSelected || hasSelectedWoff2Files

  // Handle Assign Web Font button click
  const handleAssignClick = useCallback(() => {
    if (!canAssign) return
    setShowAssignModal(true)
  }, [canAssign])

  // Handle assign confirmation - starts the streaming process
  const handleAssignConfirm = useCallback(async (assignments: string[]) => {
    setShowAssignModal(false)

    const body = singleFolderSelected
      ? { folder: selectedFolderPath, assignments }
      : { files: selectedWoff2Files, assignments }

    await executeStream({
      endpoint: '/api/studio/fonts/assign-stream',
      body,
      title: 'Assigning Web Font',
      operationType: 'process',
    })
  }, [selectedFolderPath, singleFolderSelected, selectedWoff2Files, executeStream])

  const handleProgressClose = useCallback(() => {
    setShowProgress(false)
    setProgress({ status: 'idle', current: 0, total: 0, percent: 0 })
  }, [])

  const handleRenameFolder = useCallback(async (newName: string) => {
    if (!selectedFolderPath) return
    setShowRenameFolderModal(false)

    await executeStream({
      endpoint: '/api/studio/fonts/rename-stream',
      body: { oldPath: selectedFolderPath, newName },
      title: 'Renaming Folder',
      onComplete: () => setSelectedItems(new Set()),
    })
  }, [selectedFolderPath, executeStream])

  const handleRenameFile = useCallback(async (newName: string) => {
    if (!selectedFilePath) return
    setShowRenameFileModal(false)

    try {
      const response = await fetch('/api/studio/fonts/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: selectedFilePath, newName }),
      })
      if (response.ok) {
        setSelectedItems(new Set())
        triggerRefresh()
      }
    } catch (error) {
      console.error('Rename file failed:', error)
    }
  }, [selectedFilePath, triggerRefresh])

  const handleDeleteClick = useCallback(() => {
    if (selectedItems.size === 0) return
    setShowDeleteConfirm(true)
  }, [selectedItems.size])

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false)

    await executeStream({
      endpoint: '/api/studio/fonts/delete-stream',
      body: { paths: Array.from(selectedItems) },
      title: 'Deleting Files',
      operationType: 'delete',
      onComplete: () => setSelectedItems(new Set()),
    })
  }, [selectedItems, executeStream])

  const handleNewFolderClick = useCallback(() => {
    setShowNewFolderModal(true)
  }, [])

  const handleCreateFolder = useCallback(async (name: string) => {
    setShowNewFolderModal(false)

    try {
      const response = await fetch('/api/studio/fonts/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath, name }),
      })
      if (response.ok) {
        triggerRefresh()
      }
    } catch (error) {
      console.error('Create folder failed:', error)
    }
  }, [currentPath, triggerRefresh])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only allow drops in _fonts paths
    if (currentPath.startsWith('_fonts')) {
      setIsDragging(true)
    }
  }, [currentPath])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!currentPath.startsWith('_fonts')) return

    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.toLowerCase().endsWith('.ttf') || f.name.toLowerCase().endsWith('.otf')
    )

    if (files.length === 0) return

    setProgressTitle('Uploading Files')
    setShowProgress(true)
    setProgress({ status: 'processing', current: 0, total: files.length, percent: 0, message: 'Uploading...' })

    let uploaded = 0
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
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
      } catch (error) {
        console.error('Upload failed:', error)
        errors.push(file.name)
      }

      setProgress({
        status: 'processing',
        current: i + 1,
        total: files.length,
        percent: Math.round(((i + 1) / files.length) * 100),
        message: `Uploaded ${file.name}`,
      })
    }

    setProgress({
      status: errors.length > 0 ? 'error' : 'complete',
      current: files.length,
      total: files.length,
      percent: 100,
      message: `Uploaded ${uploaded} file${uploaded !== 1 ? 's' : ''}${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
    })

    triggerRefresh()
  }, [currentPath, triggerRefresh])

  if (isLoading) {
    return (
      <div css={styles.container}>
        <div css={styles.toolbar} />
        <div css={styles.loading}>
          <div css={styles.spinner} />
        </div>
      </div>
    )
  }

  const showUploadButton = currentPath.startsWith('_fonts')

  return (
    <div css={styles.container}>
      <FontsToolbar
        showUploadButton={showUploadButton}
        selectedItems={selectedItems}
        someItemsSelected={someItemsSelected}
        singleFileSelected={singleFileSelected}
        singleFolderSelected={singleFolderSelected}
        canAssign={canAssign}
        hasSelectedWoff2Files={hasSelectedWoff2Files}
        selectedWoff2Files={selectedWoff2Files}
        refreshing={refreshing}
        viewMode={viewMode}
        searchQuery={searchQuery}
        onAddNew={() => setShowAddNewModal(true)}
        onRenameFile={() => setShowRenameFileModal(true)}
        onRenameFolder={() => setShowRenameFolderModal(true)}
        onNewFolder={handleNewFolderClick}
        onDelete={handleDeleteClick}
        onAssign={handleAssignClick}
        onClearSelection={handleClearSelection}
        onSearchChange={e => setSearchQuery(e.target.value)}
        onRefresh={handleRefresh}
        onViewModeChange={setViewMode}
        onShowSettings={() => setShowSettings(true)}
      />

      <div
        css={styles.content}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ position: 'relative' }}
      >
        {isDragging && (
          <div css={styles.dropOverlay}>
            <div css={styles.dropMessage}>
              <UploadIcon />
              <span>Drop TTF/OTF files to upload</span>
            </div>
          </div>
        )}

        {filteredItems.length === 0 && canCreate && !searchQuery ? (
          <div css={styles.empty}>
            <span css={styles.emptyIcon}>
              <FolderIcon />
            </span>
            <p css={styles.emptyText}>Folder doesn't exist</p>
            <button css={styles.createBtn} onClick={handleNewFolderClick}>
              Create Folder
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <FontsGrid
            items={items}
            filteredItems={filteredItems}
            selectedItems={selectedItems}
            allItemsSelected={allItemsSelected}
            someItemsSelected={someItemsSelected}
            copiedPath={copiedPath}
            folderStatuses={folderStatuses}
            isAtRoot={isAtRoot}
            onItemClick={handleItemClick}
            onOpen={handleOpen}
            onNavigateUp={handleNavigateUp}
            onSelectAll={handleSelectAll}
            onSelectAllWoff={handleSelectAllWoff}
            onSelectAllTtf={handleSelectAllTtf}
            onCopyPath={handleCopyPath}
          />
        ) : (
          <FontsList
            items={items}
            filteredItems={filteredItems}
            selectedItems={selectedItems}
            allItemsSelected={allItemsSelected}
            someItemsSelected={someItemsSelected}
            copiedPath={copiedPath}
            folderStatuses={folderStatuses}
            isAtRoot={isAtRoot}
            onItemClick={handleItemClick}
            onOpen={handleOpen}
            onNavigateUp={handleNavigateUp}
            onSelectAll={handleSelectAll}
            onSelectAllWoff={handleSelectAllWoff}
            onSelectAllTtf={handleSelectAllTtf}
            onCopyPath={handleCopyPath}
          />
        )}
      </div>

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

      {showRenameFileModal && selectedFilePath && (
        <InputModal
          title="Rename File"
          message="Enter a new name for the file:"
          placeholder={selectedFileName}
          defaultValue={selectedFileName}
          confirmLabel="Rename"
          onConfirm={handleRenameFile}
          onCancel={() => setShowRenameFileModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Items"
          message={`Are you sure you want to delete ${selectedItems.size} item${selectedItems.size !== 1 ? 's' : ''}? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showAddNewModal && (
        <AddNewFontModal
          currentPath={currentPath}
          onClose={() => setShowAddNewModal(false)}
          onUploadComplete={() => {
            setShowAddNewModal(false)
            triggerRefresh()
          }}
          setShowProgress={setShowProgress}
          setProgressTitle={setProgressTitle}
          setProgress={setProgress}
        />
      )}

      {showAssignModal && canAssign && (
        <FontsAssignModal
          folderPath={singleFolderSelected ? selectedFolderPath! : undefined}
          selectedFiles={hasSelectedWoff2Files ? selectedWoff2Files : undefined}
          onConfirm={handleAssignConfirm}
          onCancel={() => setShowAssignModal(false)}
        />
      )}

      {showProgress && (
        <ProgressModal
          title={progressTitle}
          progress={progress}
          onClose={handleProgressClose}
          onStop={stopStream}
        />
      )}

      {showSettings && (
        <FontsSettings
          onClose={() => setShowSettings(false)}
          onRefresh={triggerRefresh}
        />
      )}

      {alertModal && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  )
}

// Icons still used by FontsSection (drop overlay and empty state)

function UploadIcon() {
  return (
    <svg css={styles.dropIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
    </svg>
  )
}

export default FontsSection
