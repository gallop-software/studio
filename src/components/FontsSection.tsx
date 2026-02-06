/** @jsxImportSource @emotion/react */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize } from './tokens'
import type { FileItem } from '../types'

const btnHeight = '36px'

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
  toolbarLeft: css`
    display: flex;
    flex-wrap: nowrap;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
  `,
  toolbarRight: css`
    display: flex;
    flex-wrap: nowrap;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: ${btnHeight};
    padding: 0 14px;
    border-radius: 6px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    cursor: pointer;
    transition: all 0.15s ease;
    color: ${colors.text};
    
    &:hover:not(:disabled) {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
  btnPrimary: css`
    background: ${colors.primary};
    border-color: ${colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
  `,
  btnDanger: css`
    background: ${colors.danger};
    border-color: ${colors.danger};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${colors.dangerHover};
      border-color: ${colors.dangerHover};
    }
  `,
  btnIcon: css`
    width: 16px;
    height: 16px;
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
  grid: css`
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    
    @media (min-width: 480px) { grid-template-columns: repeat(2, 1fr); }
    @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
    @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
    @media (min-width: 1280px) { grid-template-columns: repeat(5, 1fr); }
  `,
  item: css`
    position: relative;
    border-radius: 8px;
    border: 1px solid ${colors.border};
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s ease;
    background-color: ${colors.surface};
    user-select: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    
    &:hover {
      border-color: #d0d5dd;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    }
  `,
  itemSelected: css`
    border-color: ${colors.primary};
    box-shadow: 0 0 0 1px ${colors.primary};
  `,
  checkboxWrapper: css`
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    padding: 8px;
    cursor: pointer;
  `,
  checkbox: css`
    width: 18px;
    height: 18px;
    accent-color: ${colors.primary};
    cursor: pointer;
  `,
  itemContent: css`
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: ${colors.background};
  `,
  folderIcon: css`
    width: 56px;
    height: 56px;
    color: #f9935e;
  `,
  parentIcon: css`
    width: 56px;
    height: 56px;
    color: ${colors.textMuted};
  `,
  fileIcon: css`
    width: 40px;
    height: 40px;
    color: ${colors.textMuted};
  `,
  openBtn: css`
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 10;
    height: 28px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.primary};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    padding: 0 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    
    &:hover {
      background-color: ${colors.primaryLight};
      border-color: ${colors.primary};
    }
  `,
  label: css`
    padding: 10px 12px;
    background-color: ${colors.surface};
    border-top: 1px solid ${colors.borderLight};
  `,
  labelName: css`
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.text};
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  labelMeta: css`
    font-size: ${fontSize.xs};
    color: ${colors.textMuted};
    margin: 2px 0 0 0;
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
}

