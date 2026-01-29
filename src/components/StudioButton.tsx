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

const styles = {
  button: css`
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9998;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(to bottom right, #a855f7, #ec4899);
    color: white;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
    transition: opacity 0.2s, visibility 0.2s;
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
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  `,
  modal: css`
    position: absolute;
    top: 32px;
    right: 32px;
    bottom: 32px;
    left: 32px;
    background-color: white;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  `,
  loadingContent: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  `,
  spinner: css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-bottom-color: #9333ea;
    animation: ${spin} 1s linear infinite;
  `,
  loadingText: css`
    color: #6b7280;
    font-size: 14px;
    margin: 0;
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
