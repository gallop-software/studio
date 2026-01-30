/** @jsxImportSource @emotion/react */
'use client'

import { css } from '@emotion/react'
import { useStudio } from './StudioContext'
import { colors, fontSize } from './tokens'

const styles = {
  overlay: css`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  `,
  modal: css`
    background: ${colors.surface};
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  `,
  icon: css`
    width: 24px;
    height: 24px;
    color: ${colors.danger};
    flex-shrink: 0;
  `,
  title: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
  `,
  message: css`
    font-size: ${fontSize.base};
    color: ${colors.textSecondary};
    margin: 0 0 20px 0;
    line-height: 1.5;
  `,
  button: css`
    width: 100%;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: ${fontSize.base};
    font-weight: 500;
    border: none;
    background: ${colors.primary};
    color: white;
    cursor: pointer;
    transition: background 0.15s ease;
    
    &:hover {
      background: ${colors.primaryHover};
    }
  `,
}

export function ErrorModal() {
  const { error, clearError } = useStudio()

  if (!error) return null

  return (
    <div css={styles.overlay} onClick={clearError}>
      <div css={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 css={styles.title}>{error.title}</h3>
        </div>
        <p css={styles.message}>{error.message}</p>
        <button css={styles.button} onClick={clearError}>
          OK
        </button>
      </div>
    </div>
  )
}
