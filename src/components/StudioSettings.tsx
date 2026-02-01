/** @jsxImportSource @emotion/react */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { css } from '@emotion/react'
import { colors, fontSize, baseReset } from './tokens'
import { useStudio } from './StudioContext'

// Standard button height for consistency
const btnHeight = '36px'

const styles = {
  btn: css`
    height: ${btnHeight};
    padding: 0 12px;
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
  icon: css`
    width: 16px;
    height: 16px;
    color: ${colors.textSecondary};
  `,
  overlay: css`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background-color: rgba(26, 31, 54, 0.4);
    backdrop-filter: blur(4px);
    overflow-y: auto;
    padding: 48px 24px;
  `,
  panel: css`
    ${baseReset}
    position: relative;
    background-color: ${colors.surface};
    border-radius: 12px;
    box-shadow: 0 30px 60px -12px rgba(50, 50, 93, 0.25), 0 18px 36px -18px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 512px;
    padding: 24px;
    margin: auto 0;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  `,
  title: css`
    font-size: ${fontSize.xl};
    font-weight: 600;
    color: ${colors.text};
    margin: 0;
    letter-spacing: -0.02em;
  `,
  closeBtn: css`
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
  sections: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  sectionTitle: css`
    font-size: ${fontSize.base};
    font-weight: 600;
    color: ${colors.text};
    margin: 0 0 12px 0;
  `,
  description: css`
    font-size: ${fontSize.sm};
    color: ${colors.textSecondary};
    margin: 0 0 12px 0;
  `,
  codeWrapper: css`
    position: relative;
  `,
  code: css`
    background-color: ${colors.background};
    border-radius: 8px;
    padding: 12px;
    padding-right: 40px;
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: ${fontSize.xs};
    color: ${colors.textSecondary};
    border: 1px solid ${colors.border};
    overflow-x: auto;
    white-space: nowrap;
  `,
  copyBtn: css`
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 4px;
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
  tooltip: css`
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1f36;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    margin-bottom: 6px;
    pointer-events: none;
    z-index: 100;
    
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 4px solid transparent;
      border-top-color: #1a1f36;
    }
  `,
  copyIcon: css`
    width: 14px;
    height: 14px;
    color: ${colors.textSecondary};
  `,
  codeLine: css`
    margin: 0 0 4px 0;
    
    &:last-child {
      margin: 0;
    }
  `,
  input: css`
    width: 100%;
    padding: 10px 14px;
    border: 1px solid ${colors.border};
    border-radius: 6px;
    font-size: ${fontSize.base};
    color: ${colors.text};
    background: ${colors.surface};
    transition: all 0.15s ease;
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 3px ${colors.primaryLight};
    }
    
    &::placeholder {
      color: ${colors.textMuted};
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  `,
  label: css`
    font-size: ${fontSize.xs};
    font-weight: 500;
    color: ${colors.textSecondary};
    display: block;
    margin-bottom: 6px;
  `,
  footer: css`
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid ${colors.border};
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  `,
  cancelBtn: css`
    padding: 10px 18px;
    font-size: ${fontSize.base};
    font-weight: 500;
    color: ${colors.text};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      background-color: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  saveBtn: css`
    padding: 10px 18px;
    font-size: ${fontSize.base};
    font-weight: 500;
    color: white;
    background-color: ${colors.primary};
    border: 1px solid ${colors.primary};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
      background-color: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
  cdnList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  cdnRow: css`
    display: flex;
    gap: 8px;
    align-items: center;
  `,
  cdnInput: css`
    flex: 1;
    padding: 8px 12px;
    border: 1px solid ${colors.border};
    border-radius: 6px;
    font-size: ${fontSize.sm};
    color: ${colors.text};
    background: ${colors.surface};
    transition: all 0.15s ease;
    
    &:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 3px ${colors.primaryLight};
    }
  `,
  cdnIndex: css`
    font-size: ${fontSize.xs};
    color: ${colors.textMuted};
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  `,
  cdnDeleteBtn: css`
    padding: 6px;
    background: none;
    border: none;
    cursor: pointer;
    color: ${colors.textMuted};
    transition: color 0.15s;
    flex-shrink: 0;
    
    &:hover {
      color: ${colors.danger};
    }
  `,
  cdnAddBtn: css`
    padding: 8px 12px;
    font-size: ${fontSize.sm};
    font-weight: 500;
    color: ${colors.primary};
    background: ${colors.primaryLight};
    border: 1px dashed ${colors.primary};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    
    &:hover {
      background: ${colors.surface};
    }
  `,
  warning: css`
    font-size: ${fontSize.xs};
    color: ${colors.danger};
    margin-top: 8px;
    padding: 8px 12px;
    background: ${colors.dangerLight};
    border-radius: 6px;
  `,
}

export function StudioSettings() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button css={styles.btn} onClick={() => setIsOpen(true)} aria-label="Settings">
        <svg
          css={styles.icon}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {isOpen && <SettingsPanel onClose={() => setIsOpen(false)} />}
    </>
  )
}

const envTemplate = `# Dev site link (opens from Studio header)
STUDIO_DEV_SITE_URL=http://localhost:3000

