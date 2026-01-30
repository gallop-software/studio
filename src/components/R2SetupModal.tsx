/** @jsxImportSource @emotion/react */
'use client'

import { useState } from 'react'
import { css } from '@emotion/react'
import { colors, fontSize } from './tokens'

const ENV_TEMPLATE = `CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev`

interface R2SetupModalProps {
  isOpen: boolean
  onClose: () => void
}

const styles = {
  overlay: css`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 20px;
  `,
  modal: css`
    background: ${colors.surface};
    border-radius: 12px;
    max-width: 560px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid ${colors.border};
  `,
  icon: css`
    width: 32px;
    height: 32px;
    color: ${colors.primary};
    flex-shrink: 0;
  `,
  title: css`
    font-size: ${fontSize.xl};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
  `,
  closeBtn: css`
    margin-left: auto;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: ${colors.textMuted};
    border-radius: 4px;
    
    &:hover {
      color: ${colors.text};
      background: ${colors.surfaceHover};
    }
  `,
  closeIcon: css`
    width: 20px;
    height: 20px;
  `,
  content: css`
    padding: 24px;
  `,
  intro: css`
    font-size: ${fontSize.base};
    color: ${colors.textSecondary};
    margin: 0 0 20px 0;
    line-height: 1.6;
  `,
  steps: css`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  step: css`
    display: flex;
    gap: 12px;
  `,
  stepNumber: css`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${colors.primaryLight};
    color: ${colors.primary};
    font-size: ${fontSize.sm};
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `,
  stepContent: css`
    flex: 1;
    padding-top: 3px;
  `,
  stepTitle: css`
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
    margin: 0 0 4px 0;
  `,
  stepDesc: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 0;
    line-height: 1.5;
  `,
  link: css`
    color: ${colors.primary};
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  `,
  envVarsWrapper: css`
    position: relative;
    margin-top: 20px;
  `,
  envVars: css`
    background: ${colors.background};
    border: 1px solid ${colors.border};
    border-radius: 8px;
    padding: 16px;
    padding-right: 48px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 13px;
    line-height: 1.8;
    color: ${colors.text};
    overflow-x: auto;
  `,
  envVar: css`
    display: block;
  `,
  envKey: css`
    color: ${colors.primary};
  `,
  envValue: css`
    color: ${colors.textSecondary};
  `,
  copyBtn: css`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    color: ${colors.textMuted};
    transition: all 0.15s ease;
    
    &:hover {
      background: ${colors.surfaceHover};
      color: ${colors.text};
      border-color: #d0d5dd;
    }
  `,
  copyIcon: css`
    width: 16px;
    height: 16px;
  `,
  copiedTooltip: css`
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
  footer: css`
    padding: 16px 24px;
    border-top: 1px solid ${colors.border};
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  `,
  docsBtn: css`
    padding: 10px 16px;
    border-radius: 6px;
    font-size: ${fontSize.base};
    font-weight: 500;
    border: 1px solid ${colors.border};
    background: ${colors.surface};
    color: ${colors.text};
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
    
    &:hover {
      background: ${colors.surfaceHover};
      border-color: #d0d5dd;
    }
  `,
  doneBtn: css`
    padding: 10px 20px;
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
  externalIcon: css`
    width: 14px;
    height: 14px;
  `,
}

export function R2SetupModal({ isOpen, onClose }: R2SetupModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ENV_TEMPLATE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          <h2 css={styles.title}>Set Up CDN Storage</h2>
          <button css={styles.closeBtn} onClick={onClose}>
            <svg css={styles.closeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div css={styles.content}>
          <p css={styles.intro}>
            Sync your images to Cloudflare R2 for faster global delivery. R2 offers generous free tier with no egress fees.
          </p>

          <ol css={styles.steps}>
            <li css={styles.step}>
              <span css={styles.stepNumber}>1</span>
              <div css={styles.stepContent}>
                <h4 css={styles.stepTitle}>Create a Cloudflare account</h4>
                <p css={styles.stepDesc}>
                  Sign up at{' '}
                  <a css={styles.link} href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer">
                    dash.cloudflare.com
                  </a>
                  {' '}if you don't have one already.
                </p>
              </div>
            </li>

            <li css={styles.step}>
              <span css={styles.stepNumber}>2</span>
              <div css={styles.stepContent}>
                <h4 css={styles.stepTitle}>Create an R2 bucket</h4>
                <p css={styles.stepDesc}>
                  Go to R2 in your Cloudflare dashboard and create a new bucket. Choose a name like <code>my-images</code>.
                </p>
              </div>
            </li>

            <li css={styles.step}>
              <span css={styles.stepNumber}>3</span>
              <div css={styles.stepContent}>
                <h4 css={styles.stepTitle}>Enable public access</h4>
                <p css={styles.stepDesc}>
                  In bucket settings, enable "Public Access" and copy the public URL (e.g., <code>https://pub-xxx.r2.dev</code>).
                </p>
              </div>
            </li>

            <li css={styles.step}>
              <span css={styles.stepNumber}>4</span>
              <div css={styles.stepContent}>
                <h4 css={styles.stepTitle}>Create API token</h4>
                <p css={styles.stepDesc}>
                  Go to R2 → Manage R2 API Tokens → Create API Token. Select "Object Read & Write" permissions for your bucket.
                </p>
              </div>
            </li>

            <li css={styles.step}>
              <span css={styles.stepNumber}>5</span>
              <div css={styles.stepContent}>
                <h4 css={styles.stepTitle}>Add environment variables</h4>
                <p css={styles.stepDesc}>
                  Add these to your <code>.env.local</code> file:
                </p>
              </div>
            </li>
          </ol>

          <div css={styles.envVarsWrapper}>
            <div css={styles.envVars}>
              <span css={styles.envVar}>
                <span css={styles.envKey}>CLOUDFLARE_R2_ACCOUNT_ID</span>=<span css={styles.envValue}>your_account_id</span>
              </span>
              <span css={styles.envVar}>
                <span css={styles.envKey}>CLOUDFLARE_R2_ACCESS_KEY_ID</span>=<span css={styles.envValue}>your_access_key</span>
              </span>
              <span css={styles.envVar}>
                <span css={styles.envKey}>CLOUDFLARE_R2_SECRET_ACCESS_KEY</span>=<span css={styles.envValue}>your_secret_key</span>
              </span>
              <span css={styles.envVar}>
                <span css={styles.envKey}>CLOUDFLARE_R2_BUCKET_NAME</span>=<span css={styles.envValue}>your_bucket_name</span>
              </span>
              <span css={styles.envVar}>
                <span css={styles.envKey}>CLOUDFLARE_R2_PUBLIC_URL</span>=<span css={styles.envValue}>https://pub-xxx.r2.dev</span>
              </span>
            </div>
            <button css={styles.copyBtn} onClick={handleCopy} title="Copy to clipboard">
              {copied && <span css={styles.copiedTooltip}>Copied!</span>}
              <svg css={styles.copyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div css={styles.footer}>
          <a
            css={styles.docsBtn}
            href="https://developers.cloudflare.com/r2/get-started/"
            target="_blank"
            rel="noopener noreferrer"
          >
            R2 Documentation
            <svg css={styles.externalIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button css={styles.doneBtn} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
