'use client'

import { useStudio } from './StudioContext'

/**
 * Preview panel for selected image
 */
export function StudioPreview() {
  const { selectedItems, meta } = useStudio()

  // Only show preview for single selection
  if (selectedItems.size !== 1) {
    return null
  }

  const selectedPath = Array.from(selectedItems)[0]

  // Extract the image key from the path (e.g., "public/images/hero.jpg" -> "hero.jpg")
  const imageKey = selectedPath
    .replace(/^public\/images\//, '')
    .replace(/^public\/originals\//, '')

  const imageData = meta?.images?.[imageKey]

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-auto">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Preview</h3>

      {/* Image preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 mb-4">
        <img
          src={selectedPath.replace('public', '')}
          alt="Preview"
          className="w-full h-auto rounded"
        />
      </div>

      {/* File info */}
      <div className="space-y-3">
        <InfoRow label="Filename" value={selectedPath.split('/').pop() || ''} />

        {imageData && (
          <>
            <InfoRow
              label="Original"
              value={`${imageData.original.width}x${imageData.original.height}`}
            />
            <InfoRow
              label="File size"
              value={formatFileSize(imageData.original.fileSize)}
            />

            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Generated sizes
              </p>
              {Object.entries(imageData.sizes).map(([size, data]) => (
                <InfoRow
                  key={size}
                  label={size}
                  value={`${data.width}x${data.height}`}
                />
              ))}
            </div>

            {imageData.cdn?.synced && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">CDN</p>
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Synced to CDN
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${imageData.cdn?.baseUrl}${imageData.sizes.full.path}`
                    )
                  }}
                  className="mt-2 text-xs text-purple-600 hover:underline"
                >
                  Copy CDN URL
                </button>
              </div>
            )}

            {imageData.blurhash && (
              <div className="pt-2 border-t border-gray-200">
                <InfoRow label="Blurhash" value={imageData.blurhash} truncate />
                <div
                  className="mt-2 h-8 rounded"
                  style={{ backgroundColor: imageData.dominantColor }}
                  title={`Dominant color: ${imageData.dominantColor}`}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        <button className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Rename
        </button>
        <button className="w-full px-3 py-2 text-sm text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 transition-colors">
          Delete
        </button>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  truncate,
}: {
  label: string
  value: string
  truncate?: boolean
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span
        className={`text-gray-900 ${truncate ? 'truncate max-w-32' : ''}`}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
