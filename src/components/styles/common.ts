import { css, keyframes } from '@emotion/react'
import { colors, fontSize } from '../tokens'

// Common keyframes
export const spin = keyframes`
  to { transform: rotate(360deg); }
`

// Loading states
export const loadingStyles = {
  container: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 256px;
  `,
  spinner: css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid ${colors.border};
    border-top-color: ${colors.primary};
    animation: ${spin} 0.8s linear infinite;
  `,
}

// Empty states
export const emptyStyles = {
  container: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 256px;
    color: ${colors.textSecondary};
  `,
  icon: css`
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  `,
  text: css`
    font-size: ${fontSize.base};
    margin: 0 0 4px 0;
    
    &:last-child {
      color: ${colors.textMuted};
      font-size: ${fontSize.sm};
    }
  `,
}

// Buttons
export const buttonStyles = {
  base: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    border: 1px solid ${colors.border};
    background: ${colors.surface};
    color: ${colors.text};
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    
    &:hover:not(:disabled) {
      background: ${colors.surfaceHover};
      border-color: #d0d5dd;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  primary: css`
    background: ${colors.primary};
    border-color: ${colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
  `,
  danger: css`
    color: ${colors.danger};
    
    &:hover:not(:disabled) {
      background: ${colors.dangerLight};
      border-color: ${colors.dangerLight};
    }
  `,
  icon: css`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  `,
}

// Checkboxes
export const checkboxStyles = {
  checkbox: css`
    width: 16px;
    height: 16px;
    accent-color: ${colors.primary};
    cursor: pointer;
  `,
}

// Copy button with tooltip
export const copyButtonStyles = {
  button: css`
    height: 28px;
    width: 28px;
    color: ${colors.textMuted};
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    &:hover {
      color: ${colors.text};
    }
  `,
  icon: css`
    width: 18px;
    height: 18px;
  `,
  tooltip: css`
    position: absolute;
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    background: #1a1f36;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    margin-right: 6px;
    pointer-events: none;
    z-index: 100;
    
    &::before {
      content: '';
      position: absolute;
      right: -4px;
      top: 50%;
      transform: translateY(-50%);
      border-left: 4px solid #1a1f36;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
    }
  `,
}

// CDN badge
export const cdnBadgeStyles = {
  badge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: ${fontSize.xs};
    font-weight: 500;
    background: ${colors.successLight};
    color: ${colors.success};
  `,
  icon: css`
    width: 12px;
    height: 12px;
  `,
  empty: css`
    color: ${colors.textMuted};
    font-size: ${fontSize.sm};
  `,
}

// Folder icons
export const folderIconStyles = {
  folder: css`
    width: 48px;
    height: 48px;
    color: ${colors.folder};
  `,
  imagesFolder: css`
    width: 48px;
    height: 48px;
    color: ${colors.imagesFolder};
  `,
  lock: css`
    width: 16px;
    height: 16px;
    position: absolute;
    bottom: 0;
    right: 0;
    color: ${colors.imagesFolder};
  `,
}

// Select all row
export const selectAllStyles = {
  row: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    margin-bottom: 8px;
    border-bottom: 1px solid ${colors.border};
  `,
  label: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    cursor: pointer;
    
    &:hover {
      color: ${colors.text};
    }
  `,
}
