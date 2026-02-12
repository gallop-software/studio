/** @jsxImportSource @emotion/react */
'use client'

import { css } from '@emotion/react'
import { colors, fontSize } from './tokens'
import type { FileItem } from '../types'
import type { FolderStatus } from './FontsGrid'

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
  checkbox: css`
    width: 18px;
    height: 18px;
    accent-color: ${colors.primary};
    cursor: pointer;
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
  listCopyBtn: css`
    height: 28px;
    width: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    color: ${colors.textMuted};
    transition: all 0.15s ease;
    flex-shrink: 0;

    &:hover {
      background-color: ${colors.primaryLight};
      border-color: ${colors.primary};
      color: ${colors.primary};
    }
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

interface FontsListProps {
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

export function FontsList({
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
}: FontsListProps) {
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
                    onChange={onSelectAll}
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
              <tr css={styles.parentRow} onClick={onNavigateUp}>
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

            {filteredItems.map(item => {
              const isSelected = selectedItems.has(item.path)

              return (
                <tr
                  key={item.path}
                  css={[styles.row, isSelected && styles.rowSelected]}
                  onClick={(e) => onItemClick(item, e)}
                >
                  <td
                    css={[styles.td, styles.checkboxCell]}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      css={styles.checkbox}
                      checked={isSelected}
                      onChange={() => onItemClick(item, {} as React.MouseEvent)}
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
                        {item.type === 'file' && (
                          <button
                            css={styles.listCopyBtn}
                            onClick={(e) => onCopyPath(item.path, e)}
                            title={copiedPath === item.path ? 'Copied!' : 'Copy path'}
                          >
                            {copiedPath === item.path ? <CheckIcon /> : <CopyIcon />}
                          </button>
                        )}
                        <button
                          css={styles.listOpenBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpen(item)
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
  )
}

// Icon components

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
