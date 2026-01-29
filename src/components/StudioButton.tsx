/** @jsxImportSource @emotion/react */
'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { css, keyframes } from '@emotion/react'

// Lazy load the full Studio UI to avoid bundling in production
const StudioUI = lazy(() => import('./StudioUI'))

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

// Stripe-inspired design tokens
const colors = {
  primary: '#635bff',
  primaryHover: '#5851e5',
  primaryLight: '#e8e6ff',
  background: '#f6f9fc',
  surface: '#ffffff',
  border: '#e3e8ee',
  text: '#1a1f36',
  textSecondary: '#697386',
  shadow: 'rgba(50, 50, 93, 0.1)',
  shadowDark: 'rgba(50, 50, 93, 0.2)',
}

const styles = {
  button: css`
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9998;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: ${colors.primary};
    color: white;
    box-shadow: 0 4px 12px ${colors.shadowDark}, 0 1px 3px ${colors.shadow};
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px ${colors.shadowDark}, 0 2px 6px ${colors.shadow};
      background: ${colors.primaryHover};
    }
    
    &:active {
      transform: translateY(0);
    }
  `,
  buttonIcon: css`
    width: 24px;
    height: 24px;
  `,
  overlay: css`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 9999;
    transition: opacity 0.2s ease, visibility 0.2s ease;
  `,
  overlayHidden: css`
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  `,
  backdrop: css`
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(26, 31, 54, 0.4);
    backdrop-filter: blur(4px);
  `,
  modal: css`
    position: absolute;
    top: 24px;
    right: 24px;
    bottom: 24px;
    left: 24px;
    background-color: ${colors.surface};
    border-radius: 12px;
    box-shadow: 0 30px 60px -12px rgba(50, 50, 93, 0.25), 0 18px 36px -18px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: ${colors.background};
  `,
  loadingContent: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  `,
  spinner: css`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid ${colors.border};
    border-top-color: ${colors.primary};
    animation: ${spin} 0.8s linear infinite;
  `,
  loadingText: css`
    color: ${colors.textSecondary};
    font-size: 14px;
    font-weight: 500;
    margin: 0;
    letter-spacing: -0.01em;
  `,
}

/**
 * Floating button that opens the Studio modal.
 * Fixed position in bottom-right corner.
 * Only renders in development mode.
 */
export function StudioButton() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)

  // Only render on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleOpen = () => {
    setIsOpen(true)
    setHasBeenOpened(true)
  }

  // Only render in development and on client
  if (!mounted || process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      {!isOpen && (
        <button
          css={styles.button}
          onClick={handleOpen}
          title="Open Studio"
          aria-label="Open Studio media manager"
        >
          <ImageIcon />
        </button>
      )}

      {/* Keep mounted once opened to preserve state */}
      {hasBeenOpened && (
        <div css={[styles.overlay, !isOpen && styles.overlayHidden]}>
          <div css={styles.backdrop} onClick={() => setIsOpen(false)} />
          <div css={styles.modal}>
            <Suspense fallback={<LoadingState />}>
              <StudioUI onClose={() => setIsOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  )
}

function ImageIcon() {
  return (
    <svg
      css={styles.buttonIcon}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function LoadingState() {
  return (
    <div css={styles.loading}>
      <div css={styles.loadingContent}>
        <div css={styles.spinner} />
        <p css={styles.loadingText}>Loading Studio...</p>
      </div>
    </div>
  )
}