# Cloudflare R2 Storage
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://your-cdn.example.com

# Cloudflare Cache Purge
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token`

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { triggerRefresh } = useStudio()
  const [copied, setCopied] = useState(false)
  const [cdnUrls, setCdnUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load CDN URLs on mount
  useEffect(() => {
    async function loadCdns() {
      try {
        const response = await fetch('/api/studio/cdns')
        const data = await response.json()
        setCdnUrls(data.cdns || [])
      } catch (error) {
        console.error('Failed to load CDN URLs:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCdns()
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(envTemplate)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCdnChange = useCallback((index: number, value: string) => {
    setCdnUrls(prev => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
    setHasChanges(true)
  }, [])

  const handleAddCdn = useCallback(() => {
    setCdnUrls(prev => [...prev, ''])
    setHasChanges(true)
  }, [])

  const handleDeleteCdn = useCallback((index: number) => {
    setCdnUrls(prev => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/studio/cdns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Preserve empty strings as placeholders to maintain indices
        body: JSON.stringify({ cdns: cdnUrls }),
      })
      
      if (response.ok) {
        setHasChanges(false)
        triggerRefresh()
        onClose()
      }
    } catch (error) {
      console.error('Failed to save CDN URLs:', error)
    } finally {
      setSaving(false)
    }
  }, [cdnUrls, triggerRefresh, onClose])

  return (
    <div css={styles.overlay} onClick={onClose}>
      <div css={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div css={styles.header}>
          <h2 css={styles.title}>Settings</h2>
          <button css={styles.closeBtn} onClick={onClose}>
            <svg css={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div css={styles.sections}>
          <section>
            <h3 css={styles.sectionTitle}>CDN URLs</h3>
            <p css={styles.description}>Manage CDN base URLs used by your images:</p>
            {loading ? (
              <p css={styles.description}>Loading...</p>
            ) : (
              <>
                <div css={styles.cdnList}>
                  {cdnUrls.map((url, index) => (
                    <div key={index} css={styles.cdnRow}>
                      <span css={styles.cdnIndex}>{index}</span>
                      <input
                        css={styles.cdnInput}
                        type="text"
                        value={url}
                        onChange={(e) => handleCdnChange(index, e.target.value)}
                        placeholder="https://cdn.example.com"
                      />
                      <button
                        css={styles.cdnDeleteBtn}
                        onClick={() => handleDeleteCdn(index)}
                        title="Delete CDN URL"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button css={styles.cdnAddBtn} onClick={handleAddCdn}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add CDN URL
                </button>
                {cdnUrls.length > 0 && (
                  <p css={styles.warning}>
                    Warning: Changing CDN URLs may break image references. The index numbers correspond to image `c` values.
                  </p>
                )}
              </>
            )}
          </section>

          <section>
            <h3 css={styles.sectionTitle}>Environment Variables</h3>
            <p css={styles.description}>Configure in <code>.env.studio</code> file:</p>
            <div css={styles.codeWrapper}>
              <button css={styles.copyBtn} onClick={handleCopy} title="Copy to clipboard">
                {copied && <span css={styles.tooltip}>Copied!</span>}
                <svg css={styles.copyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>
              <div css={styles.code}>
                <p css={styles.codeLine}>STUDIO_DEV_SITE_URL=http://localhost:3000</p>
                <p css={styles.codeLine}>&nbsp;</p>
                <p css={styles.codeLine}># Cloudflare R2 Storage</p>
                <p css={styles.codeLine}>CLOUDFLARE_R2_ACCOUNT_ID=your_account_id</p>
                <p css={styles.codeLine}>CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id</p>
                <p css={styles.codeLine}>CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key</p>
                <p css={styles.codeLine}>CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name</p>
                <p css={styles.codeLine}>CLOUDFLARE_R2_PUBLIC_URL=https://your-cdn.example.com</p>
                <p css={styles.codeLine}>&nbsp;</p>
                <p css={styles.codeLine}># Cloudflare Cache Purge</p>
                <p css={styles.codeLine}>CLOUDFLARE_ZONE_ID=your_zone_id</p>
                <p css={styles.codeLine}>CLOUDFLARE_API_TOKEN=your_api_token</p>
              </div>
            </div>
          </section>

          <section>
            <h3 css={styles.sectionTitle}>Thumbnail Sizes</h3>
            <div css={styles.grid}>
              <div>
                <label css={styles.label}>Small</label>
                <input css={styles.input} type="number" defaultValue={300} />
              </div>
              <div>
                <label css={styles.label}>Medium</label>
                <input css={styles.input} type="number" defaultValue={700} />
              </div>
              <div>
                <label css={styles.label}>Large</label>
                <input css={styles.input} type="number" defaultValue={1400} />
              </div>
            </div>
          </section>
        </div>

        <div css={styles.footer}>
          <button css={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button css={styles.saveBtn} onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
