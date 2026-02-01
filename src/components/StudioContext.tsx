'use client'

import { createContext, useContext } from 'react'
import type { FileItem, LeanMeta } from '../types'

/**
 * Error message type for centralized error handling
 */
export interface ErrorMessage {
  title: string
  message: string
}

/**
 * Progress state for action modals
 */
export interface ProgressState {
  current: number
  total: number
  percent: number
  status: 'processing' | 'complete' | 'error' | 'stopped' | 'cleanup'
  currentFile?: string
  message?: string
  processed?: number
  alreadyProcessed?: number
  orphansRemoved?: number
  orphanedFiles?: string[]
}

/**
 * Action state for shared action handlers
 */
export interface ActionState {
  // Progress modal
  showProgress: boolean
  progressTitle: string
  progressState: ProgressState
  
  // Confirmation modals
  showDeleteConfirm: boolean
  showMoveModal: boolean
  showSyncConfirm: boolean
  showProcessConfirm: boolean
  showDownloadConfirm: boolean
  
  // Action-specific state
  actionPaths: string[]  // Paths being acted upon
  syncImageCount: number
  syncHasRemote: boolean
  syncHasLocal: boolean
  processMode: 'generate' | 'remove'  // Mode for process modal
  downloadImageCount: number
  downloadTotalSelected: number
}

/**
 * Studio state interface
 * State is managed by StudioUI and provided to all child components
 */
export interface StudioState {
  isOpen: boolean
  openStudio: () => void
  closeStudio: () => void
  toggleStudio: () => void

  // Navigation
  currentPath: string
  setCurrentPath: (path: string) => void
  navigateUp: () => void

  // Selection
  selectedItems: Set<string>
  toggleSelection: (path: string) => void
  selectRange: (fromPath: string, toPath: string, allItems: FileItem[]) => void
  selectAll: (items: FileItem[]) => void
  clearSelection: () => void
  lastSelectedPath: string | null

  // View
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void

  // Focused item (for detail view)
  focusedItem: FileItem | null
  setFocusedItem: (item: FileItem | null) => void

  // Meta
  meta: LeanMeta | null
  setMeta: (meta: LeanMeta) => void

  // Loading
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Refresh trigger
  refreshKey: number
  triggerRefresh: () => void

  // Scan trigger
  scanRequested: boolean
  triggerScan: () => void
  clearScanRequest: () => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Error handling
  error: ErrorMessage | null
  showError: (title: string, message: string) => void
  clearError: () => void

  // File items (for toolbar to check cloud status)
  fileItems: FileItem[]
  setFileItems: (items: FileItem[]) => void

  // Shared action state
  actionState: ActionState
  
  // Shared action handlers (initiate confirmation)
  requestDelete: (paths: string[]) => void
  requestMove: (paths: string[]) => void
  requestSync: (paths: string[], fileItems: FileItem[]) => void
  requestDownload: (paths: string[], fileItems: FileItem[]) => void
  requestProcess: (paths: string[]) => void
  setProcessMode: (mode: 'generate' | 'remove') => void
  
  // Action confirmations (execute action)
  confirmDelete: () => Promise<void>
  confirmMove: (destination: string) => Promise<void>
  confirmSync: () => Promise<void>
  confirmProcess: () => Promise<void>
  
  // Cancel/close actions
  cancelAction: () => void
  closeProgress: () => void
  
  // Stop processing
  stopProcessing: () => void
  abortController: AbortController | null
  
  // Delete orphans (from scan)
  deleteOrphans: () => Promise<void>
}

const defaultActionState: ActionState = {
  showProgress: false,
  progressTitle: '',
  progressState: { current: 0, total: 0, percent: 0, status: 'processing' },
  showDeleteConfirm: false,
  showMoveModal: false,
  showSyncConfirm: false,
  showProcessConfirm: false,
  actionPaths: [],
  syncImageCount: 0,
  syncHasRemote: false,
  syncHasLocal: false,
  processMode: 'generate',
}

const defaultState: StudioState = {
  isOpen: false,
  openStudio: () => {},
  closeStudio: () => {},
  toggleStudio: () => {},
  currentPath: 'public',
  setCurrentPath: () => {},
  navigateUp: () => {},
  selectedItems: new Set(),
  toggleSelection: () => {},
  selectRange: () => {},
  selectAll: () => {},
  clearSelection: () => {},
  lastSelectedPath: null,
  viewMode: 'grid',
  setViewMode: () => {},
  focusedItem: null,
  setFocusedItem: () => {},
  meta: null,
  setMeta: () => {},
  isLoading: false,
  setIsLoading: () => {},
  refreshKey: 0,
  triggerRefresh: () => {},
  scanRequested: false,
  triggerScan: () => {},
  clearScanRequest: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  error: null,
  showError: () => {},
  clearError: () => {},
  fileItems: [],
  setFileItems: () => {},
  
  // Shared action state
  actionState: defaultActionState,
  
  // Shared action handlers
  requestDelete: () => {},
  requestMove: () => {},
  requestSync: () => {},
  requestDownload: () => {},
  requestProcess: () => {},
  setProcessMode: () => {},
  confirmDelete: async () => {},
  confirmMove: async () => {},
  confirmSync: async () => {},
  confirmProcess: async () => {},
  cancelAction: () => {},
  closeProgress: () => {},
  stopProcessing: () => {},
  abortController: null,
  deleteOrphans: async () => {},
}

export const StudioContext = createContext<StudioState>(defaultState)

/**
 * Hook to access Studio state from child components
 */
export function useStudio() {
  return useContext(StudioContext)
}
