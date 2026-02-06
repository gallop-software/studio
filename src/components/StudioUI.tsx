/** @jsxImportSource @emotion/react */
'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { css } from '@emotion/react'
import { StudioContext } from './StudioContext'
import { StudioToolbar } from './StudioToolbar'
import { StudioFileGrid } from './StudioFileGrid'
import { StudioFileList } from './StudioFileList'
import { StudioDetailView } from './StudioDetailView'
import { ErrorModal } from './ErrorModal'
import { ConfirmModal, ProgressModal } from './StudioModal'
import { StudioFolderPicker } from './StudioFolderPicker'
import { useStudioActions } from './useStudioActions'
import { colors, fontSize, baseReset } from './tokens'
import { FontsSection } from './FontsSection'
import type { FileItem, LeanMeta } from '../types'

interface StudioUIProps {
  onClose?: () => void
  isVisible?: boolean
  standaloneMode?: boolean
  workspacePath?: string
  siteUrl?: string
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
  titleDropdown: css`
    position: relative;
  `,
  titleButton: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 19px !important;
    font-weight: 600;
    color: ${colors.text};
    background: transparent;
    border: none;
    padding: 4px 8px;
    margin: -4px -8px;
    border-radius: 6px;
    cursor: pointer;
    letter-spacing: -0.02em;
    transition: background 0.15s ease;
    
