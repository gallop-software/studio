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

// Stripe-inspired design tokens
const colors = {
  primary: '#635bff',
  primaryHover: '#5851e5',
  background: '#f6f9fc',
  surface: '#ffffff',
  surfaceHover: '#f6f9fc',
  border: '#e3e8ee',
  borderLight: '#eef1f6',
  text: '#1a1f36',
  textSecondary: '#697386',
  textMuted: '#8792a2',
}

const styles = {
  container: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
    background: ${colors.background};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: ${colors.surface};
    border-bottom: 1px solid ${colors.border};
  `,
  title: css`
    font-size: 17px;
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
  closeBtn: css`
    padding: 8px;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background-color: ${colors.surfaceHover};
    }
  `,
  closeIcon: css`
    width: 18px;
    height: 18px;
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
