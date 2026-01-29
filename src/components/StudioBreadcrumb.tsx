'use client'

import { useStudio } from './StudioContext'

/**
 * Breadcrumb navigation bar
 */
export function StudioBreadcrumb() {
  const { currentPath, setCurrentPath, navigateUp } = useStudio()

  const parts = currentPath.split('/').filter(Boolean)

  const handleClick = (index: number) => {
    const newPath = parts.slice(0, index + 1).join('/')
    setCurrentPath(newPath)
  }

  return (
    <div className="flex items-center gap-2 px-6 py-2 bg-white border-b border-gray-100">
      {/* Back button */}
      {currentPath !== 'public' && (
        <button
          onClick={navigateUp}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Go back"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Breadcrumb trail */}
      <nav className="flex items-center gap-1 text-sm">
        {parts.map((part, index) => (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <span className="text-gray-300">/</span>}
            <button
              onClick={() => handleClick(index)}
              className={`px-1 py-0.5 rounded hover:bg-gray-100 transition-colors ${
                index === parts.length - 1
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {part}
            </button>
          </span>
        ))}
      </nav>
    </div>
  )
}
