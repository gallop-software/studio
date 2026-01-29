/** @jsxImportSource @emotion/react */
'use client'

import { css } from '@emotion/react'
import { useStudio } from './StudioContext'
import { colors, fontSize } from './tokens'

const styles = {
  container: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background-color: ${colors.surface};
    border-bottom: 1px solid ${colors.borderLight};
  `,
  backBtn: css`
    padding: 6px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  backIcon: css`
    width: 16px;
    height: 16px;
    color: ${colors.textSecondary};
  `,
  nav: css`
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: ${fontSize.base};
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 2px;
  `,
  separator: css`
    color: ${colors.textMuted};
    margin: 0 2px;
  `,
  btn: css`
    padding: 4px 8px;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: ${fontSize.base};
    letter-spacing: -0.01em;
    
    &:hover {
      background-color: ${colors.surfaceHover};
    }
  `,
  btnActive: css`
    color: ${colors.text};
    font-weight: 600;
  `,
  btnInactive: css`
    color: ${colors.textSecondary};
    
    &:hover {
      color: ${colors.text};
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
