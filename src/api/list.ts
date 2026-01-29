import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { FileItem } from '../types'

/**
 * API route handler for listing files and folders
 * 
 * Usage in consuming project:
 * ```ts
 * // src/app/api/studio/list/route.ts
 * export { GET } from '@gallop.software/studio/api/list'
 * ```
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const requestedPath = searchParams.get('path') || 'public'

  try {
    // Ensure path is within public folder
    const safePath = requestedPath.replace(/\.\./g, '')
    const absolutePath = path.join(process.cwd(), safePath)

    // Verify it's within the project
    if (!absolutePath.startsWith(process.cwd())) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const items: FileItem[] = []
    const entries = await fs.readdir(absolutePath, { withFileTypes: true })

    for (const entry of entries) {
      // Skip hidden files
      if (entry.name.startsWith('.')) continue

      const itemPath = path.join(safePath, entry.name)

      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'folder',
        })
      } else if (isImageFile(entry.name)) {
        const stats = await fs.stat(path.join(absolutePath, entry.name))
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'file',
          size: stats.size,
          // TODO: Read dimensions from meta or sharp
        })
      }
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to list directory:', error)
    return NextResponse.json(
      { error: 'Failed to list directory' },
      { status: 500 }
    )
  }
}

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)
}
