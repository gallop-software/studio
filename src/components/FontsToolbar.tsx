/** @jsxImportSource @emotion/react */
'use client'

import { css, keyframes } from '@emotion/react'
import { colors, fontSize } from './tokens'

const btnHeight = '36px'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const styles = {
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
  searchInput: css`
    height: ${btnHeight};
    padding: 0 10px;
    border-radius: 6px;
    font-size: ${fontSize.base};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    color: ${colors.text};
    width: 160px;
    transition: all 0.15s ease;

    &:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 2px ${colors.primaryLight};
    }

    &::placeholder {
      color: ${colors.textMuted};
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
}

interface FontsToolbarProps {
  showUploadButton: boolean
  selectedItems: Set<string>
  someItemsSelected: boolean
  singleFileSelected: boolean
  singleFolderSelected: boolean
  canAssign: boolean
  hasSelectedWoff2Files: boolean
  selectedWoff2Files: string[]
  refreshing: boolean
  viewMode: 'grid' | 'list'
  searchQuery: string
  onAddNew: () => void
  onRenameFile: () => void
  onRenameFolder: () => void
  onNewFolder: () => void
  onDelete: () => void
  onAssign: () => void
  onClearSelection: () => void
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRefresh: () => void
  onViewModeChange: (mode: 'grid' | 'list') => void
  onShowSettings: () => void
}

export function FontsToolbar({
  showUploadButton,
  selectedItems,
  someItemsSelected,
  singleFileSelected,
  singleFolderSelected,
  canAssign,
  hasSelectedWoff2Files,
  selectedWoff2Files,
  refreshing,
  viewMode,
  searchQuery,
  onAddNew,
  onRenameFile,
  onRenameFolder,
  onNewFolder,
  onDelete,
  onAssign,
  onClearSelection,
  onSearchChange,
  onRefresh,
  onViewModeChange,
  onShowSettings,
}: FontsToolbarProps) {
  return (
    <div css={styles.toolbar}>
      <div css={styles.toolbarLeft}>
        {showUploadButton && (
          <button
            css={[styles.btn, styles.btnPrimary]}
            onClick={onAddNew}
          >
            <PlusIcon />
            Add New
          </button>
        )}
        <button
          css={styles.btn}
          onClick={() => {
            if (singleFileSelected) {
              onRenameFile()
            } else if (singleFolderSelected) {
              onRenameFolder()
            } else {
              onNewFolder()
            }
          }}
        >
          {singleFileSelected || singleFolderSelected ? <RenameIcon /> : <FolderPlusIcon />}
          {singleFileSelected ? 'Rename File' : singleFolderSelected ? 'Rename Folder' : 'New Folder'}
        </button>
        <button
          css={[styles.btn, styles.btnDanger]}
          onClick={onDelete}
          disabled={selectedItems.size === 0}
        >
          <TrashIcon />
          Delete
        </button>
        <button
          css={styles.btn}
          onClick={onAssign}
          disabled={!canAssign}
          title={canAssign
            ? (hasSelectedWoff2Files ? `Assign ${selectedWoff2Files.length} woff2 file${selectedWoff2Files.length > 1 ? 's' : ''}` : 'Assign web font')
            : 'Select a folder or woff2 files to assign'}
        >
          <FontIcon />
          Assign Web Font
        </button>
      </div>
      <div css={styles.toolbarRight}>
        {someItemsSelected && (
          <span css={styles.selectionCount}>
            {selectedItems.size} selected
            <button css={styles.clearBtn} onClick={onClearSelection}>
              Clear
            </button>
          </span>
        )}
        <input
          type="text"
          css={styles.searchInput}
          placeholder="Search fonts..."
          value={searchQuery}
          onChange={onSearchChange}
        />
        <button
          css={styles.btn}
          onClick={onRefresh}
          title="Refresh view"
          disabled={refreshing}
        >
          <RefreshIcon spinning={refreshing} />
        </button>

        <div css={styles.viewToggle}>
          <button
            css={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onClick={() => onViewModeChange('grid')}
            aria-label="Grid view"
          >
            <GridIcon />
          </button>
          <button
            css={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onClick={() => onViewModeChange('list')}
            aria-label="List view"
          >
            <ListIcon />
          </button>
        </div>

        <button
          css={styles.btn}
          onClick={onShowSettings}
          title="Font assignments settings"
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  )
}

// Icon components

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

function FontIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
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

function SettingsIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
