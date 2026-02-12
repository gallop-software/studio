import { promises as fs } from 'fs'
import path from 'path'
import { getWorkspacePath } from '../config'
import { jsonResponse } from './utils/response'
import { slugifyFolderName } from './utils/files'
import { isFileNotFound } from './utils/errors'
import { isOperationCancelled, clearCancelledOperation } from './utils/cancellation'
import type { FileItem } from '../types'

// Weight name to number mapping (including common aliases)
export const weightMap: Record<string, string> = {
  thin: '100',
  hairline: '100',
  extralight: '200',
  ultralight: '200',
  light: '300',
  regular: '400',
  book: '400',
  medium: '500',
  semibold: '600',
  demibold: '600',
  bold: '700',
  extrabold: '800',
  ultrabold: '800',
  black: '900',
  heavy: '900',
}

/**
 * Parse font weight and style from filename
 */
export function parseFontMetadata(filename: string): { weight: string; style: string; isVariable: boolean } {
  const name = filename.toLowerCase()

  let weight = '400'
  let style = 'normal'
  const isVariable = name.includes('variable')

  if (isVariable) {
    weight = '100 900'
  } else {
    // Check for numeric weight in filename (e.g. font-500.woff2, font-w500.woff2)
    const numericMatch = name.match(/[-_]w?(\d{3})(?:[-_.]|$)/)
    if (numericMatch) {
      const num = parseInt(numericMatch[1])
      if (num >= 100 && num <= 900 && num % 100 === 0) {
        weight = String(num)
      }
    } else {
      // Order matters - check longer strings first
      if (name.includes('ultralight')) weight = weightMap.ultralight
      else if (name.includes('extralight')) weight = weightMap.extralight
      else if (name.includes('ultrabold')) weight = weightMap.ultrabold
      else if (name.includes('extrabold')) weight = weightMap.extrabold
      else if (name.includes('demibold')) weight = weightMap.demibold
      else if (name.includes('semibold')) weight = weightMap.semibold
      else if (name.includes('hairline')) weight = weightMap.hairline
      else if (name.includes('thin')) weight = weightMap.thin
      else if (name.includes('light')) weight = weightMap.light
      else if (name.includes('heavy')) weight = weightMap.heavy
      else if (name.includes('black')) weight = weightMap.black
      else if (name.includes('bold')) weight = weightMap.bold
      else if (name.includes('medium')) weight = weightMap.medium
      else if (name.includes('book')) weight = weightMap.book
      else if (name.includes('regular')) weight = weightMap.regular
    }
  }

  if (name.includes('italic')) style = 'italic'

  return { weight, style, isVariable }
}

/**
 * Get human-readable weight name
 */
export function getWeightName(weight: string): string {
  if (weight === '100 900') return 'Variable'
  const names: Record<string, string> = {
    '100': 'Thin',
    '200': 'ExtraLight',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
    '900': 'Black',
  }
  return names[weight] || weight
}

// ---- Internal helpers ----

/** Get all files in a directory recursively */
async function getFilesInDir(dirPath: string, basePath: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const relativePath = path.join(basePath, entry.name)
      if (entry.isDirectory()) {
        files.push(...await getFilesInDir(fullPath, relativePath))
      } else {
        files.push(relativePath)
      }
    }
  } catch (err) {
    if (!isFileNotFound(err)) console.error(`Error reading directory ${dirPath}:`, err)
  }
  return files
}

/** Expand font paths (which may include folders) into individual file paths */
async function expandFontPaths(paths: string[]): Promise<{ files: Array<{ path: string; parentFolder?: string }>; folders: string[] }> {
  const files: Array<{ path: string; parentFolder?: string }> = []
  const folders: string[] = []

  for (const p of paths) {
    const fullPath = getWorkspacePath(p)
    try {
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        folders.push(p)
        const filesInDir = await getFilesInDir(fullPath, p)
        for (const f of filesInDir) {
          files.push({ path: f, parentFolder: p })
        }
      } else {
        files.push({ path: p })
      }
    } catch (err) {
      if (!isFileNotFound(err)) console.error(`Error accessing ${p}:`, err)
    }
  }

  return { files, folders }
}

