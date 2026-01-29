'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { FileItem, StudioMeta } from '../types'

interface StudioState {
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
  selectAll: (items: FileItem[]) => void
  clearSelection: () => void

  // View
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void

  // Meta
  meta: StudioMeta | null
  setMeta: (meta: StudioMeta) => void

  // Loading
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
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
  selectAll: () => {},
  clearSelection: () => {},
  viewMode: 'grid',
  setViewMode: () => {},
  meta: null,
  setMeta: () => {},
  isLoading: false,
  setIsLoading: () => {},
}

export const StudioContext = createContext<StudioState>(defaultState)

export function useStudio() {
  return useContext(StudioContext)
}

export function useStudioState(): StudioState {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPath, setCurrentPath] = useState('public')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [meta, setMeta] = useState<StudioMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const openStudio = useCallback(() => setIsOpen(true), [])
  const closeStudio = useCallback(() => setIsOpen(false), [])
  const toggleStudio = useCallback(() => setIsOpen((prev) => !prev), [])

  const navigateUp = useCallback(() => {
    if (currentPath === 'public') return
    const parts = currentPath.split('/')
    parts.pop()
    setCurrentPath(parts.join('/') || 'public')
    setSelectedItems(new Set())
  }, [currentPath])

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
  }, [])

  const selectAll = useCallback((items: FileItem[]) => {
    setSelectedItems(new Set(items.map((item) => item.path)))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  return {
    isOpen,
    openStudio,
    closeStudio,
    toggleStudio,
    currentPath,
    setCurrentPath: (path: string) => {
      setCurrentPath(path)
      setSelectedItems(new Set())
    },
    navigateUp,
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    viewMode,
    setViewMode,
    meta,
    setMeta,
    isLoading,
    setIsLoading,
  }
}
