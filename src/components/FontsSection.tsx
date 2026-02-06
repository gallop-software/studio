/** @jsxImportSource @emotion/react */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize } from './tokens'
import { InputModal, ConfirmModal, AlertModal, ProgressModal } from './StudioModal'
import { FontsAssignModal } from './FontsAssignModal'
import { FontsSettings } from './FontsSettings'
import { AddNewFontModal } from './AddNewFontModal'
import type { FileItem } from '../types'
import type { ProgressState } from './StudioContext'

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
  selectionCount: css`
    font-size: ${fontSize.base};
    color: ${colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 8px;
  `,
  clearBtn: css`
    color: ${colors.primary};
    background: none;
    border: none;
    cursor: pointer;
    font-size: ${fontSize.base};
    font-weight: 500;
    padding: 0;
    
    &:hover {
      text-decoration: underline;
    }
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
    color: ${colors.danger};
    
    &:hover:not(:disabled) {
      background-color: ${colors.dangerLight};
      border-color: ${colors.danger};
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
  selectAllRow: css`
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: ${colors.surface};
    border-radius: 8px;
    border: 1px solid ${colors.border};
  `,
  selectAllLabel: css`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.textSecondary};
    cursor: pointer;
    
    &:hover {
      color: ${colors.text};
    }
  `,
  selectAllCheckbox: css`
    width: 16px;
    height: 16px;
    accent-color: ${colors.primary};
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
    
    &:hover {
      border-color: ${colors.primary};
      box-shadow: 0 0 0 1px ${colors.primary};
    }
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
  viewToggle: css`
    display: flex;
    align-items: center;
    height: ${btnHeight};
    background-color: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    overflow: hidden;
  `,
  viewBtn: css`
    height: 100%;
    padding: 0 10px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${colors.textSecondary};
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      color: ${colors.text};
      background-color: ${colors.surfaceHover};
    }
  `,
  viewBtnActive: css`
    background-color: ${colors.primaryLight};
    color: ${colors.primary};
    
    &:hover {
      background-color: ${colors.primaryLight};
      color: ${colors.primary};
    }
  `,
  iconSpin: css`
    animation: ${spin} 1s linear infinite;
  `,
  tableWrapper: css`
    background: ${colors.surface};
    border-radius: 8px;
    border: 1px solid ${colors.border};
    overflow-x: auto;
  `,
  table: css`
    width: 100%;
    min-width: 400px;
    border-collapse: collapse;
    white-space: nowrap;
  `,
  th: css`
    text-align: left;
    font-size: 11px;
    color: ${colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 12px 16px;
    font-weight: 600;
    background: ${colors.background};
    border-bottom: 1px solid ${colors.border};
  `,
  thCheckbox: css`
    width: 48px;
  `,
  thSize: css`
    width: 96px;
  `,
  row: css`
    cursor: pointer;
    transition: background-color 0.15s ease;
    user-select: none;
    
    &:hover {
      background-color: ${colors.surfaceHover};
    }
    
    &:not(:last-child) td {
      border-bottom: 1px solid ${colors.borderLight};
    }
  `,
  rowSelected: css`
    background-color: ${colors.primaryLight};
    
    &:hover {
      background-color: ${colors.primaryLight};
    }
  `,
  parentRow: css`
    cursor: pointer;
    border-bottom: 1px solid ${colors.border};
    
    &:hover {
      background-color: ${colors.surfaceHover};
    }
  `,
  td: css`
    padding: 12px 16px;
  `,
  checkboxCell: css`
    padding: 12px 16px;
    cursor: pointer;
    vertical-align: middle;
  `,
  nameCell: css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  `,
  folderIconWrapper: css`
    width: 48px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `,
  folderIconSmall: css`
    width: 24px;
    height: 24px;
    color: #f9935e;
  `,
  fileIconWrapper: css`
    width: 48px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `,
  fileIconSmall: css`
    width: 20px;
    height: 20px;
    color: ${colors.textMuted};
  `,
  parentIconSmall: css`
    width: 20px;
    height: 20px;
    color: ${colors.textMuted};
    flex-shrink: 0;
  `,
  name: css`
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
  `,
  meta: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
  `,
  actionsCell: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-left: auto;
    flex-shrink: 0;
  `,
  listOpenBtn: css`
    height: 32px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.primary};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    padding: 0 14px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    
    &:hover {
      background-color: ${colors.primaryLight};
      border-color: ${colors.primary};
    }
  `,
  // Folder status badges
  badge: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
  badgeGray: css`
    background-color: #9ca3af;
  `,
  badgeYellow: css`
    background-color: #eab308;
  `,
  badgeGreen: css`
    background-color: #10b981;
  `,
  badgeWrapper: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  badgeTooltip: css`
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: ${colors.text};
    color: ${colors.surface};
    font-size: ${fontSize.xs};
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    z-index: 100;
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