interface FontsSectionProps {
  currentPath: string
  setCurrentPath: (path: string) => void
  refreshKey: number
  triggerRefresh: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function FontsSection({ currentPath, setCurrentPath, refreshKey, triggerRefresh }: FontsSectionProps) {
  const [items, setItems] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [canCreate, setCanCreate] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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

  const isAtRoot = currentPath === '_fonts'
  const isInSrc = currentPath === 'src' || currentPath.startsWith('src/')

  const handleItemClick = useCallback((item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(item.path)) {
        next.delete(item.path)
      } else {
        next.add(item.path)
      }
      return next
    })
  }, [])

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

  const handleDelete = useCallback(async () => {
    if (selectedItems.size === 0) return
    
    const confirmed = window.confirm(`Delete ${selectedItems.size} item(s)?`)
    if (!confirmed) return

    try {
      const response = await fetch('/api/studio/fonts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: Array.from(selectedItems) }),
      })
      if (response.ok) {
        setSelectedItems(new Set())
        triggerRefresh()
      }
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }, [selectedItems, triggerRefresh])

  const handleCreateFolder = useCallback(async () => {
    const name = window.prompt('Folder name:')
    if (!name) return

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
      f => f.name.toLowerCase().endsWith('.ttf')
    )
    
    if (files.length === 0) return

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', currentPath)

      try {
        await fetch('/api/studio/fonts/upload', {
          method: 'POST',
          body: formData,
        })
      } catch (error) {
        console.error('Upload failed:', error)
      }
    }
    
    triggerRefresh()
  }, [currentPath, triggerRefresh])

  const fileInputRef = useCallback((input: HTMLInputElement | null) => {
    if (input) {
      input.addEventListener('change', async (e) => {
        const files = (e.target as HTMLInputElement).files
        if (!files || files.length === 0) return

        for (const file of Array.from(files)) {
          if (!file.name.toLowerCase().endsWith('.ttf')) continue
          
          const formData = new FormData()
          formData.append('file', file)
          formData.append('path', currentPath)

          try {
            await fetch('/api/studio/fonts/upload', {
              method: 'POST',
              body: formData,
            })
          } catch (error) {
            console.error('Upload failed:', error)
          }
        }
        
        triggerRefresh()
        input.value = ''
      })
    }
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
      <div css={styles.toolbar}>
        <div css={styles.toolbarLeft}>
          {showUploadButton && (
            <>
              <button
                css={[styles.btn, styles.btnPrimary]}
                onClick={() => document.getElementById('font-file-input')?.click()}
              >
                <PlusIcon />
                Add New
              </button>
              <input
                id="font-file-input"
                type="file"
                accept=".ttf"
                multiple
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
            </>
          )}
          <button css={styles.btn} onClick={handleCreateFolder}>
            <FolderPlusIcon />
            New Folder
          </button>
          {selectedItems.size > 0 && (
            <button css={[styles.btn, styles.btnDanger]} onClick={handleDelete}>
              <TrashIcon />
              Delete ({selectedItems.size})
            </button>
          )}
        </div>
        <div css={styles.toolbarRight}>
          <span style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

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
              <span>Drop TTF files to upload</span>
            </div>
          </div>
        )}

        {items.length === 0 && !canCreate ? (
          <div css={styles.empty}>
            <FolderIcon css={styles.emptyIcon} />
            <p css={styles.emptyText}>No files yet</p>
            <p css={styles.emptyText}>
              {showUploadButton ? 'Drop TTF files here or click "Add New"' : 'This folder is empty'}
            </p>
          </div>
        ) : items.length === 0 && canCreate ? (
          <div css={styles.empty}>
            <FolderIcon css={styles.emptyIcon} />
            <p css={styles.emptyText}>Folder doesn't exist</p>
            <button css={styles.createBtn} onClick={handleCreateFolder}>
              Create Folder
            </button>
          </div>
        ) : (
          <div css={styles.grid}>
            {/* Parent folder navigation */}
            {!isAtRoot && (
              <div css={styles.item} onClick={handleNavigateUp} onDoubleClick={handleNavigateUp}>
                <div css={styles.itemContent}>
                  <ParentFolderIcon />
                </div>
                <div css={styles.label}>
                  <p css={styles.labelName}>..</p>
                  <p css={styles.labelMeta}>Parent folder</p>
                </div>
              </div>
            )}

            {items.map(item => {
              const isSelected = selectedItems.has(item.path)
              
              return (
                <div
                  key={item.path}
                  css={[styles.item, isSelected && styles.itemSelected]}
                  onClick={(e) => handleItemClick(item, e)}
                  onDoubleClick={() => handleOpen(item)}
                >
                  <div
                    css={styles.checkboxWrapper}
                    onClick={(e) => { e.stopPropagation(); handleItemClick(item, e) }}
                  >
                    <input
                      type="checkbox"
                      css={styles.checkbox}
                      checked={isSelected}
                      onChange={() => {}}
                    />
                  </div>
                  <div css={styles.itemContent}>
                    {/* Open button - bottom right */}
                    <button
                      css={styles.openBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpen(item)
                      }}
                    >
                      Open
                    </button>
                    
                    {item.type === 'folder' ? (
                      <FolderIcon />
                    ) : (
                      <FileIcon />
                    )}
                  </div>
                  <div css={styles.label}>
                    <p css={styles.labelName}>{item.name}</p>
                    <p css={styles.labelMeta}>
                      {item.type === 'folder'
                        ? `${item.fileCount || 0} files`
                        : item.size ? formatSize(item.size) : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function FolderPlusIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg css={styles.dropIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg css={styles.folderIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function ParentFolderIcon() {
  return (
    <svg css={styles.parentIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m0-4l-2 2m2-2l2 2" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

export default FontsSection