    &:hover {
      background: ${colors.surfaceHover};
    }
  `,
  titleChevron: css`
    width: 18px;
    height: 18px;
    color: ${colors.textSecondary};
    transition: transform 0.15s ease;
    margin-top: 2px;
    stroke-width: 2.5;
  `,
  titleChevronOpen: css`
    transform: rotate(180deg);
  `,
  dropdownMenu: css`
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 4px;
    z-index: 100;
  `,
  dropdownItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    white-space: nowrap;
    position: relative;
    top: 1px;
    font-size: 19px !important;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: ${colors.text};
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    
    &:hover {
      background: ${colors.surfaceHover};
    }
  `,
  dropdownItemActive: css`
    &::after {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      background: ${colors.primary};
      border-radius: 50%;
      position: relative;
      top: 1px;
    }
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
  headerIconBtn: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: ${colors.textMuted};
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    &:hover {
      color: ${colors.text};
      background: ${colors.surface};
    }
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
  siteUrl,
}: StudioUIProps) {
  // In standalone mode, onClose is a no-op
  const handleClose = onClose || (() => { })
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
  const [activeSection, setActiveSection] = useState<'media' | 'fonts'>(() => {
    // Read initial section from URL hash
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1)
      if (hash === 'fonts') return 'fonts'
      if (hash === 'media') return 'media'
    }
    return 'media'
  })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync activeSection with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'fonts') {
        setActiveSection('fonts')
      } else if (hash === 'media') {
        setActiveSection('media')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  
  // Font section state
  const [fontsPath, setFontsPath] = useState('_fonts')
  const [fontsRefreshKey, setFontsRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // Edited image cache buster
  const [editedImageKey, setEditedImageKeyState] = useState<{ path: string; key: number } | null>(null)
  const setEditedImageKey = useCallback((path: string) => {
    setEditedImageKeyState({ path, key: Date.now() })
  }, [])

  // Update focusedItem when fileItems changes (to reflect changes after push/download/rename)
  useEffect(() => {
    if (focusedItem && fileItems.length > 0) {
      // Find the updated item by path
      const updatedItem = fileItems.find(f => f.path === focusedItem.path)
      if (updatedItem) {
        // Only update if something changed
        if (JSON.stringify(updatedItem) !== JSON.stringify(focusedItem)) {
          setFocusedItem(updatedItem)
        }
      }
    }
  }, [fileItems, focusedItem])

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

    actions.uploadFiles(files, currentPath)
  }, [currentPath, actions])

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev)
  }, [])

  const selectSection = useCallback((section: 'media' | 'fonts') => {
    setActiveSection(section)
    setIsDropdownOpen(false)
    // Update URL hash
    window.location.hash = section
  }, [])

  // Font section handlers
  const triggerFontsRefresh = useCallback(() => {
    setFontsRefreshKey(k => k + 1)
  }, [])

  const contextValue = {
    isOpen: true,
    openStudio: () => { },
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
    editedImageKey,
    setEditedImageKey,
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
    requestDownload: actions.requestDownload,
    requestProcess: actions.requestProcess,
    setProcessMode: actions.setProcessMode,
    confirmDelete: actions.confirmDelete,
    confirmMove: actions.confirmMove,
    confirmSync: actions.confirmSync,
    confirmProcess: actions.confirmProcess,
    cancelAction: actions.cancelAction,
    closeProgress: actions.closeProgress,
    stopProcessing: actions.stopProcessing,
    deleteOrphans: actions.deleteOrphans,
  }

  return (
    <StudioContext.Provider value={contextValue}>
      <div css={styles.container}>
        <div css={styles.header}>
          <div css={styles.headerLeft}>
            <div css={styles.titleDropdown} ref={dropdownRef}>
              <button css={styles.titleButton} onClick={toggleDropdown}>
                <span>gallop.studio</span>
                <ChevronDownIcon isOpen={isDropdownOpen} />
              </button>
              {isDropdownOpen && (
                <div css={styles.dropdownMenu}>
                  <button
                    css={[styles.dropdownItem, activeSection === 'media' && styles.dropdownItemActive]}
                    onClick={() => selectSection('media')}
                  >
                    media & files
                  </button>
                  <button
                    css={[styles.dropdownItem, activeSection === 'fonts' && styles.dropdownItemActive]}
                    onClick={() => selectSection('fonts')}
                  >
                    fonts
                  </button>
                </div>
              )}
            </div>
          </div>
          <div css={styles.headerCenter}>
            <Breadcrumbs
              currentPath={currentPath}
              onNavigate={setCurrentPath}
              projectName={workspacePath ? workspacePath.split('/').pop() : undefined}
            />
          </div>
          <div css={styles.headerActions}>
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                css={styles.headerIconBtn}
                title={`Open ${siteUrl}`}
              >
                <WebsiteIcon />
              </a>
            )}
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

        {activeSection === 'media' ? (
          <>
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
          </>
        ) : (
          <FontsSection
            currentPath={fontsPath}
            setCurrentPath={setFontsPath}
            refreshKey={fontsRefreshKey}
            triggerRefresh={triggerFontsRefresh}
          />
        )}
      </div>
    </StudioContext.Provider>
  )
}

interface ProcessConfirmModalProps {
  imageCount: number
  mode: 'generate' | 'remove'
  onConfirm: () => void
  onCancel: () => void
}

function ProcessConfirmModal({ imageCount, mode, onConfirm, onCancel }: ProcessConfirmModalProps) {
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
  const title = isRemove ? 'Remove Thumbnails' : 'Generate Thumbnails'
  const message = isRemove
    ? `Remove generated thumbnails for ${imageCount} image${imageCount !== 1 ? 's' : ''}? Original images will be kept.`
    : `Generate thumbnails for ${imageCount} image${imageCount !== 1 ? 's' : ''}?`
  const confirmLabel = isRemove ? 'Remove' : 'Generate'

  return (
    <div css={processModalStyles.overlay} onClick={onCancel}>
      <div css={processModalStyles.container} onClick={e => e.stopPropagation()}>
        <h2 css={processModalStyles.title}>{title}</h2>

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

function Breadcrumbs({ currentPath, onNavigate, projectName }: { currentPath: string; onNavigate: (path: string) => void; projectName?: string }) {
  const parts = currentPath.split('/').filter(Boolean)

  // Build paths for each breadcrumb, replacing "public" with project name
  const breadcrumbs = parts.map((part, index) => ({
    name: index === 0 && part === 'public' && projectName ? projectName : part,
    path: parts.slice(0, index + 1).join('/'),
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

function WebsiteIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
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

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      css={[styles.titleChevron, isOpen && styles.titleChevronOpen]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}


export default StudioUI
