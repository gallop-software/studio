import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { StudioMeta } from '../types'

/**
 * API route handler for deleting files
 * Removes from filesystem and meta
 * 
 * Usage in consuming project:
 * ```ts
 * // src/app/api/studio/delete/route.ts
 * export { POST } from '@gallop.software/studio/api/delete'
 * ```
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const { paths } = await request.json() as { paths: string[] }

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'No paths provided' }, { status: 400 })
    }

    // Load meta
    const metaPath = path.join(process.cwd(), '_data', '_meta.json')
    let meta: StudioMeta
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8')
      meta = JSON.parse(metaContent)
    } catch {
      meta = {
        $schema: 'https://gallop.software/schemas/studio-meta.json',
        version: 1,
        generatedAt: new Date().toISOString(),
        images: {},
      }
    }

    const deleted: string[] = []
    const errors: string[] = []

    for (const itemPath of paths) {
      try {
        // Validate path is within public
        if (!itemPath.startsWith('public/')) {
          errors.push(`Invalid path: ${itemPath}`)
          continue
        }

        const absolutePath = path.join(process.cwd(), itemPath)

        // Check if it's a directory
        const stats = await fs.stat(absolutePath)

        if (stats.isDirectory()) {
          // Delete directory recursively
          await fs.rm(absolutePath, { recursive: true })
          
          // Remove all entries in meta that start with this path
          const prefix = itemPath
            .replace(/^public\/originals\/?/, '')
            .replace(/^public\/images\/?/, '')
          
          for (const key of Object.keys(meta.images)) {
            if (key.startsWith(prefix)) {
              delete meta.images[key]
            }
          }
        } else {
          // Delete file
          await fs.unlink(absolutePath)

          // Find and remove from meta
          const imageKey = itemPath
            .replace(/^public\/originals\//, '')
            .replace(/^public\/images\//, '')

          // If deleting an original, also delete all generated sizes
          if (itemPath.includes('/originals/')) {
            const entry = meta.images[imageKey]
            if (entry) {
              // Delete all size files
              for (const sizeData of Object.values(entry.sizes)) {
                const sizePath = path.join(process.cwd(), 'public', sizeData.path)
                try {
                  await fs.unlink(sizePath)
                } catch {
                  // File might not exist
                }
              }
              delete meta.images[imageKey]
            }
          }
        }

        deleted.push(itemPath)
      } catch (error) {
        console.error(`Failed to delete ${itemPath}:`, error)
        errors.push(itemPath)
      }
    }

    // Save updated meta
    meta.generatedAt = new Date().toISOString()
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))

    return NextResponse.json({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to delete:', error)
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 }
    )
  }
}