/** Rename files inside a folder to match new folder name convention */
async function renameFolderContents(
  folderFullPath: string,
  oldFolderName: string,
  newFolderName: string,
  onProgress?: (entry: string, newFileName: string, current: number, total: number) => void
): Promise<number> {
  const entries = await fs.readdir(folderFullPath)
  const filesToRename = entries.filter(entry => {
    const entryLower = entry.toLowerCase()
    return entryLower.startsWith(oldFolderName + '-') || entryLower.startsWith(oldFolderName + '_')
  })

  let renamed = 0
  for (const entry of filesToRename) {
    const suffix = entry.substring(oldFolderName.length)
    const newFileName = newFolderName + suffix.toLowerCase()

    onProgress?.(entry, newFileName, renamed + 1, filesToRename.length)

    const oldFilePath = path.join(folderFullPath, entry)
    const newFilePath = path.join(folderFullPath, newFileName)

    await fs.rename(oldFilePath, newFilePath)
    renamed++
  }

  return renamed
}

/** Validate rename inputs, resolve paths, check existence. Returns null on error (response already sent). */
async function validateRename(oldPath: string, newName: string): Promise<{
  oldFullPath: string
  newFullPath: string
  newPath: string
  oldFolderName: string
  newFolderName: string
  isDirectory: boolean
} | null> {
  const oldFullPath = getWorkspacePath(oldPath)
  const parentDir = path.dirname(oldPath)
  const oldFolderName = path.basename(oldPath).toLowerCase()
  const newFolderName = newName.toLowerCase()
  const newPath = `${parentDir}/${newFolderName}`
  const newFullPath = getWorkspacePath(newPath)

  let isDirectory = false
  try {
    const stat = await fs.stat(oldFullPath)
    isDirectory = stat.isDirectory()
  } catch {
    return null // caller handles 404
  }

  try {
    await fs.stat(newFullPath)
    return null // already exists, caller handles 400
  } catch {
    // Good, it doesn't exist
  }

  return { oldFullPath, newFullPath, newPath, oldFolderName, newFolderName, isDirectory }
}

