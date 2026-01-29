/** @jsxImportSource @emotion/react */
'use client'

import { css, keyframes } from '@emotion/react'

// Stripe-inspired design tokens
const colors = {
  primary: '#635bff',
  primaryHover: '#5851e5',
  background: '#f6f9fc',
  surface: '#ffffff',
  surfaceHover: '#f6f9fc',
  border: '#e3e8ee',
  text: '#1a1f36',
  textSecondary: '#697386',
  danger: '#df1b41',
  dangerHover: '#c41535',
}

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
  `,
  modal: css`
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
    font-size: 17px;
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
    letter-spacing: -0.02em;
  `,
  body: css`
    padding: 12px 24px 24px;
  `,
  message: css`
    font-size: 14px;
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
    font-size: 14px;
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
      border-color: #d0d5dd;
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
