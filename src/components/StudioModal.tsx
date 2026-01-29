/** @jsxImportSource @emotion/react */
'use client'

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
    max-width: 420px;
    width: 90%;
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
  `,
  message: css`
    font-size: ${fontSize.base};
    color: ${colors.textSecondary};
    margin: 0;
    line-height: 1.6;
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
    
    &:hover {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
  `,
  btnDanger: css`
    background-color: ${colors.danger};
    border: 1px solid ${colors.danger};
    color: white;
    
    &:hover {
      background-color: ${colors.dangerHover};
      border-color: ${colors.dangerHover};
    }
  `,
}

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div css={styles.overlay} onClick={onCancel}>
      <div css={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <h3 css={styles.title}>{title}</h3>
        </div>
        <div css={styles.body}>
          <p css={styles.message}>{message}</p>
        </div>
        <div css={styles.footer}>
          <button css={[styles.btn, styles.btnCancel]} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            css={[styles.btn, variant === 'danger' ? styles.btnDanger : styles.btnConfirm]}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AlertModalProps {
  title: string
  message: string
  buttonLabel?: string
  onClose: () => void
}

export function AlertModal({
  title,
  message,
  buttonLabel = 'OK',
  onClose,
}: AlertModalProps) {
  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <h3 css={styles.title}>{title}</h3>
        </div>
        <div css={styles.body}>
          <p css={styles.message}>{message}</p>
        </div>
        <div css={styles.footer}>
          <button css={[styles.btn, styles.btnConfirm]} onClick={onClose}>
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const progressStyles = {
  progressContainer: css`
    margin-top: 16px;
  `,
  progressBar: css`
    width: 100%;
    height: 8px;
    background-color: ${colors.background};
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
  `,
  progressFill: css`
    height: 100%;
    background: linear-gradient(90deg, ${colors.primary}, ${colors.primaryHover});
    border-radius: 4px;
    transition: width 0.3s ease;
  `,
  progressText: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `,
  currentFile: css`
    font-size: ${fontSize.xs};
    color: ${colors.textMuted};
    margin: 8px 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
}

export interface ProgressState {
  current: number
  total: number
  percent: number
  currentFile?: string
  status: 'processing' | 'cleanup' | 'complete' | 'error'
  message?: string
  processed?: number
  orphansRemoved?: number
  errors?: number
}

interface ProgressModalProps {
  title: string
  progress: ProgressState
  onClose?: () => void
}

export function ProgressModal({
  title,
  progress,
  onClose,
}: ProgressModalProps) {
  const isComplete = progress.status === 'complete'
  const isError = progress.status === 'error'
  const canClose = isComplete || isError

  return (
    <div css={styles.overlay} onClick={canClose ? onClose : undefined}>
      <div css={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <h3 css={styles.title}>{title}</h3>
        </div>
        <div css={styles.body}>
          {isError ? (
            <p css={styles.message}>{progress.message || 'An error occurred'}</p>
          ) : isComplete ? (
            <p css={styles.message}>
              Processed {progress.processed} image{progress.processed !== 1 ? 's' : ''}.
              {progress.orphansRemoved && progress.orphansRemoved > 0 && (
                <> Removed {progress.orphansRemoved} orphaned thumbnail{progress.orphansRemoved !== 1 ? 's' : ''}.</>
              )}
              {progress.errors && progress.errors > 0 && (
                <> {progress.errors} error{progress.errors !== 1 ? 's' : ''} occurred.</>
              )}
            </p>
          ) : (
            <>
              <p css={styles.message}>
                {progress.status === 'cleanup' 
                  ? 'Cleaning up orphaned files...' 
                  : `Processing images...`}
              </p>
              <div css={progressStyles.progressContainer}>
                <div css={progressStyles.progressBar}>
                  <div 
                    css={progressStyles.progressFill} 
                    style={{ width: `${progress.percent}%` }} 
                  />
                </div>
                <div css={progressStyles.progressText}>
                  <span>{progress.current} of {progress.total}</span>
                  <span>{progress.percent}%</span>
                </div>
                {progress.currentFile && (
                  <p css={progressStyles.currentFile} title={progress.currentFile}>
                    {progress.currentFile}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        {canClose && (
          <div css={styles.footer}>
            <button css={[styles.btn, styles.btnConfirm]} onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
