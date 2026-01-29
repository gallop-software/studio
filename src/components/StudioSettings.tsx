'use client'

import { useState } from 'react'

/**
 * Settings button and panel
 */
export function StudioSettings() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-gray-500"
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Cloudflare R2 */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Cloudflare R2
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Configure in .env.local file:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 space-y-1">
              <div>CLOUDFLARE_R2_ACCOUNT_ID</div>
              <div>CLOUDFLARE_R2_ACCESS_KEY_ID</div>
              <div>CLOUDFLARE_R2_SECRET_ACCESS_KEY</div>
              <div>CLOUDFLARE_R2_BUCKET_NAME</div>
              <div>CLOUDFLARE_R2_PUBLIC_URL</div>
            </div>
          </section>

          {/* Custom CDN URL */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Custom CDN URL
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Override the default R2 URL with a custom domain:
            </p>
            <input
              type="text"
              placeholder="https://cdn.yourdomain.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </section>

          {/* Thumbnail sizes */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Thumbnail Sizes
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500">Small</label>
                <input
                  type="number"
                  defaultValue={300}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Medium</label>
                <input
                  type="number"
                  defaultValue={700}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Large</label>
                <input
                  type="number"
                  defaultValue={1400}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
