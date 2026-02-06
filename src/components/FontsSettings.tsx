/** @jsxImportSource @emotion/react */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
    max-height: 80vh;
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
  assignmentList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  assignmentRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: ${colors.background};
    border-radius: 8px;
    border: 1px solid ${colors.border};
  `,
  assignmentInfo: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  `,
  assignmentName: css`
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
  `,
  assignmentFolder: css`
    font-size: ${fontSize.sm};
    color: ${colors.textMuted};
    
    &::before {
      content: '→';
      margin-right: 6px;
      color: ${colors.textMuted};
    }
  `,
  deleteBtn: css`
    padding: 6px 12px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 4px;
    cursor: pointer;
    color: ${colors.textSecondary};
    transition: all 0.15s ease;
    
    &:hover {
      background: ${colors.dangerLight};
      border-color: ${colors.danger};
      color: ${colors.danger};
    }
  `,
  confirmRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  confirmBtn: css`
    padding: 6px 12px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    background: ${colors.danger};
    border: 1px solid ${colors.danger};
    border-radius: 4px;
    cursor: pointer;
    color: white;
    transition: all 0.15s ease;
    
    &:hover {
      background: ${colors.dangerHover};
      border-color: ${colors.dangerHover};
    }
  `,
  cancelBtn: css`
    padding: 6px 12px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 4px;
    cursor: pointer;
    color: ${colors.textSecondary};
    transition: all 0.15s ease;
    
    &:hover {
      background: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  emptyText: css`
    font-size: ${fontSize.base};
    color: ${colors.textMuted};
    text-align: center;
    padding: 32px 0;
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
  btnPrimary: css`
    background-color: ${colors.primary};
    border: 1px solid ${colors.primary};
    color: white;
    
    &:hover {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
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

interface Assignment {
  name: string
  folder: string
}

interface FontsSettingsProps {
  onClose: () => void
  onRefresh?: () => void
}

export function FontsSettings({ onClose, onRefresh }: FontsSettingsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  
  const loadAssignments = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/fonts/assignments')
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      }
    } catch (err) {
      console.error('Failed to load assignments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])
  
  const handleDeleteClick = (name: string) => {
    setConfirmingDelete(name)
  }
  
  const handleCancelDelete = () => {
    setConfirmingDelete(null)
  }
  
  const handleConfirmDelete = async (name: string) => {
    try {
      const res = await fetch('/api/studio/fonts/delete-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      
      if (res.ok) {
        setAssignments(prev => prev.filter(a => a.name !== name))
        setConfirmingDelete(null)
        onRefresh?.()
      }
    } catch (err) {
      console.error('Failed to delete assignment:', err)
    }
  }
  
  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.modal} onClick={e => e.stopPropagation()}>
        <div css={styles.header}>
          <h3 css={styles.title}>Font Assignments</h3>
        </div>
        
        <div css={styles.body}>
          {isLoading ? (
            <div css={styles.loading}>
              <div css={styles.loadingSpinner} />
            </div>
          ) : assignments.length === 0 ? (
            <p css={styles.emptyText}>
              No font assignments yet.<br />
              Select a folder and click "Assign Web Font" to create one.
            </p>
          ) : (
            <div css={styles.assignmentList}>
              {assignments.map(assignment => (
                <div key={assignment.name} css={styles.assignmentRow}>
                  <div css={styles.assignmentInfo}>
                    <span css={styles.assignmentName}>{assignment.name}</span>
                    <span css={styles.assignmentFolder}>{assignment.folder}</span>
                  </div>
                  
                  {confirmingDelete === assignment.name ? (
                    <div css={styles.confirmRow}>
                      <button
                        css={styles.confirmBtn}
                        onClick={() => handleConfirmDelete(assignment.name)}
                      >
                        Delete?
                      </button>
                      <button
                        css={styles.cancelBtn}
                        onClick={handleCancelDelete}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      css={styles.deleteBtn}
                      onClick={() => handleDeleteClick(assignment.name)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div css={styles.footer}>
          <button css={[styles.btn, styles.btnPrimary]} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default FontsSettings
