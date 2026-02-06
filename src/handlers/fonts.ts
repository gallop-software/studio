import { promises as fs } from 'fs'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { getWorkspacePath } from '../config'
import { jsonResponse } from './utils/response'
import type { FileItem } from '../types'

// Weight name to number mapping
const weightMap: Record<string, string> = {
  thin: '100',
  extralight: '200',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
}

/**
 * Parse font weight and style from filename
 */
function parseFontMetadata(filename: string): { weight: string; style: string; isVariable: boolean } {
  const name = filename.toLowerCase()
  
  let weight = '400'
  let style = 'normal'
  const isVariable = name.includes('variable')
  
  if (isVariable) {
    weight = '100 900'
  } else {
    // Order matters - check longer strings first
    if (name.includes('extralight')) weight = weightMap.extralight
    else if (name.includes('extrabold')) weight = weightMap.extrabold
    else if (name.includes('semibold')) weight = weightMap.semibold
    else if (name.includes('thin')) weight = weightMap.thin
    else if (name.includes('light')) weight = weightMap.light
    else if (name.includes('black')) weight = weightMap.black
    else if (name.includes('bold')) weight = weightMap.bold
    else if (name.includes('medium')) weight = weightMap.medium
    else if (name.includes('regular')) weight = weightMap.regular
  }
  
  if (name.includes('italic')) style = 'italic'
  
  return { weight, style, isVariable }
}

/**
 * Get human-readable weight name
 */
