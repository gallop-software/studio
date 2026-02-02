/** @jsxImportSource @emotion/react */
'use client'

import { useEffect, useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { studioApi } from '../lib/api'
import { colors, fontSize } from './tokens'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const styles = {
  overlay: css`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    animation: ${fadeIn} 0.15s ease;
  `,
  modal: css`
    background: ${colors.surface};
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 440px;
    animation: ${slideIn} 0.2s ease;
    overflow: hidden;
  `,
  header: css`
    padding: 20px 24px;
    border-bottom: 1px solid ${colors.border};
  `,
  title: css`
    font-size: ${fontSize.lg};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
  `,
  subtitle: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 4px 0 0 0;
  `,
  body: css`
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  loading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  `,
  spinner: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid ${colors.border};
    border-top-color: ${colors.primary};
    animation: ${spin} 0.8s linear infinite;
  `,
  urlButton: css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 16px 20px;
    background: ${colors.background};
    border: 1px solid ${colors.border};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    
    &:hover:not(:disabled) {
      background: ${colors.surfaceHover};
      border-color: ${colors.primary};
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  urlLabel: css`
    font-size: ${fontSize.xs};
    font-weight: 600;
    color: ${colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  `,
  urlValue: css`
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
    word-break: break-all;
  `,
  noOptions: css`
    padding: 20px;
    text-align: center;
    color: ${colors.textSecondary};
    font-size: ${fontSize.sm};
  `,
  footer: css`
    padding: 16px 24px;
    border-top: 1px solid ${colors.border};
    display: flex;
    justify-content: flex-end;
  `,
  cancelBtn: css`
    padding: 10px 20px;
    font-size: ${fontSize.base};
    font-weight: 500;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: ${colors.text};
    
    &:hover {
      background: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
}

interface FeaturedImageModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
}

export function FeaturedImageModal({ isOpen, onClose, onSelect }: FeaturedImageModalProps) {
  const [loading, setLoading] = useState(true)
  const [devUrl, setDevUrl] = useState<string | null>(null)
  const [productionUrl, setProductionUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function loadOptions() {
      setLoading(true)
      try {
        const options = await studioApi.getFeaturedImageOptions()
        setDevUrl(options.devUrl)
        setProductionUrl(options.productionUrl)
      } catch (error) {
        console.error('Failed to load featured image options:', error)
      }
      setLoading(false)
    }

    loadOptions()
  }, [isOpen])

  if (!isOpen) return null

  const hasOptions = devUrl || productionUrl

  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <h2 css={styles.title}>Generate Featured Image</h2>
          <p css={styles.subtitle}>Choose which URL to screenshot</p>
        </div>

        <div css={styles.body}>
          {loading ? (
            <div css={styles.loading}>
              <div css={styles.spinner} />
            </div>
          ) : hasOptions ? (
            <>
              {devUrl && (
                <button
                  css={styles.urlButton}
                  onClick={() => onSelect(devUrl)}
                >
                  <span css={styles.urlLabel}>Development</span>
                  <span css={styles.urlValue}>{devUrl}</span>
                </button>
              )}
              {productionUrl && (
                <button
                  css={styles.urlButton}
                  onClick={() => onSelect(productionUrl)}
                >
                  <span css={styles.urlLabel}>Production</span>
                  <span css={styles.urlValue}>{productionUrl}</span>
                </button>
              )}
            </>
          ) : (
            <div css={styles.noOptions}>
              No URLs configured. Set <code>NEXT_PUBLIC_PRODUCTION_URL</code> in
              .env.local and/or .env.production.
            </div>
          )}
        </div>

        <div css={styles.footer}>
          <button css={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
