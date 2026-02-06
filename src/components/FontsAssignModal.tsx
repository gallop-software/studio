/** @jsxImportSource @emotion/react */
'use client'

import React, { useState, useEffect } from 'react'
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

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

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
    max-height: 90vh;
    overflow: hidden;
    animation: ${slideIn} 0.2s ease-out;
    display: flex;
    flex-direction: column;
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
    padding: 16px 24px 24px;
    overflow-y: auto;
    flex: 1;
  `,
  section: css`
    margin-bottom: 20px;
    
    &:last-child {
      margin-bottom: 0;
    }
  `,
  sectionLabel: css`
    font-size: ${fontSize.sm};
    font-weight: 600;
    color: ${colors.textSecondary};
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  `,
  folderName: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${colors.background};
    border-radius: 6px;
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
  `,
  folderIcon: css`
    width: 18px;
    height: 18px;
    color: #f9935e;
  `,
  statusBadge: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: ${fontSize.sm};
    margin-top: 8px;
  `,
  statusNeedsGen: css`
    background: #fef3c7;
    color: #92400e;
  `,
  statusReady: css`
    background: #d1fae5;
    color: #065f46;
  `,
  fontList: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  `,
  fontChip: css`
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    background: ${colors.background};
    border-radius: 4px;
    font-size: ${fontSize.sm};
    color: ${colors.text};
  `,
  checkboxList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  checkboxLabel: css`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: ${colors.background};
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
    
    &:hover {
      background: ${colors.surfaceHover};
    }
  `,
  checkbox: css`
    width: 18px;
    height: 18px;
    accent-color: ${colors.primary};
    cursor: pointer;
  `,
  checkboxText: css`
    font-size: ${fontSize.base};
    color: ${colors.text};
    flex: 1;
  `,
  addNewRow: css`
    display: flex;
    gap: 8px;
    margin-top: 12px;
  `,
  addNewInput: css`
    flex: 1;
    padding: 10px 12px;
    font-size: ${fontSize.base};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    background: ${colors.surface};
    color: ${colors.text};
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 2px ${colors.primaryLight};
    }
    
    &::placeholder {
      color: ${colors.textMuted};
    }
  `,
  addNewBtn: css`
    padding: 10px 16px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    color: ${colors.text};
    transition: all 0.15s ease;
    
    &:hover:not(:disabled) {
      background: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  emptyText: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
    padding: 8px 0;
  `,
  errorText: css`
    font-size: ${fontSize.sm};
    color: ${colors.danger};
    margin-top: 4px;
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
  spinner: css`
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: ${spin} 0.75s linear infinite;
    margin-right: 6px;
  `,
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  `,
  loadingSpinner: css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid ${colors.border};
    border-top-color: ${colors.primary};
    animation: ${spin} 0.8s linear infinite;
  `,
}

interface ScanResult {
  folder: string
  folderName: string
  ttfFiles: string[]
  woff2Files: string[]
  detectedFonts: Array<{ file: string; weight: string; weightName: string; style: string }>
  needsGeneration: boolean
  assignments: string[]
}

interface Assignment {
  name: string
  folder: string
}

interface FontsAssignModalProps {
  folderPath: string
  onConfirm: (assignments: string[]) => void
  onCancel: () => void
}

export function FontsAssignModal({ folderPath, onConfirm, onCancel }: FontsAssignModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([])
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set())
  const [newAssignment, setNewAssignment] = useState('')
  const [error, setError] = useState('')
  
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch scan result and existing assignments in parallel
        const [scanRes, assignmentsRes] = await Promise.all([
          fetch('/api/studio/fonts/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folderPath }),
          }),
          fetch('/api/studio/fonts/assignments'),
        ])
        
        if (scanRes.ok) {
          const data = await scanRes.json()
          setScanResult(data)
          // Pre-select assignments that already use this folder
          setSelectedAssignments(new Set(data.assignments || []))
        }
        
        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json()
          setExistingAssignments(data.assignments || [])
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [folderPath])
  
  const handleToggle = (name: string) => {
    setSelectedAssignments(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }
  
  const handleAddNew = () => {
    const name = newAssignment.trim().toLowerCase()
    
    if (!name) return
    
    // Validate: must be valid identifier
    if (!/^[a-z][a-z0-9]*$/.test(name)) {
      setError('Name must start with a letter and contain only letters and numbers')
      return
    }
    
    // Add to selected
    setSelectedAssignments(prev => new Set([...prev, name]))
    setNewAssignment('')
    setError('')
  }
  
  const handleSubmit = () => {
    const assignments = Array.from(selectedAssignments)
    if (assignments.length === 0) return
    onConfirm(assignments)
  }
  
  if (isLoading) {
    return (
      <div css={styles.overlay}>
        <div css={styles.modal}>
          <div css={styles.loading}>
            <div css={styles.loadingSpinner} />
          </div>
        </div>
      </div>
    )
  }
  
  const hasNoFonts = scanResult && scanResult.ttfFiles.length === 0 && scanResult.woff2Files.length === 0
  
  return (
    <div css={styles.overlay} onClick={onCancel}>
      <div css={styles.modal} onClick={e => e.stopPropagation()}>
        <div css={styles.header}>
          <h3 css={styles.title}>Assign Web Font</h3>
        </div>
        
        <div css={styles.body}>
          {/* Folder Info */}
          <div css={styles.section}>
            <p css={styles.sectionLabel}>Font Folder</p>
            <div css={styles.folderName}>
              <svg css={styles.folderIcon} fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
              </svg>
              {scanResult?.folderName || folderPath.split('/').pop()}
            </div>
            
            {scanResult && (
              <div css={[styles.statusBadge, scanResult.needsGeneration ? styles.statusNeedsGen : styles.statusReady]}>
                {scanResult.needsGeneration ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    woff2 files will be generated ({scanResult.ttfFiles.length} TTF files)
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    woff2 files ready ({scanResult.woff2Files.length} files)
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Detected Fonts Preview */}
          {scanResult && scanResult.detectedFonts.length > 0 && (
            <div css={styles.section}>
              <p css={styles.sectionLabel}>Detected Fonts</p>
              <div css={styles.fontList}>
                {scanResult.detectedFonts.map((font, i) => (
                  <span key={i} css={styles.fontChip}>
                    {font.weightName}{font.style === 'italic' ? ' Italic' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* If needs generation, show TTF list */}
          {scanResult && scanResult.needsGeneration && (
            <div css={styles.section}>
              <p css={styles.sectionLabel}>TTF Files to Convert</p>
              <div css={styles.fontList}>
                {scanResult.ttfFiles.slice(0, 8).map((file, i) => (
                  <span key={i} css={styles.fontChip}>{file}</span>
                ))}
                {scanResult.ttfFiles.length > 8 && (
                  <span css={styles.fontChip}>+{scanResult.ttfFiles.length - 8} more</span>
                )}
              </div>
            </div>
          )}
          
          {/* Assignment Checkboxes */}
          {!hasNoFonts && (
            <div css={styles.section}>
              <p css={styles.sectionLabel}>Assign To</p>
              
              {existingAssignments.length > 0 ? (
                <div css={styles.checkboxList}>
                  {existingAssignments.map(assignment => (
                    <label key={assignment.name} css={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        css={styles.checkbox}
                        checked={selectedAssignments.has(assignment.name)}
                        onChange={() => handleToggle(assignment.name)}
                      />
                      <span css={styles.checkboxText}>{assignment.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p css={styles.emptyText}>No existing font assignments</p>
              )}
              
              {/* Show newly added assignments that aren't in existingAssignments */}
              {Array.from(selectedAssignments)
                .filter(name => !existingAssignments.find(a => a.name === name))
                .map(name => (
                  <label key={name} css={[styles.checkboxLabel, { marginTop: 8 }]}>
                    <input
                      type="checkbox"
                      css={styles.checkbox}
                      checked={true}
                      onChange={() => handleToggle(name)}
                    />
                    <span css={styles.checkboxText}>{name} (new)</span>
                  </label>
                ))}
              
              <div css={styles.addNewRow}>
                <input
                  type="text"
                  css={styles.addNewInput}
                  placeholder="Add new assignment..."
                  value={newAssignment}
                  onChange={e => {
                    setNewAssignment(e.target.value)
                    setError('')
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddNew()
                    }
                  }}
                />
                <button
                  css={styles.addNewBtn}
                  onClick={handleAddNew}
                  disabled={!newAssignment.trim()}
                >
                  Add
                </button>
              </div>
              {error && <p css={styles.errorText}>{error}</p>}
            </div>
          )}
          
          {hasNoFonts && (
            <div css={styles.section}>
              <p css={styles.emptyText}>This folder does not contain any TTF or woff2 font files.</p>
            </div>
          )}
        </div>
        
        <div css={styles.footer}>
          <button css={[styles.btn, styles.btnCancel]} onClick={onCancel}>
            Cancel
          </button>
          <button
            css={[styles.btn, styles.btnConfirm]}
            onClick={handleSubmit}
            disabled={selectedAssignments.size === 0 || hasNoFonts}
          >
            Assign Font{selectedAssignments.size > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FontsAssignModal
