/** @jsxImportSource @emotion/react */
'use client'

import { useEffect, useCallback, useState } from 'react'
import { css } from '@emotion/react'
import { StudioContext } from './StudioContext'
import { StudioToolbar } from './StudioToolbar'
import { StudioFileGrid } from './StudioFileGrid'
import { StudioFileList } from './StudioFileList'
import { StudioDetailView } from './StudioDetailView'
import { StudioSettings } from './StudioSettings'
import { ErrorModal } from './ErrorModal'
import { ConfirmModal, ProgressModal } from './StudioModal'
import { StudioFolderPicker } from './StudioFolderPicker'
import { useStudioActions } from './useStudioActions'
import { colors, fontSize, baseReset } from './tokens'
import type { FileItem, LeanMeta } from '../types'

interface StudioUIProps {
  onClose?: () => void
  isVisible?: boolean
  standaloneMode?: boolean
  workspacePath?: string
}

// Standard button height for consistency
const btnHeight = '36px'

const styles = {
  container: css`
    ${baseReset}
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${colors.background};
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: ${colors.surface};
    border-bottom: 1px solid ${colors.border};
    position: relative;
  `,
  title: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
    letter-spacing: -0.02em;
    flex-shrink: 0;
  `,
  headerLeft: css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  `,
  headerCenter: css`
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    max-width: 50%;
  `,
  breadcrumbs: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${fontSize.base};
    color: ${colors.textSecondary};
    overflow: hidden;
  `,
  breadcrumbSeparator: css`
    color: ${colors.border};
    flex-shrink: 0;
  `,
  breadcrumbItem: css`
    color: ${colors.textSecondary};
    text-decoration: none;
    cursor: pointer;
    transition: color 0.15s ease;
    white-space: nowrap;
    
    &:hover {
      color: ${colors.primary};
    }
  `,
  breadcrumbCurrent: css`
    color: ${colors.text};
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  headerBtn: css`
    height: ${btnHeight};
    padding: 0 12px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  headerIcon: css`
    width: 16px;
    height: 16px;
    color: ${colors.textSecondary};
  `,
  workspacePath: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
    padding: 0 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  `,
  content: css`
    flex: 1;
    display: flex;
    overflow: hidden;
  `,
  fileBrowser: css`
    flex: 1;
    min-width: 0;
    overflow: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
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
}

/**
 * Main Studio UI - contains all panels and manages internal state
 * Rendered inside the modal via lazy loading
 */
export function StudioUI({ 
  onClose, 
  isVisible = true,
  standaloneMode = false,
  workspacePath,
}: StudioUIProps) {
  // In standalone mode, onClose is a no-op
  const handleClose = onClose || (() => {})
  const [currentPath, setCurrentPathInternal] = useState('public')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [focusedItem, setFocusedItem] = useState<FileItem | null>(null)
  const [meta, setMeta] = useState<LeanMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [scanRequested, setScanRequested] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<{ title: string; message: string } | null>(null)
  const [fileItems, setFileItems] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const triggerScan = useCallback(() => {
    setScanRequested(true)
  }, [])

  const clearScanRequest = useCallback(() => {
    setScanRequested(false)
  }, [])

  const showError = useCallback((title: string, message: string) => {
    setError({ title, message })
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    // Don't allow drops in the images folder
    if (currentPath === 'public/images' || currentPath.startsWith('public/images/')) {
      return
    }

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', currentPath)

      try {
        await fetch('/api/studio/upload', {
          method: 'POST',
          body: formData,
        })
      } catch (error) {
        console.error('Upload error:', error)
      }
    }
    triggerRefresh()
  }, [currentPath, triggerRefresh])

  const navigateUp = useCallback(() => {
    if (currentPath === 'public') return
    const parts = currentPath.split('/')
    parts.pop()
    setCurrentPathInternal(parts.join('/') || 'public')
    setSelectedItems(new Set())
  }, [currentPath])

  const setCurrentPath = useCallback((path: string) => {
    setCurrentPathInternal(path)
    setSelectedItems(new Set())
    setFocusedItem(null)
  }, [])

  const toggleSelection = useCallback((path: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
    setLastSelectedPath(path)
  }, [])

  const selectRange = useCallback((fromPath: string, toPath: string, allItems: FileItem[]) => {
    const fromIndex = allItems.findIndex(item => item.path === fromPath)
    const toIndex = allItems.findIndex(item => item.path === toPath)
    
    if (fromIndex === -1 || toIndex === -1) return
    
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    
    setSelectedItems((prev) => {
      const next = new Set(prev)
      for (let i = start; i <= end; i++) {
        next.add(allItems[i].path)
      }
      return next
    })
    setLastSelectedPath(toPath)
  }, [])

  const selectAll = useCallback((items: FileItem[]) => {
    setSelectedItems(new Set(items.map((item) => item.path)))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  // Shared action handlers
  const setFocusedItemCallback = useCallback((item: FileItem | null) => {
    setFocusedItem(item)
  }, [])

  const actions = useStudioActions({
    triggerRefresh,
    clearSelection,
    setFocusedItem: setFocusedItemCallback,
    showError,
  })

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't close if user is in an input field (e.g., search)
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return
        }
        
        if (focusedItem) {
          setFocusedItem(null)
        } else if (!standaloneMode) {
          handleClose()
        }
      }
    },
    [handleClose, focusedItem, standaloneMode]
  )

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown, isVisible])

  const contextValue = {
    isOpen: true,
    openStudio: () => {},
    closeStudio: handleClose,
    toggleStudio: handleClose,
    currentPath,
    setCurrentPath,
    navigateUp,
    selectedItems,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    lastSelectedPath,
    viewMode,
    setViewMode,
    focusedItem,
    setFocusedItem,
    meta,
    setMeta,
    isLoading,
    setIsLoading,
    refreshKey,
    triggerRefresh,
    scanRequested,
    triggerScan,
    clearScanRequest,
    searchQuery,
    setSearchQuery,
    error,
    showError,
    clearError,
    fileItems,
    setFileItems,
    // Shared action state and handlers
    actionState: actions.actionState,
    requestDelete: actions.requestDelete,
    requestMove: actions.requestMove,
    requestSync: actions.requestSync,
    requestProcess: actions.requestProcess,
    setProcessMode: actions.setProcessMode,
    confirmDelete: actions.confirmDelete,
    confirmMove: actions.confirmMove,
    confirmSync: actions.confirmSync,
    confirmProcess: actions.confirmProcess,
    cancelAction: actions.cancelAction,
    closeProgress: actions.closeProgress,
    stopProcessing: actions.stopProcessing,
    abortController: actions.abortController,
    deleteOrphans: actions.deleteOrphans,
  }

  return (
    <StudioContext.Provider value={contextValue}>
      <div css={styles.container}>
        <div css={styles.header}>
          <div css={styles.headerLeft}>
            <h1 css={styles.title}>Studio</h1>
          </div>
          <div css={styles.headerCenter}>
            <Breadcrumbs currentPath={currentPath} onNavigate={setCurrentPath} />
          </div>
          <div css={styles.headerActions}>
            {standaloneMode && workspacePath && (
              <span css={styles.workspacePath} title={workspacePath}>
                {workspacePath.length > 30 ? '...' + workspacePath.slice(-27) : workspacePath}
              </span>
            )}
            <StudioSettings />
            {!standaloneMode && (
              <button
                css={styles.headerBtn}
                onClick={handleClose}
                aria-label="Close Studio"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        <StudioToolbar />

        <div 
          css={styles.content}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div css={styles.dropOverlay}>
              <div css={styles.dropMessage}>
                <svg css={styles.dropIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Drop files to upload</span>
              </div>
            </div>
          )}
          <div css={styles.fileBrowser}>
            {viewMode === 'grid' ? <StudioFileGrid /> : <StudioFileList />}
          </div>
        </div>
        
        {/* Detail view as modal overlay */}
        {focusedItem && <StudioDetailView />}

        {/* Error modal */}
        <ErrorModal />

        {/* Shared action modals */}
        {actions.actionState.showDeleteConfirm && (
          <ConfirmModal
            title="Delete Files"
            message={`Are you sure you want to delete ${actions.actionState.actionPaths.length} item${actions.actionState.actionPaths.length !== 1 ? 's' : ''}? This action cannot be undone.`}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={actions.confirmDelete}
            onCancel={actions.cancelAction}
          />
        )}

        {actions.actionState.showSyncConfirm && (
          <ConfirmModal
            title="Push to CDN"
            message={`Push ${actions.actionState.syncImageCount} image${actions.actionState.syncImageCount !== 1 ? 's' : ''} to Cloudflare R2?${actions.actionState.syncHasRemote ? ' Remote images will be downloaded first.' : ''}${actions.actionState.syncHasLocal ? ' After pushing, local files will be deleted.' : ''}`}
            confirmLabel="Push"
            onConfirm={actions.confirmSync}
            onCancel={actions.cancelAction}
          />
        )}

        {actions.actionState.showProcessConfirm && (
          <ProcessConfirmModal
            imageCount={actions.actionState.actionPaths.length}
            mode={actions.actionState.processMode}
            onModeChange={actions.setProcessMode}
            onConfirm={actions.confirmProcess}
            onCancel={actions.cancelAction}
          />
        )}

        {actions.actionState.showMoveModal && (
          <StudioFolderPicker
            selectedItems={new Set(actions.actionState.actionPaths)}
            currentPath={currentPath}
            onMove={(destination) => actions.confirmMove(destination)}
            onCancel={actions.cancelAction}
          />
        )}

        {actions.actionState.showProgress && (
          <ProgressModal
            title={actions.actionState.progressTitle}
            progress={actions.actionState.progressState}
            onStop={actions.stopProcessing}
            onDeleteOrphans={actions.deleteOrphans}
            onClose={actions.closeProgress}
          />
        )}
      </div>
    </StudioContext.Provider>
  )
}

interface ProcessConfirmModalProps {
  imageCount: number
  mode: 'generate' | 'remove'
  onModeChange: (mode: 'generate' | 'remove') => void
  onConfirm: () => void
  onCancel: () => void
}

function ProcessConfirmModal({ imageCount, mode, onModeChange, onConfirm, onCancel }: ProcessConfirmModalProps) {
  const processModalStyles = {
    overlay: css`
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `,
    container: css`
      background: ${colors.surface};
      border-radius: 12px;
      padding: 24px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    `,
    title: css`
      font-size: ${fontSize.lg};
      font-weight: 600;
      color: ${colors.text};
      margin: 0 0 16px;
    `,
    modeToggle: css`
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    `,
    modeBtn: css`
      flex: 1;
      padding: 10px 16px;
      border: 2px solid ${colors.border};
      border-radius: 8px;
      background: ${colors.background};
      color: ${colors.textSecondary};
      font-size: ${fontSize.base};
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      
      &:hover {
        border-color: ${colors.borderHover};
      }
    `,
    modeBtnActive: css`
      border-color: ${colors.primary};
      background: rgba(99, 91, 255, 0.1);
      color: ${colors.primary};
    `,
    modeBtnDanger: css`
      border-color: ${colors.danger};
      background: rgba(239, 68, 68, 0.1);
      color: ${colors.danger};
    `,
    message: css`
      font-size: ${fontSize.base};
      color: ${colors.textSecondary};
      margin: 0 0 20px;
      line-height: 1.5;
    `,
    actions: css`
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `,
    cancelBtn: css`
      padding: 10px 20px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      background: ${colors.background};
      color: ${colors.text};
      font-size: ${fontSize.base};
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      
      &:hover {
        background: ${colors.surfaceHover};
        border-color: ${colors.borderHover};
      }
    `,
    confirmBtn: css`
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: ${colors.primary};
      color: white;
      font-size: ${fontSize.base};
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      
      &:hover {
        background: ${colors.primaryHover};
      }
    `,
    confirmBtnDanger: css`
      background: ${colors.danger};
      
      &:hover {
        background: #dc2626;
      }
    `,
  }

  const isRemove = mode === 'remove'
  const title = 'Process Images'
  const message = isRemove
    ? `Remove generated thumbnails for ${imageCount} image${imageCount !== 1 ? 's' : ''}? Original images will be kept.`
    : `Generate thumbnails for ${imageCount} image${imageCount !== 1 ? 's' : ''}?`
  const confirmLabel = isRemove ? 'Remove' : 'Process'

  return (
    <div css={processModalStyles.overlay} onClick={onCancel}>
      <div css={processModalStyles.container} onClick={e => e.stopPropagation()}>
        <h2 css={processModalStyles.title}>{title}</h2>
        
        <div css={processModalStyles.modeToggle}>
          <button
            css={[processModalStyles.modeBtn, mode === 'generate' && processModalStyles.modeBtnActive]}
            onClick={() => onModeChange('generate')}
          >
            Generate Thumbnails
          </button>
          <button
            css={[processModalStyles.modeBtn, mode === 'remove' && processModalStyles.modeBtnDanger]}
            onClick={() => onModeChange('remove')}
          >
            Remove Thumbnails
          </button>
        </div>
        
        <p css={processModalStyles.message}>{message}</p>
        
        <div css={processModalStyles.actions}>
          <button css={processModalStyles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button 
            css={[processModalStyles.confirmBtn, isRemove && processModalStyles.confirmBtnDanger]} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function Breadcrumbs({ currentPath, onNavigate }: { currentPath: string; onNavigate: (path: string) => void }) {
  const parts = currentPath.split('/').filter(Boolean)
  
  // Build paths for each breadcrumb
  const breadcrumbs = parts.map((part, index) => ({
    name: part,
    path: parts.slice(0, index + 1).join('/')
  }))

  return (
    <div css={styles.breadcrumbs}>
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {index > 0 && <span css={styles.breadcrumbSeparator}>/</span>}
          {index === breadcrumbs.length - 1 ? (
            <span css={styles.breadcrumbCurrent}>{crumb.name}</span>
          ) : (
            <span
              css={styles.breadcrumbItem}
              onClick={() => onNavigate(crumb.path)}
            >
              {crumb.name}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      css={styles.headerIcon}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default StudioUI
