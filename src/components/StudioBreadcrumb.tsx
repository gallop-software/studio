/** @jsxImportSource @emotion/react */
'use client'

import { css } from '@emotion/react'
import { useStudio } from './StudioContext'

const styles = {
  container: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 24px;
    background-color: white;
    border-bottom: 1px solid #f3f4f6;
  `,
  backBtn: css`
    padding: 4px;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s;
    
    &:hover {
      background-color: #f3f4f6;
    }
  `,
  backIcon: css`
    width: 16px;
    height: 16px;
    color: #6b7280;
  `,
  nav: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  separator: css`
    color: #d1d5db;
  `,
  btn: css`
    padding: 2px 4px;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    
    &:hover {
      background-color: #f3f4f6;
    }
  `,
  btnActive: css`
    color: #111827;
    font-weight: 500;
  `,
  btnInactive: css`
    color: #6b7280;
    
    &:hover {
      color: #374151;
    }
  `,
}

export function StudioBreadcrumb() {
  const { currentPath, setCurrentPath, navigateUp } = useStudio()

  const parts = currentPath.split('/').filter(Boolean)

  const handleClick = (index: number) => {
    const newPath = parts.slice(0, index + 1).join('/')
    setCurrentPath(newPath)
  }

  return (
    <div css={styles.container}>
      {currentPath !== 'public' && (
        <button css={styles.backBtn} onClick={navigateUp} aria-label="Go back">
          <svg css={styles.backIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <nav css={styles.nav}>
        {parts.map((part, index) => (
          <span key={index} css={styles.item}>
            {index > 0 && <span css={styles.separator}>/</span>}
            <button
              css={[styles.btn, index === parts.length - 1 ? styles.btnActive : styles.btnInactive]}
              onClick={() => handleClick(index)}
            >
              {part}
            </button>
          </span>
        ))}
      </nav>
    </div>
  )
}
