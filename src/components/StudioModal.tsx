/** @jsxImportSource @emotion/react */
'use client'

import { css, keyframes } from '@emotion/react'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { 
    opacity: 0;
    transform: scale(0.95);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
`

const styles = {
  overlay: css`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: ${fadeIn} 0.15s ease-out;
  `,
  modal: css`
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 400px;
    width: 90%;
    animation: ${slideIn} 0.15s ease-out;
  `,
  header: css`
    padding: 20px 24px 0;
  `,
  title: css`
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0;
  `,
  body: css`
    padding: 12px 24px 24px;
  `,
  message: css`
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
  `,
  footer: css`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #e5e7eb;
    background-color: #f9fafb;
    border-radius: 0 0 12px 12px;
  `,
  btn: css`
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  `,
  btnCancel: css`
    background-color: white;
    border: 1px solid #d1d5db;
    color: #374151;
    
    &:hover {
      background-color: #f9fafb;
    }
  `,
  btnConfirm: css`
    background-color: #9333ea;
    border: 1px solid #9333ea;
    color: white;
    
    &:hover {
      background-color: #7c3aed;
    }
  `,
  btnDanger: css`
    background-color: #dc2626;
    border: 1px solid #dc2626;
    color: white;
    
    &:hover {
      background-color: #b91c1c;
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
