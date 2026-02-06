/** @jsxImportSource @emotion/react */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { css } from '@emotion/react'
import { colors, fontSize } from './tokens'

// Standard button height for consistency
const btnHeight = '36px'

interface FontFile {
  name: string
  weight: string
  style: string
  path: string
}

interface FontFamily {
  name: string
  files: FontFile[]
  fileCount: number
  weights: string[]
}

interface FontConfig {
  type: string
  family: string
  path: string
  exportName: string
}

interface FontsData {
  families: FontFamily[]
  configs: FontConfig[]
}

interface FontsSectionProps {
  onOpenUploadModal: (files?: File[]) => void
  isDragging: boolean
  refreshKey: number
}

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
    overflow: visible;
    min-width: 0;
    
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
    letter-spacing: -0.01em;
    
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
  btnIcon: css`
    width: 16px;
    height: 16px;
  `,
  content: css`
    flex: 1;
    display: flex;
    overflow: hidden;
    padding: 20px 24px;
    gap: 24px;
  `,
  leftPanel: css`
    flex: 2;
    display: flex;
    flex-direction: column;
    overflow: auto;
  `,
  rightPanel: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    min-width: 280px;
    max-width: 350px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 8px;
  `,
  panelHeader: css`
    padding: 12px 16px;
    font-size: ${fontSize.sm};
    font-weight: 600;
    color: ${colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid ${colors.border};
  `,
  panelContent: css`
    padding: 12px;
    overflow: auto;
  `,
  sectionTitle: css`
    font-size: ${fontSize.sm};
    font-weight: 600;
    color: ${colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 12px;
  `,
  familiesGrid: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  `,
  familyCard: css`
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      border-color: ${colors.borderHover};
      box-shadow: 0 2px 8px ${colors.shadow};
    }
  `,
  familyCardExpanded: css`
    grid-column: 1 / -1;
  `,
  familyName: css`
    font-size: ${fontSize.base};
    font-weight: 600;
    color: ${colors.text};
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  familyCount: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 0 0 12px;
  `,
  weightsRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  weightChip: css`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    background: ${colors.background};
    border-radius: 4px;
    font-size: ${fontSize.xs};
    color: ${colors.textSecondary};
    font-weight: 500;
  `,
  filesGrid: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${colors.border};
  `,
  fileItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: ${colors.background};
    border-radius: 4px;
    font-size: ${fontSize.sm};
    color: ${colors.text};
  `,
  fileIcon: css`
    width: 14px;
    height: 14px;
    color: ${colors.textSecondary};
    flex-shrink: 0;
  `,
  fileName: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  configRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 6px;
    transition: background 0.15s ease;
    
    &:hover {
      background: ${colors.background};
    }
  `,
  configType: css`
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
  `,
  configFamily: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  `,
  configArrow: css`
    color: ${colors.textMuted};
    margin: 0 8px;
  `,
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: ${colors.textSecondary};
    text-align: center;
  `,
  emptyIcon: css`
    width: 48px;
    height: 48px;
    color: ${colors.textMuted};
    margin-bottom: 16px;
  `,
  emptyTitle: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0 0 8px;
  `,
  emptyDescription: css`
    font-size: ${fontSize.base};
    margin: 0;
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
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: ${colors.textSecondary};
  `,
}

function PlusIcon() {
  return (
    <svg css={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function FontIcon() {
  return (
    <svg css={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      style={{
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function FontsSection({ onOpenUploadModal, isDragging, refreshKey }: FontsSectionProps) {
  const [fontsData, setFontsData] = useState<FontsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)

  const fetchFonts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/studio/fonts/list')
      if (response.ok) {
        const data = await response.json()
        setFontsData(data)
      }
    } catch (error) {
      console.error('Failed to fetch fonts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFonts()
  }, [fetchFonts, refreshKey])

  const toggleFamily = useCallback((name: string) => {
    setExpandedFamily(prev => prev === name ? null : name)
  }, [])

  if (isLoading) {
    return (
      <div css={styles.container}>
        <div css={styles.loading}>Loading fonts...</div>
      </div>
    )
  }

  const hasNoFonts = !fontsData || (fontsData.families.length === 0 && fontsData.configs.length === 0)

  return (
    <div css={styles.container}>
      <div css={styles.toolbar}>
        <div css={styles.toolbarLeft}>
          <button css={[styles.btn, styles.btnPrimary]} onClick={() => onOpenUploadModal()}>
            <PlusIcon />
            Add New
          </button>
        </div>
        <div css={styles.toolbarRight}>
          {fontsData && (
            <span style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {fontsData.families.length} font {fontsData.families.length === 1 ? 'family' : 'families'}
            </span>
          )}
        </div>
      </div>

      <div css={styles.content} style={{ position: 'relative' }}>
        {isDragging && (
          <div css={styles.dropOverlay}>
            <div css={styles.dropMessage}>
              <svg css={styles.dropIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Drop TTF files to upload</span>
            </div>
          </div>
        )}

        {hasNoFonts ? (
          <div css={styles.emptyState}>
            <svg css={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <h2 css={styles.emptyTitle}>No fonts yet</h2>
            <p css={styles.emptyDescription}>
              Drag and drop TTF files here or click "Add New" to upload fonts.
            </p>
          </div>
        ) : (
          <>
            <div css={styles.leftPanel}>
              <h3 css={styles.sectionTitle}>Font Families (_fonts/)</h3>
              <div css={styles.familiesGrid}>
                {fontsData?.families.map((family) => {
                  const isExpanded = expandedFamily === family.name
                  return (
                    <div
                      key={family.name}
                      css={[styles.familyCard, isExpanded && styles.familyCardExpanded]}
                      onClick={() => toggleFamily(family.name)}
                    >
                      <h4 css={styles.familyName}>
                        <FolderIcon />
                        {family.name}
                        <ChevronIcon isOpen={isExpanded} />
                      </h4>
                      <p css={styles.familyCount}>
                        {family.fileCount} {family.fileCount === 1 ? 'file' : 'files'}
                      </p>
                      <div css={styles.weightsRow}>
                        {family.weights.map((weight) => (
                          <span key={weight} css={styles.weightChip}>
                            {weight}
                          </span>
                        ))}
                      </div>
                      {isExpanded && (
                        <div css={styles.filesGrid}>
                          {family.files.map((file) => (
                            <div key={file.path} css={styles.fileItem}>
                              <FontIcon />
                              <span css={styles.fileName}>{file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div css={styles.rightPanel}>
              <div css={styles.panelHeader}>Font Configs (src/fonts/)</div>
              <div css={styles.panelContent}>
                {fontsData?.configs.length === 0 ? (
                  <p style={{ color: colors.textMuted, fontSize: fontSize.sm, margin: 0 }}>
                    No font configs found
                  </p>
                ) : (
                  fontsData?.configs.map((config) => (
                    <div key={config.path} css={styles.configRow}>
                      <span css={styles.configType}>{config.type}</span>
                      <span css={styles.configArrow}>→</span>
                      <span css={styles.configFamily}>{config.family}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default FontsSection
