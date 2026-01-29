import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { StudioMeta } from '../types'

/**
 * API route handler for scanning and validating meta
 * Detects untracked files and missing files
 * 
 * Usage in consuming project:
 * ```ts
 * // src/app/api/studio/scan/route.ts
 * export { GET } from '@gallop.software/studio/api/scan'
 * ```
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
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

    const untrackedFiles: string[] = []
    const missingFiles: string[] = []
    const validFiles: string[] = []

    // Scan public/images for untracked files
    const imagesDir = path.join(process.cwd(), 'public', 'images')
    const trackedPaths = new Set<string>()

    // Build set of all tracked paths
    for (const entry of Object.values(meta.images)) {
      for (const sizeData of Object.values(entry.sizes)) {
        trackedPaths.add(sizeData.path)
      }
    }

    // Recursively scan images directory
    async function scanDir(dir: string, relativePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue

          const fullPath = path.join(dir, entry.name)
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isDirectory()) {
            await scanDir(fullPath, relPath)
          } else if (isImageFile(entry.name)) {
            const publicPath = `/images/${relPath}`
            if (!trackedPaths.has(publicPath)) {
              untrackedFiles.push(publicPath)
            } else {
              validFiles.push(publicPath)
            }
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    await scanDir(imagesDir)

    // Check for missing files in meta
    for (const [key, entry] of Object.entries(meta.images)) {
      for (const [size, sizeData] of Object.entries(entry.sizes)) {
        const filePath = path.join(process.cwd(), 'public', sizeData.path)
        try {
          await fs.access(filePath)
        } catch {
          // File doesn't exist locally - might be on CDN
          if (!entry.cdn?.synced) {
            missingFiles.push(`${key} (${size}): ${sizeData.path}`)
          }
        }
      }
    }

    return NextResponse.json({
      totalInMeta: Object.keys(meta.images).length,
      validFiles: validFiles.length,
      untrackedFiles,
      missingFiles,
    })
  } catch (error) {
    console.error('Failed to scan:', error)
    return NextResponse.json(
      { error: 'Failed to scan' },
      { status: 500 }
    )
  }
}

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
}
