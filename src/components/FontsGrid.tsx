/** @jsxImportSource @emotion/react */
'use client'

import { css } from '@emotion/react'
import { colors, fontSize } from './tokens'
import type { FileItem } from '../types'

export interface FolderStatus {
  needsGeneration: boolean
  hasWoff2: boolean
  assignments: string[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const styles = {
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
  copyBtn: css`
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    color: ${colors.textSecondary};

    &:hover {
      background-color: ${colors.primaryLight};
      border-color: ${colors.primary};
      color: ${colors.primary};
    }

    .studio-item:hover & {
      opacity: 1;
    }
  `,
  copyBtnVisible: css`
    opacity: 1;
    color: ${colors.primary};
  `,
  copyBtnIcon: css`
    width: 14px;
    height: 14px;
  `,
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
}

interface FontsGridProps {
  items: FileItem[]
  filteredItems: FileItem[]
  selectedItems: Set<string>
  allItemsSelected: boolean
  someItemsSelected: boolean
  copiedPath: string | null
  folderStatuses: Record<string, FolderStatus>
  isAtRoot: boolean
  onItemClick: (item: FileItem, e: React.MouseEvent) => void
  onOpen: (item: FileItem) => void
  onNavigateUp: () => void
  onSelectAll: () => void
  onSelectAllWoff: () => void
  onSelectAllTtf: () => void
  onCopyPath: (itemPath: string, e: React.MouseEvent) => void
}

export function FontsGrid({
  items,
  filteredItems,
  selectedItems,
  allItemsSelected,
  someItemsSelected,
  copiedPath,
  folderStatuses,
  isAtRoot,
  onItemClick,
  onOpen,
  onNavigateUp,
  onSelectAll,
  onSelectAllWoff,
  onSelectAllTtf,
  onCopyPath,
}: FontsGridProps) {
  return (
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
              onChange={onSelectAll}
            />
            Select all ({items.length})
          </label>
          {items.some(i => i.name.toLowerCase().endsWith('.woff2')) && (
            <label css={styles.selectAllLabel}>
              <input
                type="checkbox"
                css={styles.selectAllCheckbox}
                checked={items.filter(i => i.name.toLowerCase().endsWith('.woff2')).every(i => selectedItems.has(i.path))}
                onChange={onSelectAllWoff}
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
                onChange={onSelectAllTtf}
              />
              TTF
            </label>
          )}
        </div>
      )}
      <div css={styles.grid}>
        {/* Parent folder navigation */}
        {!isAtRoot && (
          <div css={styles.item} onClick={onNavigateUp} onDoubleClick={onNavigateUp}>
            <div css={styles.itemContent}>
              <ParentFolderIcon />
            </div>
            <div css={styles.label}>
              <p css={styles.labelName}>..</p>
              <p css={styles.labelMeta}>Parent folder</p>
            </div>
          </div>
        )}

        {filteredItems.map(item => {
          const isSelected = selectedItems.has(item.path)

          return (
            <div
              key={item.path}
              className="studio-item"
              css={[styles.item, isSelected && styles.itemSelected]}
              onClick={(e) => onItemClick(item, e)}
              onDoubleClick={() => onOpen(item)}
            >
              <div
                css={styles.checkboxWrapper}
                onClick={(e) => { e.stopPropagation(); onItemClick(item, e) }}
              >
                <input
                  type="checkbox"
                  css={styles.checkbox}
                  checked={isSelected}
                  onChange={() => {}}
                />
              </div>
              <div css={styles.itemContent}>
                {item.type === 'file' && (
                  <button
                    css={[styles.copyBtn, copiedPath === item.path && styles.copyBtnVisible]}
                    onClick={(e) => onCopyPath(item.path, e)}
                    title={copiedPath === item.path ? 'Copied!' : 'Copy path'}
                  >
                    {copiedPath === item.path ? <CheckIcon /> : <CopyIcon />}
                  </button>
                )}
                <button
                  css={styles.openBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(item)
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
  )
}

// Icon components

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

function CopyIcon() {
  return (
    <svg css={styles.copyBtnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg css={styles.copyBtnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
