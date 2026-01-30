/** @jsxImportSource @emotion/react */
'use client'

import { useState, useEffect } from 'react'
import { css, keyframes } from '@emotion/react'
import { colors, fontSize, fontStack, baseReset } from './tokens'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { 
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`

interface Folder {
  path: string
  name: string
  depth: number
}

const styles = {
  overlay: css`
    position: fixed;
    inset: 0;
    background-color: rgba(26, 31, 54, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: ${fadeIn} 0.15s ease-out;
    font-family: ${fontStack};
  `,
  modal: css`
    ${baseReset}
    background-color: ${colors.surface};
    border-radius: 12px;
    box-shadow: 0 30px 60px -12px rgba(50, 50, 93, 0.25), 0 18px 36px -18px rgba(0, 0, 0, 0.3);
    max-width: 480px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: ${slideIn} 0.2s ease-out;
    overflow: hidden;
  `,
  header: css`
    padding: 24px 24px 0;
  `,
  title: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
    letter-spacing: -0.02em;
  `,
  body: css`
    padding: 12px 24px 24px;
    flex: 1;
    overflow-y: auto;
    min-height: 200px;
    max-height: 400px;
  `,
  message: css`
    font-size: ${fontSize.base};
    color: ${colors.textSecondary};
    margin: 0 0 16px;
    line-height: 1.6;
  `,
  folderList: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  folderItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;
    
    &:hover {
      background-color: ${colors.surfaceHover};
    }
  `,
  folderItemSelected: css`
    background-color: ${colors.primaryLight};
    border-color: ${colors.primary};
    
    &:hover {
      background-color: ${colors.primaryLight};
    }
  `,
  folderItemDisabled: css`
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background-color: transparent;
    }
  `,
  folderIcon: css`
    width: 20px;
    height: 20px;
    color: #f9935e;
    flex-shrink: 0;
  `,
  folderName: css`
    font-size: ${fontSize.base};
    color: ${colors.text};
    flex: 1;
  `,
  footer: css`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid ${colors.border};
    background-color: ${colors.background};
  `,
  btn: css`
    padding: 10px 18px;
    font-size: ${fontSize.base};
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    letter-spacing: -0.01em;
  `,
  btnCancel: css`
    background-color: ${colors.surface};
    border: 1px solid ${colors.border};
    color: ${colors.text};
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  btnConfirm: css`
    background-color: ${colors.primary};
    border: 1px solid ${colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: ${colors.textSecondary};
  `,
  spinner: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid ${colors.border};
    border-top-color: ${colors.primary};
    animation: spin 0.8s linear infinite;
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
}

interface StudioFolderPickerProps {
  selectedItems: Set<string>
  currentPath: string
  onMove: (destination: string) => void
  onCancel: () => void
}

export function StudioFolderPicker({ selectedItems, currentPath, onMove, onCancel }: StudioFolderPickerProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

  useEffect(() => {
    async function loadFolders() {
      try {
        const response = await fetch('/api/studio/list-folders')
        if (response.ok) {
          const data = await response.json()
          console.log('Loaded folders:', data)
          setFolders(data.folders || [])
        } else {
          console.error('Failed to load folders:', response.status, await response.text())
        }
      } catch (error) {
        console.error('Failed to load folders:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFolders()
  }, [])

  // Filter out folders that are being moved (can't move to themselves or their children)
  // Mark current folder as disabled but still show it
  const selectedPaths = Array.from(selectedItems)
  const availableFolders = folders.filter(folder => {
    // Can't move a folder into itself or its children
    return !selectedPaths.some(selected => 
      folder.path === selected || 
      folder.path.startsWith(selected + '/')
    )
  })
  
  // Check if a folder is the current location (disabled)
  const isCurrentFolder = (folderPath: string) => folderPath === currentPath

  const handleConfirm = () => {
    if (selectedFolder) {
      onMove(selectedFolder)
    }
  }

  return (
    <div css={styles.overlay} onClick={onCancel}>
      <div css={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <h3 css={styles.title}>Move Items</h3>
        </div>
        <div css={styles.body}>
          <p css={styles.message}>
            Select a destination folder for {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}:
          </p>
          
          {loading ? (
            <div css={styles.loading}>
              <div css={styles.spinner} />
            </div>
          ) : availableFolders.length === 0 ? (
            <div css={styles.loading}>
              No available folders to move to.
            </div>
          ) : (
            <div css={styles.folderList}>
              {availableFolders.map((folder) => {
                const disabled = isCurrentFolder(folder.path)
                return (
                  <div
                    key={folder.path}
                    css={[
                      styles.folderItem,
                      selectedFolder === folder.path && styles.folderItemSelected,
                      disabled && styles.folderItemDisabled
                    ]}
                    style={{ paddingLeft: 12 + (folder.depth * 16) }}
                    onClick={() => !disabled && setSelectedFolder(folder.path)}
                  >
                    <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
                    </svg>
                    <span css={styles.folderName}>
                      {folder.name}
                      {disabled && ' (current)'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div css={styles.footer}>
          <button css={[styles.btn, styles.btnCancel]} onClick={onCancel}>
            Cancel
          </button>
          <button
            css={[styles.btn, styles.btnConfirm]}
            onClick={handleConfirm}
            disabled={!selectedFolder}
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  )
}
