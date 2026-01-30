import { css } from '@emotion/react'

/**
 * Stripe-inspired design tokens for Studio
 * These are self-contained and agnostic of any parent template styling
 */

// Base font stack - system fonts that work everywhere
export const fontStack = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif`

// Color palette
export const colors = {
  // Primary brand
  primary: '#635bff',
  primaryHover: '#5851e5',
  primaryLight: '#f0f0ff',
  
  // Backgrounds
  background: '#f6f9fc',
  surface: '#ffffff',
  surfaceHover: '#f6f9fc',
  
  // Borders
  border: '#d8dee4',
  borderLight: '#e3e8ee',
  borderHover: '#c1c9d2',
  
  // Text
  text: '#1a1f36',
  textSecondary: '#697386',
  textMuted: '#8792a2',
  
  // Status
  success: '#0d7d4d',
  successLight: '#e6f7ef',
  danger: '#df1b41',
  dangerHover: '#c41535',
  dangerLight: '#fff5f7',
  
  // Shadows
  shadow: 'rgba(50, 50, 93, 0.1)',
  shadowDark: 'rgba(50, 50, 93, 0.2)',
  
  // Special folders
  folder: '#64748b',
  imagesFolder: '#8b5cf6',
  imagesFolderLight: '#f3f0ff',
}

// Font sizes - slightly larger for better readability
export const fontSize = {
  xs: '13px',
  sm: '14px',
  base: '16px',
  md: '17px',
  lg: '19px',
  xl: '22px',
}

// Base reset styles for Studio container - isolates from parent template
export const baseReset = css`
  font-family: ${fontStack};
  font-size: ${fontSize.base};
  line-height: 1.5;
  color: ${colors.text};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  box-sizing: border-box;
  
  *, *::before, *::after {
    box-sizing: border-box;
  }
  
  button, input, select, textarea {
    font-family: inherit;
    font-size: inherit;
  }
`