// ---- Handlers ----

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
        } catch (err) {
          if (!isFileNotFound(err)) console.error(`Error counting files in ${entry.name}:`, err)
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
          } catch (err) {
            if (!isFileNotFound(err)) console.error(`Error reading stat for ${entry.name}:`, err)
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
 * Automatically creates a folder based on the filename prefix (before the first "-")
 */
export async function handleFontsUpload(request: Request): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const basePath = formData.get('path') as string || '_fonts'

    if (!file) {
      return jsonResponse({ error: 'No file provided' }, { status: 400 })
    }

    // Only accept TTF and OTF files
    const ext = file.name.toLowerCase()
    if (!ext.endsWith('.ttf') && !ext.endsWith('.otf')) {
      return jsonResponse({ error: 'Only TTF and OTF files are supported' }, { status: 400 })
    }

    // Validate path
    if (!basePath.startsWith('_fonts')) {
      return jsonResponse({ error: 'Can only upload to _fonts/' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract folder name from filename (part before the first "-")
    const fileName = file.name.toLowerCase()
    const dashIndex = fileName.indexOf('-')
    let rawFolderName: string

    if (dashIndex > 0) {
      rawFolderName = fileName.substring(0, dashIndex)
    } else {
      // No dash found, use filename without extension as folder name
      rawFolderName = fileName.replace(/\.(ttf|otf)$/, '')
    }
    const folderName = slugifyFolderName(rawFolderName)

    // Determine target folder - if we're at _fonts root, create subfolder
    // If we're already in a subfolder, use that
    let targetPath: string
    if (basePath === '_fonts') {
      targetPath = `_fonts/${folderName}`
    } else {
      targetPath = basePath
    }

    // Ensure directory exists
    const uploadDir = getWorkspacePath(targetPath)
    await fs.mkdir(uploadDir, { recursive: true })

    // Save file
    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, buffer)

    return jsonResponse({
      success: true,
      path: `${targetPath}/${fileName}`,
      folder: targetPath,
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

    const safeName = slugifyFolderName(name)
    const folderPath = getWorkspacePath(targetPath, safeName)
    await fs.mkdir(folderPath, { recursive: true })

    return jsonResponse({
      success: true,
      path: `${targetPath}/${safeName}`,
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

    for (const p of paths) {
      if (!p.startsWith('_fonts/')) {
        return jsonResponse({ error: `Path not allowed: ${p}` }, { status: 400 })
      }
    }

    const { files, folders } = await expandFontPaths(paths)
    const deleted: string[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        await fs.unlink(getWorkspacePath(file.path))
        deleted.push(file.path)
      } catch (err) {
        errors.push(`Failed to delete ${file.path}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    for (const folder of folders) {
      try {
        await fs.rm(getWorkspacePath(folder), { recursive: true })
      } catch (err) {
        if (!isFileNotFound(err)) console.error(`Error removing folder ${folder}:`, err)
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

/**
 * Delete files or folders from _fonts with streaming progress
 */
export async function handleFontsDeleteStream(request: Request): Promise<Response> {
  try {
    const { paths, operationId } = await request.json()

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return jsonResponse({ error: 'Paths are required' }, { status: 400 })
    }

    for (const p of paths) {
      if (!p.startsWith('_fonts/')) {
        return jsonResponse({ error: `Path not allowed: ${p}` }, { status: 400 })
      }
    }

    const isCancelled = () => operationId ? isOperationCancelled(operationId) : false

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        const { files: allFiles, folders } = await expandFontPaths(paths)
        const total = allFiles.length
        const deleted: string[] = []
        const errors: string[] = []

        send({ type: 'start', total })

        for (let i = 0; i < allFiles.length; i++) {
          if (isCancelled()) {
            if (operationId) clearCancelledOperation(operationId)
            send({
              type: 'complete',
              deleted: deleted.length,
              errors: errors.length,
              message: `Stopped. Deleted ${deleted.length} file${deleted.length !== 1 ? 's' : ''}.`,
              cancelled: true,
            })
            controller.close()
            return
          }

          const file = allFiles[i]
          const fileName = file.path.split('/').pop() || file.path

          send({ type: 'progress', message: `Deleting ${fileName}...`, current: i + 1, total, currentFile: fileName })

          try {
            await fs.unlink(getWorkspacePath(file.path))
            deleted.push(file.path)
          } catch (err) {
            errors.push(`Failed to delete ${file.path}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
        }

        for (const folder of folders) {
          try {
            await fs.rm(getWorkspacePath(folder), { recursive: true })
          } catch (err) {
            if (!isFileNotFound(err)) console.error(`Error removing folder ${folder}:`, err)
          }
        }

        if (operationId) clearCancelledOperation(operationId)
        send({
          type: 'complete',
          deleted: deleted.length,
          errors: errors.length,
          message: `Deleted ${deleted.length} file${deleted.length !== 1 ? 's' : ''}`,
        })

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error deleting:', error)
    return jsonResponse({ error: 'Failed to delete' }, { status: 500 })
  }
}

/**
 * Rename a folder in _fonts
 * Also renames all files inside to match the new folder name convention
 */
export async function handleFontsRename(request: Request): Promise<Response> {
  try {
    const { oldPath, newName } = await request.json()

    if (!oldPath || !newName) {
      return jsonResponse({ error: 'oldPath and newName are required' }, { status: 400 })
    }
    if (!oldPath.startsWith('_fonts/')) {
      return jsonResponse({ error: 'Can only rename items in _fonts/' }, { status: 400 })
    }
    if (newName.includes('/') || newName.includes('\\')) {
      return jsonResponse({ error: 'Invalid folder name' }, { status: 400 })
    }

    const result = await validateRename(oldPath, newName)
    if (!result) {
      // Check which error: path not found or already exists
      try {
        await fs.stat(getWorkspacePath(oldPath))
        return jsonResponse({ error: 'A folder with that name already exists' }, { status: 400 })
      } catch {
        return jsonResponse({ error: 'Path not found' }, { status: 404 })
      }
    }

    const { oldFullPath, newFullPath, newPath, oldFolderName, newFolderName, isDirectory } = result

    await fs.rename(oldFullPath, newFullPath)

    if (isDirectory) {
      try {
        await renameFolderContents(newFullPath, oldFolderName, newFolderName)
      } catch (err) {
        console.error('Error renaming files inside folder:', err)
      }
    }

    return jsonResponse({ success: true, oldPath, newPath })
  } catch (error) {
    console.error('Error renaming:', error)
    return jsonResponse({ error: 'Failed to rename' }, { status: 500 })
  }
}

/**
 * Rename a folder in _fonts with streaming progress
 * Also renames all files inside to match the new folder name convention
 */
export async function handleFontsRenameStream(request: Request): Promise<Response> {
  try {
    const { oldPath, newName } = await request.json()

    if (!oldPath || !newName) {
      return jsonResponse({ error: 'oldPath and newName are required' }, { status: 400 })
    }
    if (!oldPath.startsWith('_fonts/')) {
      return jsonResponse({ error: 'Can only rename items in _fonts/' }, { status: 400 })
    }
    if (newName.includes('/') || newName.includes('\\')) {
      return jsonResponse({ error: 'Invalid folder name' }, { status: 400 })
    }

    const result = await validateRename(oldPath, newName)
    if (!result) {
      try {
        await fs.stat(getWorkspacePath(oldPath))
        return jsonResponse({ error: 'A folder with that name already exists' }, { status: 400 })
      } catch {
        return jsonResponse({ error: 'Path not found' }, { status: 404 })
      }
    }

    const { oldFullPath, newFullPath, newPath, oldFolderName, newFolderName, isDirectory } = result

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          send({ type: 'progress', message: `Renaming folder to ${newFolderName}...`, current: 0, total: 1 })
          await fs.rename(oldFullPath, newFullPath)

          if (isDirectory) {
            await renameFolderContents(newFullPath, oldFolderName, newFolderName, (entry, newFileName, current, total) => {
              send({ type: 'progress', message: `Renaming ${entry} → ${newFileName}...`, current, total })
            })
          }

          send({ type: 'complete', message: `Renamed to ${newFolderName}`, renamed: 1, oldPath, newPath })
        } catch (err) {
          send({ type: 'error', message: String(err) })
        }

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error renaming:', error)
    return jsonResponse({ error: 'Failed to rename' }, { status: 500 })
  }
}

/**
 * Scan a font folder to detect TTF/woff2 files and parse metadata
 */
export async function handleFontsScan(request: Request): Promise<Response> {
  try {
    const { folder } = await request.json()
    
    if (!folder || !folder.startsWith('_fonts/')) {
      return jsonResponse({ error: 'Invalid folder path' }, { status: 400 })
    }
    
    const folderPath = getWorkspacePath(folder)
    const folderName = path.basename(folder)
    
    // Check folder exists
    try {
      const stat = await fs.stat(folderPath)
      if (!stat.isDirectory()) {
        return jsonResponse({ error: 'Path is not a folder' }, { status: 400 })
      }
    } catch {
      return jsonResponse({ error: 'Folder not found' }, { status: 404 })
    }
    
    const entries = await fs.readdir(folderPath)
    
    const ttfFiles: string[] = []
    const woff2Files: string[] = []
    const detectedFonts: Array<{ file: string; weight: string; weightName: string; style: string }> = []
    
    const otfFiles: string[] = []

    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase()
      if (ext === '.ttf') {
        ttfFiles.push(entry)
      } else if (ext === '.otf') {
        otfFiles.push(entry)
      } else if (ext === '.woff2') {
        woff2Files.push(entry)
        const baseName = path.basename(entry, '.woff2')
        const { weight, style } = parseFontMetadata(baseName)
        detectedFonts.push({
          file: entry,
          weight,
          weightName: getWeightName(weight),
          style,
        })
      }
    }

    // Check if woff2 generation is needed (from TTF or OTF sources)
    const needsGeneration = (ttfFiles.length > 0 || otfFiles.length > 0) && woff2Files.length === 0
    
    // Check which src/fonts/*.ts files reference this folder
    const srcFontsPath = getWorkspacePath('src/fonts')
    const assignments: string[] = []
    
    try {
      const srcEntries = await fs.readdir(srcFontsPath)
      for (const entry of srcEntries) {
        if (entry.endsWith('.ts')) {
          const filePath = path.join(srcFontsPath, entry)
          const content = await fs.readFile(filePath, 'utf8')
          // Check if this file references the folder
          if (content.includes(`/_fonts/${folderName}/`)) {
            assignments.push(path.basename(entry, '.ts'))
          }
        }
      }
    } catch (err) {
      if (!isFileNotFound(err)) console.error('Error scanning src/fonts:', err)
    }

    return jsonResponse({
      folder,
      folderName,
      ttfFiles,
      otfFiles,
      woff2Files,
      detectedFonts,
      needsGeneration,
      assignments,
    })
  } catch (error) {
    console.error('Error scanning fonts:', error)
    return jsonResponse({ error: 'Failed to scan fonts' }, { status: 500 })
  }
}

/**
 * List all font assignments in src/fonts/
 */
export async function handleFontsListAssignments(): Promise<Response> {
  try {
    const srcFontsPath = getWorkspacePath('src/fonts')
    const assignments: Array<{ name: string; folder: string }> = []
    
    try {
      const entries = await fs.readdir(srcFontsPath)
      
      for (const entry of entries) {
        if (entry.endsWith('.ts')) {
          const name = path.basename(entry, '.ts')
          const filePath = path.join(srcFontsPath, entry)
          const content = await fs.readFile(filePath, 'utf8')
          
          // Extract folder name from path like '../../_fonts/inter/'
          const match = content.match(/\/_fonts\/([^/]+)\//)
          const folder = match ? match[1] : 'unknown'
          
          assignments.push({ name, folder })
        }
      }
    } catch (err) {
      if (!isFileNotFound(err)) console.error('Error listing font assignments:', err)
    }

    return jsonResponse({ assignments })
  } catch (error) {
    console.error('Error listing assignments:', error)
    return jsonResponse({ error: 'Failed to list assignments' }, { status: 500 })
  }
}

/**
 * Delete a font assignment file
 */
export async function handleFontsDeleteAssignment(request: Request): Promise<Response> {
  try {
    const { name } = await request.json()
    
    if (!name || typeof name !== 'string') {
      return jsonResponse({ error: 'Assignment name is required' }, { status: 400 })
    }
    
    // Validate name (no path traversal)
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      return jsonResponse({ error: 'Invalid assignment name' }, { status: 400 })
    }
    
    const filePath = getWorkspacePath('src/fonts', `${name}.ts`)
    
    try {
      await fs.unlink(filePath)
      return jsonResponse({ success: true })
    } catch {
      return jsonResponse({ error: 'Assignment not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return jsonResponse({ error: 'Failed to delete assignment' }, { status: 500 })
  }
}

/**
 * Assign web fonts - generates woff2 if needed and writes src/fonts/*.ts files
 * This is a streaming endpoint for progress updates
 * 
 * Supports two modes:
 * - folder: path to a folder in _fonts/ (scans for woff2/ttf, generates if needed)
 * - files: array of woff2 file paths (uses these directly, no generation)
 */
export async function handleFontsAssign(request: Request): Promise<Response> {
  try {
    const { folder, files, assignments, operationId } = await request.json()

    // Validate: need either folder or files
    const isFileMode = files && Array.isArray(files) && files.length > 0
    const isFolderMode = folder && folder.startsWith('_fonts/')
    
    if (!isFileMode && !isFolderMode) {
      return jsonResponse({ error: 'Either folder or files must be provided' }, { status: 400 })
    }
    
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return jsonResponse({ error: 'At least one assignment is required' }, { status: 400 })
    }
    
    // Validate assignment names
    for (const name of assignments) {
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
        return jsonResponse({ error: `Invalid assignment name: ${name}` }, { status: 400 })
      }
    }
    
    // Validate file paths if in file mode
    if (isFileMode) {
      for (const filePath of files) {
        if (!filePath.startsWith('_fonts/') || !filePath.toLowerCase().endsWith('.woff2')) {
          return jsonResponse({ error: `Invalid file path: ${filePath}. Must be a woff2 file in _fonts/` }, { status: 400 })
        }
      }
    }
    
    // Set up SSE streaming
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }
        
        const isCancelled = () => operationId ? isOperationCancelled(operationId) : false

        try {
          let fontMap: Array<{ path: string; weight: string; style: string }>

          if (isFileMode) {
            // File mode: use provided woff2 files directly
            send({ type: 'progress', message: `Processing ${files.length} selected file${files.length > 1 ? 's' : ''}...`, current: 0, total: files.length })

            fontMap = files.map((filePath: string) => {
              const relativePath = filePath.replace(/^_fonts\//, '')
              const baseName = path.basename(filePath, '.woff2')
              const { weight, style } = parseFontMetadata(baseName)
              return { path: relativePath, weight, style }
            })
          } else {
            // Folder mode: scan folder and generate woff2 if needed
            const folderPath = getWorkspacePath(folder)
            const folderName = path.basename(folder)

            const entries = await fs.readdir(folderPath)
            const sourceFiles = entries.filter(f => {
              const lower = f.toLowerCase()
              return lower.endsWith('.ttf') || lower.endsWith('.otf')
            })
            let woff2Files = entries.filter(f => f.toLowerCase().endsWith('.woff2'))

            if (sourceFiles.length === 0 && woff2Files.length === 0) {
              send({ type: 'error', message: 'No font files found in folder' })
              controller.close()
              return
            }

            // Generate woff2 if needed
            if (woff2Files.length === 0 && sourceFiles.length > 0) {
              send({ type: 'progress', message: 'Generating woff2 files...', current: 0, total: sourceFiles.length })

              const ttf2woff2Module = await import('ttf2woff2')
              const ttf2woff2 = ttf2woff2Module.default

              for (let i = 0; i < sourceFiles.length; i++) {
                if (isCancelled()) {
                  if (operationId) clearCancelledOperation(operationId)
                  send({ type: 'complete', processed: 0, message: 'Stopped.', cancelled: true })
                  controller.close()
                  return
                }

                const sourceFile = sourceFiles[i]
                const sourceExt = path.extname(sourceFile)
                const baseName = path.basename(sourceFile, sourceExt)
                const woff2Name = baseName + '.woff2'

                send({ type: 'progress', message: `Compressing ${sourceFile}...`, current: i + 1, total: sourceFiles.length, currentFile: sourceFile })

                try {
                  const sourcePath = path.join(folderPath, sourceFile)
                  const input = await fs.readFile(sourcePath)
                  const woff2Data = ttf2woff2(input)
                  await fs.writeFile(path.join(folderPath, woff2Name), woff2Data)
                  woff2Files.push(woff2Name)
                } catch (err) {
                  send({ type: 'progress', message: `Failed to compress ${sourceFile}`, error: String(err) })
                }
              }
            }

            if (woff2Files.length === 0) {
              send({ type: 'error', message: 'No woff2 files available' })
              controller.close()
              return
            }

            fontMap = woff2Files.map(file => {
              const baseName = path.basename(file, '.woff2')
              const { weight, style } = parseFontMetadata(baseName)
              return { path: `${folderName}/${file}`, weight, style }
            })
          }

          // Sort fontMap by weight (ascending), then style (normal before italic)
          fontMap.sort((a, b) => {
            const wa = parseInt(a.weight) || 400
            const wb = parseInt(b.weight) || 400
            if (wa !== wb) return wa - wb
            return a.style === 'normal' ? -1 : 1
          })

          // Write assignment files
          const srcFontsPath = getWorkspacePath('src/fonts')
          await fs.mkdir(srcFontsPath, { recursive: true })

          const created: string[] = []
          const errors: string[] = []

          for (let i = 0; i < assignments.length; i++) {
            const assignmentName = assignments[i]
            const fileName = `${assignmentName}.ts`
            const filePath = path.join(srcFontsPath, fileName)

            // Check if file already exists (for overwrite info)
            let overwritten = false
            try {
              await fs.stat(filePath)
              overwritten = true
            } catch {
              // File doesn't exist, that's fine
            }

            const action = overwritten ? 'Overwriting' : 'Writing'
            send({ type: 'progress', message: `${action} ${fileName}...`, current: i + 1, total: assignments.length, currentFile: fileName })

            try {
              const variableName = `${assignmentName}Font`

              const srcArray = fontMap
                .map(font => `    { path: '../../_fonts/${font.path}', weight: '${font.weight}', style: '${font.style}' },`)
                .join('\n')

              const template = `import localFont from 'next/font/local'

export const ${variableName} = localFont({
  src: [
${srcArray}
  ],
  display: 'swap',
})
`

              await fs.writeFile(filePath, template, 'utf8')
              created.push(assignmentName)
            } catch (err) {
              errors.push(`Failed to write ${fileName}: ${err}`)
            }
          }

          if (operationId) clearCancelledOperation(operationId)
          send({
            type: 'complete',
            message: `Created ${created.length} font assignment${created.length !== 1 ? 's' : ''}`,
            processed: created.length,
            errors: errors.length,
          })
        } catch (err) {
          send({ type: 'error', message: String(err) })
        }
        
        controller.close()
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error assigning fonts:', error)
    return jsonResponse({ error: 'Failed to assign fonts' }, { status: 500 })
  }
}
