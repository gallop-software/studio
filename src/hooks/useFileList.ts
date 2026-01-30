import { useEffect, useState, useRef, useCallback } from 'react'
import { useStudio } from '../components/StudioContext'
import { studioApi } from '../lib/api'
import type { FileItem } from '../types'

/**
 * Shared hook for file list logic used by both Grid and List views
 * Handles loading, sorting, selection, and navigation
 */
export function useFileList() {
  const {
    currentPath,
    setCurrentPath,
    navigateUp,
    selectedItems,
    toggleSelection,
    selectRange,
    lastSelectedPath,
    selectAll,
    clearSelection,
    refreshKey,
    setFocusedItem,
    triggerRefresh,
    searchQuery,
    showError,
  } = useStudio()

  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [metaEmpty, setMetaEmpty] = useState(false)
  const isInitialLoad = useRef(true)
  const lastPath = useRef(currentPath)

  // Load items when path, refresh, or search changes
  useEffect(() => {
    async function loadItems() {
      const isPathChange = lastPath.current !== currentPath
      if (isInitialLoad.current || isPathChange) {
        setLoading(true)
      }
      lastPath.current = currentPath

      try {
        const data = searchQuery && searchQuery.length >= 2
          ? await studioApi.search(searchQuery)
          : await studioApi.list(currentPath)
        setItems(data.items || [])
        setMetaEmpty(data.isEmpty === true)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load items'
        showError('Load Error', message)
        setItems([])
        setMetaEmpty(false)
      }

      setLoading(false)
      isInitialLoad.current = false
    }

    loadItems()
  }, [currentPath, refreshKey, searchQuery, showError])

  // Computed values
  const isAtRoot = currentPath === 'public'
  const isSearching = searchQuery && searchQuery.length >= 2

  // Sort items: folders first, then alphabetically
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name)
  })

  const allItemsSelected = sortedItems.length > 0 && sortedItems.every(item => selectedItems.has(item.path))
  const someItemsSelected = sortedItems.some(item => selectedItems.has(item.path))

  // Handlers
  const handleItemClick = useCallback((item: FileItem, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedPath) {
      selectRange(lastSelectedPath, item.path, sortedItems)
    } else {
      toggleSelection(item.path)
    }
  }, [lastSelectedPath, selectRange, sortedItems, toggleSelection])

  const handleOpen = useCallback((item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path)
    } else {
      setFocusedItem(item)
    }
  }, [setCurrentPath, setFocusedItem])

  const handleGenerateThumbnail = useCallback(async (item: FileItem) => {
    try {
      const imageKey = '/' + item.path.replace(/^public\//, '')
      await studioApi.reprocess([imageKey])
      triggerRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate thumbnail'
      showError('Processing Error', message)
    }
  }, [triggerRefresh, showError])

  const handleSelectAll = useCallback(() => {
    if (allItemsSelected) {
      clearSelection()
    } else {
      selectAll(sortedItems)
    }
  }, [allItemsSelected, clearSelection, selectAll, sortedItems])

  return {
    // State
    items,
    loading,
    sortedItems,
    metaEmpty,

    // Computed
    isAtRoot,
    isSearching,
    allItemsSelected,
    someItemsSelected,

    // Context values
    currentPath,
    selectedItems,
    navigateUp,

    // Handlers
    handleItemClick,
    handleOpen,
    handleGenerateThumbnail,
    handleSelectAll,
  }
}
