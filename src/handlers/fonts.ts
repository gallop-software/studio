import { promises as fs } from 'fs'
import path from 'path'
import { getWorkspacePath } from '../config'
import { jsonResponse } from './utils/response'
import type { FileItem } from '../types'

/**
 * List files and folders for fonts paths
 * Works like the regular list handler but only for _fonts/
 */
export async function handleFontsList(request: Request): Promise<Response> {
  const searchParams = new URL(request.url).searchParams
  const requestedPath = searchParams.get('path') || '_fonts'

  try {
    const items: FileItem[] = []

    // Only allow paths within _fonts/
    const isAllowed = requestedPath === '_fonts' || requestedPath.startsWith('_fonts/')

    if (!isAllowed) {
      return jsonResponse({ items: [], error: 'Path not allowed' }, { status: 400 })
    }

    const fsPath = getWorkspacePath(requestedPath)

    // Check if directory exists
    try {
      const stat = await fs.stat(fsPath)
      if (!stat.isDirectory()) {
        return jsonResponse({ items: [] })
      }
    } catch {
      // Directory doesn't exist
      return jsonResponse({ items: [], canCreate: true })
    }

    // Read directory contents
    const entries = await fs.readdir(fsPath, { withFileTypes: true })

    for (const entry of entries) {
      const itemPath = `${requestedPath}/${entry.name}`

      if (entry.isDirectory()) {
        // Count files in folder
        let fileCount = 0
        try {
          const subEntries = await fs.readdir(path.join(fsPath, entry.name))
          fileCount = subEntries.filter(f => 
            f.match(/\.(ttf|woff2?|otf|ts|tsx|js)$/i)
          ).length
        } catch {
          // Ignore errors counting
        }

        items.push({
          name: entry.name,
          path: itemPath,
          type: 'folder',
          fileCount,
        })
      } else {
        // Only show font files and ts/js files
        const ext = path.extname(entry.name).toLowerCase()
        const allowedExts = ['.ttf', '.woff', '.woff2', '.otf', '.ts', '.tsx', '.js']

        if (allowedExts.includes(ext)) {
          // Get file size
          let size = 0
          try {
            const fileStat = await fs.stat(path.join(fsPath, entry.name))
            size = fileStat.size
          } catch {
            // Ignore
          }

          items.push({
            name: entry.name,
            path: itemPath,
            type: 'file',
            size,
          })
        }
      }
    }

    // Sort: folders first, then alphabetically
    items.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      return a.name.localeCompare(b.name)
    })

    return jsonResponse({ items })
  } catch (error) {
    console.error('Error listing fonts:', error)
    return jsonResponse({ error: 'Failed to list fonts' }, { status: 500 })
  }
}

/**
 * Upload TTF font files
 */
export async function handleFontsUpload(request: Request): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const targetPath = formData.get('path') as string || '_fonts'

    if (!file) {
      return jsonResponse({ error: 'No file provided' }, { status: 400 })
    }

    // Only accept TTF files
    if (!file.name.toLowerCase().endsWith('.ttf')) {
      return jsonResponse({ error: 'Only TTF files are supported' }, { status: 400 })
    }

    // Validate path
    if (!targetPath.startsWith('_fonts')) {
      return jsonResponse({ error: 'Can only upload to _fonts/' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure directory exists
    const uploadDir = getWorkspacePath(targetPath)
    await fs.mkdir(uploadDir, { recursive: true })

    // Save file
    const filePath = path.join(uploadDir, file.name.toLowerCase())
    await fs.writeFile(filePath, buffer)

    return jsonResponse({
      success: true,
      path: `${targetPath}/${file.name.toLowerCase()}`,
    })
  } catch (error) {
    console.error('Error uploading font:', error)
    return jsonResponse({ error: 'Failed to upload font' }, { status: 500 })
  }
}

/**
 * Create a folder in _fonts
 */
export async function handleFontsCreateFolder(request: Request): Promise<Response> {
  try {
    const { path: targetPath, name } = await request.json()

    if (!targetPath || !name) {
      return jsonResponse({ error: 'Path and name are required' }, { status: 400 })
    }

    // Only allow paths within _fonts/
    const isAllowed = targetPath === '_fonts' || targetPath.startsWith('_fonts/')

    if (!isAllowed) {
      return jsonResponse({ error: 'Path not allowed' }, { status: 400 })
    }

    const folderPath = getWorkspacePath(targetPath, name.toLowerCase())
    await fs.mkdir(folderPath, { recursive: true })

    return jsonResponse({
      success: true,
      path: `${targetPath}/${name.toLowerCase()}`,
    })
  } catch (error) {
    console.error('Error creating folder:', error)
    return jsonResponse({ error: 'Failed to create folder' }, { status: 500 })
  }
}

/**
 * Delete files or folders from _fonts
 */
export async function handleFontsDelete(request: Request): Promise<Response> {
  try {
    const { paths } = await request.json()

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return jsonResponse({ error: 'Paths are required' }, { status: 400 })
    }

    // Validate all paths - only allow within _fonts/
    for (const p of paths) {
      if (!p.startsWith('_fonts/')) {
        return jsonResponse({ error: `Path not allowed: ${p}` }, { status: 400 })
      }
    }

    const deleted: string[] = []
    const errors: string[] = []

    for (const p of paths) {
      try {
        const fullPath = getWorkspacePath(p)
        const stat = await fs.stat(fullPath)

        if (stat.isDirectory()) {
          await fs.rm(fullPath, { recursive: true })
        } else {
          await fs.unlink(fullPath)
        }
        deleted.push(p)
      } catch (err) {
        errors.push(`Failed to delete ${p}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return jsonResponse({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error deleting:', error)
    return jsonResponse({ error: 'Failed to delete' }, { status: 500 })
  }
}