// Folder status cache
interface FolderStatus {
  needsGeneration: boolean
  hasWoff2: boolean
  assignments: string[]
}

export function FontsSection({ currentPath, setCurrentPath, refreshKey, triggerRefresh }: FontsSectionProps) {
  const [items, setItems] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [canCreate, setCanCreate] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false)
  const [showRenameFileModal, setShowRenameFileModal] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [refreshing, setRefreshing] = useState(false)
  
  // New state for assign workflow
  const [showAddNewModal, setShowAddNewModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState<ProgressState>({ status: 'idle', current: 0, total: 0, percent: 0 })
  const [progressTitle, setProgressTitle] = useState('Processing')
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null)
  const [folderStatuses, setFolderStatuses] = useState<Record<string, FolderStatus>>({})
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null)

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

  // Scan folder statuses for badges
  const scanFolderStatuses = useCallback(async (folders: FileItem[]) => {
    const statuses: Record<string, FolderStatus> = {}
    
    for (const folder of folders) {
      if (folder.type !== 'folder') continue
      
      try {
        const res = await fetch('/api/studio/fonts/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: folder.path }),
        })
        
        if (res.ok) {
          const data = await res.json()
          statuses[folder.path] = {
            needsGeneration: data.needsGeneration,
            hasWoff2: data.woff2Files?.length > 0,
            assignments: data.assignments || [],
          }
        }
      } catch {
        // Ignore errors
      }
    }
    
    setFolderStatuses(statuses)
  }, [])

  useEffect(() => {
    const folders = items.filter(i => i.type === 'folder')
    if (folders.length > 0 && currentPath.startsWith('_fonts')) {
      scanFolderStatuses(folders)
    }
  }, [items, currentPath, scanFolderStatuses])

  const isAtRoot = currentPath === '_fonts'
  const isInSrc = currentPath === 'src' || currentPath.startsWith('src/')

  const handleItemClick = useCallback((item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (e.shiftKey && lastSelectedPath) {
      // Range selection
      const fromIndex = items.findIndex(i => i.path === lastSelectedPath)
      const toIndex = items.findIndex(i => i.path === item.path)
      
      if (fromIndex !== -1 && toIndex !== -1) {
        const start = Math.min(fromIndex, toIndex)
        const end = Math.max(fromIndex, toIndex)
        
        setSelectedItems(prev => {
          const next = new Set(prev)
          for (let i = start; i <= end; i++) {
            next.add(items[i].path)
          }
          return next
        })
      }
    } else {
      // Toggle selection
      setSelectedItems(prev => {
        const next = new Set(prev)
        if (next.has(item.path)) {
          next.delete(item.path)
        } else {
          next.add(item.path)
        }
        return next
      })
    }
    
    setLastSelectedPath(item.path)
  }, [items, lastSelectedPath])

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

  // Select all logic
  const allItemsSelected = items.length > 0 && selectedItems.size === items.length
  const someItemsSelected = selectedItems.size > 0

  const handleSelectAll = useCallback(() => {
    if (allItemsSelected) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.path)))
    }
  }, [allItemsSelected, items])

  const handleClearSelection = useCallback(() => {
    setSelectedItems(new Set())
    setLastSelectedPath(null)
  }, [])

  const handleSelectAllWoff = useCallback(() => {
    const woffFiles = items.filter(item => 
      item.type === 'file' && item.name.toLowerCase().endsWith('.woff2')
    )
    const allWoffSelected = woffFiles.every(item => selectedItems.has(item.path))
    
    if (allWoffSelected) {
      // Deselect all WOFF2 files
      setSelectedItems(prev => {
        const next = new Set(prev)
        woffFiles.forEach(item => next.delete(item.path))
        return next
      })
    } else {
      // Select all WOFF2 files (add to existing selection)
      setSelectedItems(prev => {
        const next = new Set(prev)
        woffFiles.forEach(item => next.add(item.path))
        return next
      })
    }
  }, [items, selectedItems])

  const handleSelectAllTtf = useCallback(() => {
    const ttfFiles = items.filter(item => 
      item.type === 'file' && item.name.toLowerCase().endsWith('.ttf')
    )
    const allTtfSelected = ttfFiles.every(item => selectedItems.has(item.path))
    
    if (allTtfSelected) {
      // Deselect all TTF files
      setSelectedItems(prev => {
        const next = new Set(prev)
        ttfFiles.forEach(item => next.delete(item.path))
        return next
      })
    } else {
      // Select all TTF files (add to existing selection)
      setSelectedItems(prev => {
        const next = new Set(prev)
        ttfFiles.forEach(item => next.add(item.path))
        return next
      })
    }
  }, [items, selectedItems])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchItems()
    setRefreshing(false)
  }, [fetchItems])

  // Check if single folder selected for rename
  const selectedPaths = Array.from(selectedItems)
  const singleFolderSelected = selectedPaths.length === 1 && items.find(i => i.path === selectedPaths[0])?.type === 'folder'
  const selectedFolderPath = singleFolderSelected ? selectedPaths[0] : null
  const selectedFolderName = selectedFolderPath ? selectedFolderPath.split('/').pop() || '' : ''

  // Check if single file selected for rename
  const singleFileSelected = selectedPaths.length === 1 && items.find(i => i.path === selectedPaths[0])?.type === 'file'
  const selectedFilePath = singleFileSelected ? selectedPaths[0] : null
  const selectedFileName = selectedFilePath ? selectedFilePath.split('/').pop() || '' : ''

  // Handle Assign Web Font button click
  const handleAssignClick = useCallback(() => {
    if (!singleFolderSelected) return
    setShowAssignModal(true)
  }, [singleFolderSelected])

  // Handle assign confirmation - starts the streaming process
  const handleAssignConfirm = useCallback(async (assignments: string[]) => {
    setShowAssignModal(false)
    setProgressTitle('Assigning Web Font')
    setShowProgress(true)
    setProgress({ status: 'progress', current: 0, total: 1, percent: 0, message: 'Starting...' })

    try {
      const res = await fetch('/api/studio/fonts/assign-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: selectedFolderPath, assignments }),
      })

      if (!res.ok || !res.body) {
        setProgress({ status: 'error', current: 0, total: 0, percent: 0, message: 'Failed to start assignment' })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.status === 'progress') {
                setProgress({
                  status: 'progress',
                  current: data.current || 0,
                  total: data.total || 1,
                  percent: data.total ? Math.round((data.current / data.total) * 100) : 0,
                  message: data.message,
                  currentFile: data.currentFile,
                })
              } else if (data.status === 'complete') {
                setProgress({
                  status: 'complete',
                  current: data.created?.length || 0,
                  total: data.created?.length || 0,
                  percent: 100,
                  message: data.message,
                  processed: data.created?.length || 0,
                })
                triggerRefresh()
              } else if (data.status === 'error') {
                setProgress({
                  status: 'error',
                  current: 0,
                  total: 0,
                  percent: 0,
                  message: data.message,
                })
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setProgress({
        status: 'error',
        current: 0,
        total: 0,
        percent: 0,
        message: String(err),
      })
    }
  }, [selectedFolderPath, triggerRefresh])

  const handleProgressClose = useCallback(() => {
    setShowProgress(false)
    setProgress({ status: 'idle', current: 0, total: 0, percent: 0 })
  }, [])

  const handleRenameFolder = useCallback(async (newName: string) => {
    if (!selectedFolderPath) return
    setShowRenameFolderModal(false)
    setProgressTitle('Renaming Folder')
    setShowProgress(true)
    setProgress({ status: 'progress', current: 0, total: 1, percent: 0, message: 'Starting...' })

    try {
      const res = await fetch('/api/studio/fonts/rename-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: selectedFolderPath, newName }),
      })

      if (!res.ok || !res.body) {
        setProgress({ status: 'error', current: 0, total: 0, percent: 0, message: 'Failed to start rename' })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.status === 'progress') {
                setProgress({
                  status: 'progress',
                  current: data.current || 0,
                  total: data.total || 1,
                  percent: data.total ? Math.round((data.current / data.total) * 100) : 0,
                  message: data.message,
                })
              } else if (data.status === 'complete') {
                setProgress({
                  status: 'complete',
                  current: 1,
                  total: 1,
                  percent: 100,
                  message: data.message,
                })
                setSelectedItems(new Set())
                triggerRefresh()
              } else if (data.status === 'error') {
                setProgress({
                  status: 'error',
                  current: 0,
                  total: 0,
                  percent: 0,
                  message: data.message,
                })
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setProgress({
        status: 'error',
        current: 0,
        total: 0,
        percent: 0,
        message: String(err),
      })
    }
  }, [selectedFolderPath, triggerRefresh])

  const handleRenameFile = useCallback(async (newName: string) => {
    if (!selectedFilePath) return
    setShowRenameFileModal(false)

    try {
      const response = await fetch('/api/studio/fonts/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: selectedFilePath, newName }),
      })
      if (response.ok) {
        setSelectedItems(new Set())
        triggerRefresh()
      }
    } catch (error) {
      console.error('Rename file failed:', error)
    }
  }, [selectedFilePath, triggerRefresh])

  const handleDeleteClick = useCallback(() => {
    if (selectedItems.size === 0) return
    setShowDeleteConfirm(true)
  }, [selectedItems.size])

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false)
    setProgressTitle('Deleting Files')
    setShowProgress(true)
    setProgress({ status: 'progress', current: 0, total: selectedItems.size, percent: 0, message: 'Starting...' })
    
    try {
      const res = await fetch('/api/studio/fonts/delete-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: Array.from(selectedItems) }),
      })

      if (!res.ok || !res.body) {
        setProgress({ status: 'error', current: 0, total: 0, percent: 0, message: 'Failed to start delete' })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.status === 'progress') {
                setProgress({
                  status: 'progress',
                  current: data.current || 0,
                  total: data.total || 1,
                  percent: data.total ? Math.round((data.current / data.total) * 100) : 0,
                  message: data.message,
                })
              } else if (data.status === 'complete') {
                setProgress({
                  status: 'complete',
                  current: data.deleted?.length || 0,
                  total: data.deleted?.length || 0,
                  percent: 100,
                  message: data.message,
                })
                setSelectedItems(new Set())
                triggerRefresh()
              } else if (data.status === 'error') {
                setProgress({
                  status: 'error',
                  current: 0,
                  total: 0,
                  percent: 0,
                  message: data.message,
                })
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setProgress({
        status: 'error',
        current: 0,
        total: 0,
        percent: 0,
        message: String(err),
      })
    }
  }, [selectedItems, triggerRefresh])

  const handleNewFolderClick = useCallback(() => {
    setShowNewFolderModal(true)
  }, [])

  const handleCreateFolder = useCallback(async (name: string) => {
    setShowNewFolderModal(false)
    
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
            <button
              css={[styles.btn, styles.btnPrimary]}
              onClick={() => setShowAddNewModal(true)}
            >
              <PlusIcon />
              Add New
            </button>
          )}
          <button
            css={styles.btn}
            onClick={() => {
              if (singleFileSelected) {
                setShowRenameFileModal(true)
              } else if (singleFolderSelected) {
                setShowRenameFolderModal(true)
              } else {
                handleNewFolderClick()
              }
            }}
          >
            {singleFileSelected || singleFolderSelected ? <RenameIcon /> : <FolderPlusIcon />}
            {singleFileSelected ? 'Rename File' : singleFolderSelected ? 'Rename Folder' : 'New Folder'}
          </button>
          <button
            css={[styles.btn, styles.btnDanger]}
            onClick={handleDeleteClick}
            disabled={selectedItems.size === 0}
          >
            <TrashIcon />
            Delete
          </button>
          <button
            css={styles.btn}
            onClick={handleAssignClick}
            disabled={!singleFolderSelected}
            title={singleFolderSelected ? 'Assign web font' : 'Select a folder to assign'}
          >
            <FontIcon />
            Assign Web Font
          </button>
        </div>
        <div css={styles.toolbarRight}>
          {someItemsSelected && (
            <span css={styles.selectionCount}>
              {selectedItems.size} selected
              <button css={styles.clearBtn} onClick={handleClearSelection}>
                Clear
              </button>
            </span>
          )}
          <button
            css={styles.btn}
            onClick={handleRefresh}
            title="Refresh view"
            disabled={refreshing}
          >
            <RefreshIcon spinning={refreshing} />
          </button>

          <div css={styles.viewToggle}>
            <button
              css={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <GridIcon />
            </button>
            <button
              css={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <ListIcon />
            </button>
          </div>

          <button
            css={styles.btn}
            onClick={() => setShowSettings(true)}
            title="Font assignments settings"
          >
            <SettingsIcon />
          </button>
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

        {items.length === 0 && canCreate ? (
          <div css={styles.empty}>
            <FolderIcon css={styles.emptyIcon} />
            <p css={styles.emptyText}>Folder doesn't exist</p>
            <button css={styles.createBtn} onClick={handleNewFolderClick}>
              Create Folder
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <>
            {items.length > 0 && (
              <div css={styles.selectAllRow}>
                <label css={styles.selectAllLabel}>
                  <input
                    type="checkbox"
                    css={styles.selectAllCheckbox}
                    checked={allItemsSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someItemsSelected && !allItemsSelected
                    }}
                    onChange={handleSelectAll}
                  />
                  Select all ({items.length})
                </label>
                {items.some(i => i.name.toLowerCase().endsWith('.woff2')) && (
                  <label css={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      css={styles.selectAllCheckbox}
                      checked={items.filter(i => i.name.toLowerCase().endsWith('.woff2')).every(i => selectedItems.has(i.path))}
                      onChange={handleSelectAllWoff}
                    />
                    WOFF2
                  </label>
                )}
                {items.some(i => i.name.toLowerCase().endsWith('.ttf')) && (
                  <label css={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      css={styles.selectAllCheckbox}
                      checked={items.filter(i => i.name.toLowerCase().endsWith('.ttf')).every(i => selectedItems.has(i.path))}
                      onChange={handleSelectAllTtf}
                    />
                    TTF
                  </label>
                )}
              </div>
            )}
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
                    <p css={styles.labelName}>
                      <span css={styles.badgeWrapper}>
                        {item.type === 'folder' && folderStatuses[item.path] && (
                          <span
                            css={[
                              styles.badge,
                              folderStatuses[item.path].assignments.length > 0
                                ? styles.badgeGreen
                                : folderStatuses[item.path].hasWoff2
                                  ? styles.badgeYellow
                                  : styles.badgeGray,
                            ]}
                            title={
                              folderStatuses[item.path].assignments.length > 0
                                ? `Assigned to: ${folderStatuses[item.path].assignments.join(', ')}`
                                : folderStatuses[item.path].hasWoff2
                                  ? 'woff2 ready'
                                  : 'TTF only'
                            }
                          />
                        )}
                        {item.name}
                      </span>
                    </p>
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
          </>
        ) : (
          /* List view */
          <>
            {items.length > 0 && (
              <div css={styles.selectAllRow}>
                <label css={styles.selectAllLabel}>
                  <input
                    type="checkbox"
                    css={styles.selectAllCheckbox}
                    checked={allItemsSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someItemsSelected && !allItemsSelected
                    }}
                    onChange={handleSelectAll}
                  />
                  Select all ({items.length})
                </label>
                {items.some(i => i.name.toLowerCase().endsWith('.woff2')) && (
                  <label css={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      css={styles.selectAllCheckbox}
                      checked={items.filter(i => i.name.toLowerCase().endsWith('.woff2')).every(i => selectedItems.has(i.path))}
                      onChange={handleSelectAllWoff}
                    />
                    WOFF2
                  </label>
                )}
                {items.some(i => i.name.toLowerCase().endsWith('.ttf')) && (
                  <label css={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      css={styles.selectAllCheckbox}
                      checked={items.filter(i => i.name.toLowerCase().endsWith('.ttf')).every(i => selectedItems.has(i.path))}
                      onChange={handleSelectAllTtf}
                    />
                    TTF
                  </label>
                )}
              </div>
            )}
            <div css={styles.tableWrapper}>
              <table css={styles.table}>
                <thead>
                  <tr>
                    <th css={[styles.th, styles.thCheckbox]}>
                      {items.length > 0 && (
                        <input
                          type="checkbox"
                          css={styles.checkbox}
                          checked={allItemsSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someItemsSelected && !allItemsSelected
                          }}
                          onChange={handleSelectAll}
                        />
                      )}
                    </th>
                    <th css={styles.th}>Name</th>
                    <th css={[styles.th, styles.thSize]}>Size</th>
                  </tr>
                </thead>
              <tbody>
                {/* Parent folder navigation */}
                {!isAtRoot && (
                  <tr css={styles.parentRow} onClick={handleNavigateUp}>
                    <td css={styles.td}></td>
                    <td css={styles.td}>
                      <div css={styles.nameCell}>
                        <svg css={styles.parentIconSmall} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span css={styles.name}>..</span>
                      </div>
                    </td>
                    <td css={[styles.td, styles.meta]}>Parent folder</td>
                  </tr>
                )}

                {items.map(item => {
                  const isSelected = selectedItems.has(item.path)
                  
                  return (
                    <tr
                      key={item.path}
                      css={[styles.row, isSelected && styles.rowSelected]}
                      onClick={(e) => handleItemClick(item, e)}
                    >
                      <td
                        css={[styles.td, styles.checkboxCell]}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          css={styles.checkbox}
                          checked={isSelected}
                          onChange={() => handleItemClick(item, {} as React.MouseEvent)}
                        />
                      </td>
                      <td css={styles.td}>
                        <div css={styles.nameCell}>
                          {item.type === 'folder' ? (
                            <div css={styles.folderIconWrapper}>
                              <svg css={styles.folderIconSmall} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
                              </svg>
                            </div>
                          ) : (
                            <div css={styles.fileIconWrapper}>
                              <svg css={styles.fileIconSmall} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <span css={styles.badgeWrapper}>
                            {item.type === 'folder' && folderStatuses[item.path] && (
                              <span
                                css={[
                                  styles.badge,
                                  folderStatuses[item.path].assignments.length > 0
                                    ? styles.badgeGreen
                                    : folderStatuses[item.path].hasWoff2
                                      ? styles.badgeYellow
                                      : styles.badgeGray,
                                ]}
                                title={
                                  folderStatuses[item.path].assignments.length > 0
                                    ? `Assigned to: ${folderStatuses[item.path].assignments.join(', ')}`
                                    : folderStatuses[item.path].hasWoff2
                                      ? 'woff2 ready'
                                      : 'TTF only'
                                }
                              />
                            )}
                            <span css={styles.name} title={item.name}>{item.name}</span>
                          </span>
                          <div css={styles.actionsCell}>
                            <button
                              css={styles.listOpenBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpen(item)
                              }}
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      </td>
                      <td css={[styles.td, styles.meta]}>
                        {item.type === 'folder'
                          ? `${item.fileCount || 0} files`
                          : item.size ? formatSize(item.size) : '--'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {showNewFolderModal && (
        <InputModal
          title="New Folder"
          message="Enter a name for the new folder:"
          placeholder="Folder name"
          confirmLabel="Create"
          onConfirm={handleCreateFolder}
          onCancel={() => setShowNewFolderModal(false)}
        />
      )}

      {showRenameFolderModal && selectedFolderPath && (
        <InputModal
          title="Rename Folder"
          message="Enter a new name for the folder:"
          placeholder={selectedFolderName}
          defaultValue={selectedFolderName}
          confirmLabel="Rename"
          onConfirm={handleRenameFolder}
          onCancel={() => setShowRenameFolderModal(false)}
        />
      )}

      {showRenameFileModal && selectedFilePath && (
        <InputModal
          title="Rename File"
          message="Enter a new name for the file:"
          placeholder={selectedFileName}
          defaultValue={selectedFileName}
          confirmLabel="Rename"
          onConfirm={handleRenameFile}
          onCancel={() => setShowRenameFileModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Items"
          message={`Are you sure you want to delete ${selectedItems.size} item${selectedItems.size !== 1 ? 's' : ''}? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showAddNewModal && (
        <AddNewFontModal
          currentPath={currentPath}
          onClose={() => setShowAddNewModal(false)}
          onUploadComplete={() => {
            setShowAddNewModal(false)
            triggerRefresh()
          }}
          setShowProgress={setShowProgress}
          setProgressTitle={setProgressTitle}
          setProgress={setProgress}
        />
      )}

      {showAssignModal && selectedFolderPath && (
        <FontsAssignModal
          folderPath={selectedFolderPath}
          onConfirm={handleAssignConfirm}
          onCancel={() => setShowAssignModal(false)}
        />
      )}

      {showProgress && (
        <ProgressModal
          title={progressTitle}
          progress={progress}
          onClose={handleProgressClose}
        />
      )}

      {showSettings && (
        <FontsSettings
          onClose={() => setShowSettings(false)}
          onRefresh={triggerRefresh}
        />
      )}

      {alertModal && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          onClose={() => setAlertModal(null)}
        />
      )}
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

function RenameIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
    <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
    </svg>
  )
}

function ParentFolderIcon() {
  return (
    <svg css={styles.parentIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
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

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg css={[styles.btnIcon, spinning && styles.iconSpin]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

function FontIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export default FontsSection
