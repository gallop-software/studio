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

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Error handling
  error: ErrorMessage | null
  showError: (title: string, message: string) => void
  clearError: () => void
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
  searchQuery: '',
  setSearchQuery: () => {},
  error: null,
  showError: () => {},
  clearError: () => {},
}

export const StudioContext = createContext<StudioState>(defaultState)

/**
 * Hook to access Studio state from child components
 */
export function useStudio() {
  return useContext(StudioContext)
}
