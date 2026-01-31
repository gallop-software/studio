/** @jsxImportSource @emotion/react */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StudioUI } from '../src/components/StudioUI'

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

// Get workspace and site URL from the server-injected globals
declare global {
  interface Window {
    __STUDIO_WORKSPACE__?: string
    __STUDIO_SITE_URL__?: string
  }
}

const workspace = window.__STUDIO_WORKSPACE__ || 'Unknown'
const siteUrl = window.__STUDIO_SITE_URL__ || ''

createRoot(container).render(
  <StrictMode>
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#0a0a0a',
    }}>
      <StudioUI
        isVisible={true}
        standaloneMode={true}
        workspacePath={workspace}
        siteUrl={siteUrl}
      />
    </div>
  </StrictMode>
)
