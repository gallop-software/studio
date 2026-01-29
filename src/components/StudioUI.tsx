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
import { colors, fontSize, baseReset } from './tokens'
import type { FileItem, StudioMeta } from '../types'

interface StudioUIProps {
  onClose: () => void
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
  `,
  title: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
    letter-spacing: -0.02em;
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
  const [focusedItem, setFocusedItem] = useState<FileItem | null>(null)
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusedItem) {
          setFocusedItem(null)
        } else {
          onClose()
        }
      }
    },
    [onClose, focusedItem]
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
    focusedItem,
    setFocusedItem,
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
              css={styles.headerBtn}
              onClick={onClose}
              aria-label="Close Studio"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <StudioToolbar />

        <div css={styles.content}>
          {focusedItem ? (
            <StudioDetailView />
          ) : (
            <div css={styles.fileBrowser}>
              {viewMode === 'grid' ? <StudioFileGrid /> : <StudioFileList />}
            </div>
          )}
        </div>
      </div>
    </StudioContext.Provider>
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