function getWeightName(weight: string): string {
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

    // Only allow renaming within _fonts/
    if (!oldPath.startsWith('_fonts/')) {
      return jsonResponse({ error: 'Can only rename items in _fonts/' }, { status: 400 })
    }

    // Validate newName (no slashes, etc.)
    if (newName.includes('/') || newName.includes('\\')) {
      return jsonResponse({ error: 'Invalid folder name' }, { status: 400 })
    }

    const oldFullPath = getWorkspacePath(oldPath)
    
    // Get the parent directory and construct new path
    const parentDir = path.dirname(oldPath)
    const oldFolderName = path.basename(oldPath).toLowerCase()
    const newFolderName = newName.toLowerCase()
    const newPath = `${parentDir}/${newFolderName}`
    const newFullPath = getWorkspacePath(newPath)

    // Check if old path exists and is a directory
    let isDirectory = false
    try {
      const stat = await fs.stat(oldFullPath)
      isDirectory = stat.isDirectory()
    } catch {
      return jsonResponse({ error: 'Path not found' }, { status: 404 })
    }

    // Check if new path already exists
    try {
      await fs.stat(newFullPath)
      return jsonResponse({ error: 'A folder with that name already exists' }, { status: 400 })
    } catch {
      // Good, it doesn't exist
    }

    // Rename the folder first
    await fs.rename(oldFullPath, newFullPath)

    // If it's a directory, also rename files inside to match the new folder name
    if (isDirectory) {
      try {
        const entries = await fs.readdir(newFullPath)
        
        for (const entry of entries) {
          const entryLower = entry.toLowerCase()
          
          // Check if file starts with old folder name followed by - or _
          if (entryLower.startsWith(oldFolderName + '-') || entryLower.startsWith(oldFolderName + '_')) {
            // Determine the separator used
            const separator = entryLower.startsWith(oldFolderName + '-') ? '-' : '_'
            const suffix = entry.substring(oldFolderName.length) // includes the separator and everything after
            const newFileName = newFolderName + suffix.toLowerCase()
            
            const oldFilePath = path.join(newFullPath, entry)
            const newFilePath = path.join(newFullPath, newFileName)
            
            await fs.rename(oldFilePath, newFilePath)
          }
        }
      } catch (err) {
        console.error('Error renaming files inside folder:', err)
        // Don't fail the whole operation, folder was already renamed
      }
    }

    return jsonResponse({
      success: true,
      oldPath,
      newPath,
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
    
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase()
      if (ext === '.ttf') {
        ttfFiles.push(entry)
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
    
    // Check if woff2 generation is needed
    const needsGeneration = ttfFiles.length > 0 && woff2Files.length === 0
    
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
    } catch {
      // src/fonts doesn't exist yet, that's ok
    }
    
    return jsonResponse({
      folder,
      folderName,
      ttfFiles,
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
    } catch {
      // src/fonts doesn't exist yet
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
 */
export async function handleFontsAssign(request: Request): Promise<Response> {
  try {
    const { folder, assignments } = await request.json()
    
    if (!folder || !folder.startsWith('_fonts/')) {
      return jsonResponse({ error: 'Invalid folder path' }, { status: 400 })
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
    
    const folderPath = getWorkspacePath(folder)
    const folderName = path.basename(folder)
    
    // Set up SSE streaming
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }
        
        try {
          // Step 1: Check for font files
          const entries = await fs.readdir(folderPath)
          const ttfFiles = entries.filter(f => f.toLowerCase().endsWith('.ttf'))
          let woff2Files = entries.filter(f => f.toLowerCase().endsWith('.woff2'))
          
          if (ttfFiles.length === 0 && woff2Files.length === 0) {
            send({ status: 'error', message: 'No font files found in folder' })
            controller.close()
            return
          }
          
          // Step 2: Generate woff2 if needed
          if (woff2Files.length === 0 && ttfFiles.length > 0) {
            send({ status: 'progress', message: 'Generating woff2 files...', current: 0, total: ttfFiles.length })
            
            // Dynamic import of ttf2woff2
            const ttf2woff2Module = await import('ttf2woff2')
            const ttf2woff2 = ttf2woff2Module.default
            
            for (let i = 0; i < ttfFiles.length; i++) {
              const ttfFile = ttfFiles[i]
              const baseName = path.basename(ttfFile, '.ttf')
              const woff2Name = baseName + '.woff2'
              
              send({ status: 'progress', message: `Compressing ${ttfFile}...`, current: i + 1, total: ttfFiles.length, currentFile: ttfFile })
              
              try {
                const ttfPath = path.join(folderPath, ttfFile)
                const input = readFileSync(ttfPath)
                const woff2Data = ttf2woff2(input)
                writeFileSync(path.join(folderPath, woff2Name), woff2Data)
                woff2Files.push(woff2Name)
              } catch (err) {
                send({ status: 'progress', message: `Failed to compress ${ttfFile}`, error: String(err) })
              }
            }
          }
          
          if (woff2Files.length === 0) {
            send({ status: 'error', message: 'No woff2 files available' })
            controller.close()
            return
          }
          
          // Step 3: Build font map from woff2 files
          const fontMap = woff2Files.map(file => {
            const baseName = path.basename(file, '.woff2')
            const { weight, style } = parseFontMetadata(baseName)
            return {
              path: `${folderName}/${file}`,
              weight,
              style,
            }
          })
          
          // Step 4: Write assignment files
          const srcFontsPath = getWorkspacePath('src/fonts')
          
          // Ensure src/fonts directory exists
          if (!existsSync(srcFontsPath)) {
            mkdirSync(srcFontsPath, { recursive: true })
          }
          
          const created: string[] = []
          const errors: string[] = []
          
          for (let i = 0; i < assignments.length; i++) {
            const assignmentName = assignments[i]
            send({ status: 'progress', message: `Writing ${assignmentName}.ts...`, current: i + 1, total: assignments.length })
            
            try {
              const fileName = `${assignmentName}.ts`
              const filePath = path.join(srcFontsPath, fileName)
              const variableName = `${assignmentName}Font`
              
              // Generate the font src array
              const srcArray = fontMap
                .map(font => `    { path: '../../_fonts/${font.path}', weight: '${font.weight}', style: '${font.style}' },`)
                .join('\n')
              
              const template = `import localFont from 'next/font/local'

export const ${variableName} = localFont({
  src: [
${srcArray}
  ],
})
`
              
              writeFileSync(filePath, template, 'utf8')
              created.push(assignmentName)
            } catch (err) {
              errors.push(`Failed to write ${assignmentName}.ts: ${err}`)
            }
          }
          
          send({
            status: 'complete',
            message: `Created ${created.length} font assignment${created.length !== 1 ? 's' : ''}`,
            created,
            errors: errors.length > 0 ? errors : undefined,
          })
        } catch (err) {
          send({ status: 'error', message: String(err) })
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
