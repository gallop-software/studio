/** @jsxImportSource @emotion/react */
'use client'

import { useEffect, useCallback, useState } from 'react'
import { css } from '@emotion/react'
import { StudioContext } from './StudioContext'
import { StudioToolbar } from './StudioToolbar'
import { StudioBreadcrumb } from './StudioBreadcrumb'
import { StudioFileGrid } from './StudioFileGrid'
import { StudioFileList } from './StudioFileList'
import { StudioPreview } from './StudioPreview'
import { StudioSettings } from './StudioSettings'
import type { FileItem, StudioMeta } from '../types'

interface StudioUIProps {
  onClose: () => void
}

const styles = {
  container: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid #e5e7eb;
  `,
  title: css`
    font-size: 20px;
    font-weight: 600;
    color: #111827;
    margin: 0;
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  closeBtn: css`
    padding: 8px;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s;
    
    &:hover {
      background-color: #f3f4f6;
    }
  `,
  closeIcon: css`
    width: 20px;
    height: 20px;
    color: #6b7280;
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
    padding: 16px;
  `,
}

/**
 * Main Studio UI - contains all panels and manages internal state
 * Rendered inside the modal via lazy loading
 */
export function StudioUI({ onClose }: StudioUIProps) {
  const [currentPath, setCurrentPathInternal] = useState('public')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [meta, setMeta] = useState<StudioMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

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
    // Include all items (files and folders)
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const contextValue = {
    isOpen: true,
    openStudio: () => {},
    closeStudio: onClose,
    toggleStudio: onClose,
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
    meta,
    setMeta,
    isLoading,
    setIsLoading,
    refreshKey,
    triggerRefresh,
  }

  return (
    <StudioContext.Provider value={contextValue}>
      <div css={styles.container}>
        <div css={styles.header}>
          <h1 css={styles.title}>Studio</h1>
          <div css={styles.headerActions}>
            <StudioSettings />
            <button
              css={styles.closeBtn}
              onClick={onClose}
              aria-label="Close Studio"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <StudioToolbar />
        <StudioBreadcrumb />

        <div css={styles.content}>
          <div css={styles.fileBrowser}>
            {viewMode === 'grid' ? <StudioFileGrid /> : <StudioFileList />}
          </div>
          <StudioPreview />
        </div>
      </div>
    </StudioContext.Provider>
  )
}

function CloseIcon() {
  return (
    <svg
      css={styles.closeIcon}
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
