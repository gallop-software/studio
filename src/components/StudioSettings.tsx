/** @jsxImportSource @emotion/react */
'use client'

import { useState } from 'react'
import { css } from '@emotion/react'

const styles = {
  btn: css`
    padding: 8px;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s;
    
    &:hover {
      background-color: #f3f4f6;
    }
  `,
  icon: css`
    width: 20px;
    height: 20px;
    color: #6b7280;
  `,
  overlay: css`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  backdrop: css`
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.3);
  `,
  panel: css`
    position: relative;
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 100%;
    max-width: 512px;
    padding: 24px;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  `,
  title: css`
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  `,
  closeBtn: css`
    padding: 4px;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    
    &:hover {
      background-color: #f3f4f6;
    }
  `,
  sections: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  sectionTitle: css`
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    margin: 0 0 12px 0;
  `,
  description: css`
    font-size: 12px;
    color: #6b7280;
    margin: 0 0 12px 0;
  `,
  code: css`
    background-color: #f9fafb;
    border-radius: 8px;
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
    color: #4b5563;
  `,
  codeLine: css`
    margin: 0 0 4px 0;
    
    &:last-child {
      margin: 0;
    }
  `,
  input: css`
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    
    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px #a855f7;
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  `,
  label: css`
    font-size: 12px;
    color: #6b7280;
    display: block;
    margin-bottom: 4px;
  `,
  footer: css`
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  `,
  cancelBtn: css`
    padding: 8px 16px;
    font-size: 14px;
    color: #4b5563;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    
    &:hover {
      background-color: #f3f4f6;
    }
  `,
  saveBtn: css`
    padding: 8px 16px;
    font-size: 14px;
    color: white;
    background-color: #9333ea;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    
    &:hover {
      background-color: #7c3aed;
    }
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

function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div css={styles.overlay}>
      <div css={styles.backdrop} onClick={onClose} />

      <div css={styles.panel}>
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
            <h3 css={styles.sectionTitle}>Cloudflare R2</h3>
            <p css={styles.description}>Configure in .env.local file:</p>
            <div css={styles.code}>
              <p css={styles.codeLine}>CLOUDFLARE_R2_ACCOUNT_ID</p>
              <p css={styles.codeLine}>CLOUDFLARE_R2_ACCESS_KEY_ID</p>
              <p css={styles.codeLine}>CLOUDFLARE_R2_SECRET_ACCESS_KEY</p>
              <p css={styles.codeLine}>CLOUDFLARE_R2_BUCKET_NAME</p>
              <p css={styles.codeLine}>CLOUDFLARE_R2_PUBLIC_URL</p>
            </div>
          </section>

          <section>
            <h3 css={styles.sectionTitle}>Custom CDN URL</h3>
            <p css={styles.description}>Override the default R2 URL with a custom domain:</p>
            <input css={styles.input} type="text" placeholder="https://cdn.yourdomain.com" />
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
          <button css={styles.saveBtn}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}
