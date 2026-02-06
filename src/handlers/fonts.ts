import { promises as fs } from 'fs'
import path from 'path'
import { getWorkspacePath } from '../config'
import { jsonResponse } from './utils/response'

// Valid font weights for naming convention
const VALID_WEIGHTS = [
  'thin',
  'extralight',
  'light',
  'regular',
  'medium',
  'semibold',
  'bold',
  'extrabold',
  'black',
]

interface FontFile {
  name: string
  weight: string
  style: string
  path: string
}

interface FontFamily {
  name: string
  files: FontFile[]
  fileCount: number
  weights: string[]
}

interface FontConfig {
  type: string
  family: string
  path: string
  exportName: string
}

interface FontsListResponse {
  families: FontFamily[]
  configs: FontConfig[]
}

/**
 * Parse a font filename to extract basename, weight, and style
 * Examples:
 *   "Raleway-Bold.ttf" → { basename: "raleway", weight: "bold", style: "normal" }
 *   "OpenSans-BoldItalic.ttf" → { basename: "opensans", weight: "bold", style: "italic" }
 *   "MyFont.ttf" → { basename: "myfont", weight: "regular", style: "normal" }
 */
export function parseFontFilename(filename: string): {
  basename: string
  weight: string
  style: string
  isValid: boolean
} {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.(ttf|woff2?|otf)$/i, '')
  const nameLower = nameWithoutExt.toLowerCase()

  // Check for italic
  const hasItalic = nameLower.includes('italic')
  const style = hasItalic ? 'italic' : 'normal'

  // Try to find weight by splitting on dash or underscore
  const parts = nameWithoutExt.split(/[-_]/)

  if (parts.length === 1) {
    // No separator - just basename, default to regular
    return {
      basename: nameLower.replace('italic', '').trim(),
      weight: 'regular',
      style,
      isValid: false,
    }
  }

  // First part is basename, rest is weight/style
  const basename = parts[0].toLowerCase()
  const weightPart = parts.slice(1).join('').toLowerCase().replace('italic', '')

  // Check if weight is valid
  let weight = 'regular'
  let isValid = false

  for (const validWeight of VALID_WEIGHTS) {
    if (weightPart.includes(validWeight)) {
      weight = validWeight
      isValid = true
      break
    }
  }

  // Handle common variations
  if (!isValid) {
    if (weightPart === '' || weightPart === 'regular' || weightPart === 'normal') {
      weight = 'regular'
      isValid = true
    }
  }

  return { basename, weight, style, isValid }
}

/**
 * Generate the correct filename based on naming convention
 */
export function generateFontFilename(
  basename: string,
  weight: string,
  style: string,
  ext: string
): string {
  const styleSuffix = style === 'italic' ? 'italic' : ''
  const weightAndStyle = weight + styleSuffix
  return `${basename}-${weightAndStyle}${ext}`.toLowerCase()
}

/**
 * List all font families and their files from _fonts/
 * Also list font configs from src/fonts/*.ts
 */
export async function handleFontsList(): Promise<Response> {
  try {
    const fontsDir = getWorkspacePath('_fonts')
    const configDir = getWorkspacePath('src', 'fonts')

    const families: FontFamily[] = []
    const configs: FontConfig[] = []

    // Scan _fonts/ directory for font families
    try {
      const entries = await fs.readdir(fontsDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const familyName = entry.name.toLowerCase()
          const familyPath = path.join(fontsDir, entry.name)

          // Get all font files in this family folder
          const files = await fs.readdir(familyPath)
          const fontFiles: FontFile[] = []
          const weightsSet = new Set<string>()

          for (const file of files) {
            if (file.match(/\.(ttf|woff2?)$/i)) {
              const parsed = parseFontFilename(file)
              fontFiles.push({
                name: file,
                weight: parsed.weight,
                style: parsed.style,
                path: `_fonts/${entry.name}/${file}`,
              })
              weightsSet.add(parsed.weight)
            }
          }

          if (fontFiles.length > 0) {
            families.push({
              name: familyName,
              files: fontFiles.sort((a, b) => {
                // Sort by weight order
                const weightOrder = VALID_WEIGHTS.indexOf(a.weight) - VALID_WEIGHTS.indexOf(b.weight)
                if (weightOrder !== 0) return weightOrder
                // Then by style (normal before italic)
                return a.style === 'normal' ? -1 : 1
              }),
              fileCount: fontFiles.length,
              weights: Array.from(weightsSet).sort(
                (a, b) => VALID_WEIGHTS.indexOf(a) - VALID_WEIGHTS.indexOf(b)
              ),
            })
          }
        }
      }
    } catch {
      // _fonts/ doesn't exist yet, that's fine
    }

    // Scan src/fonts/*.ts for config files
    try {
      const configFiles = await fs.readdir(configDir)

      for (const file of configFiles) {
        if (file.endsWith('.ts') && !file.startsWith('_')) {
          const configPath = path.join(configDir, file)
          const content = await fs.readFile(configPath, 'utf-8')

          // Extract the export name (e.g., "bodyFont" from "export const bodyFont")
          const exportMatch = content.match(/export\s+const\s+(\w+)\s*=/)
          const exportName = exportMatch ? exportMatch[1] : file.replace('.ts', '') + 'Font'

          // Extract the font family from the path pattern
          // Looking for: path: '../../_fonts/{family}/'
          const pathMatch = content.match(/path:\s*['"]\.\.\/\.\.\/\_fonts\/([^\/]+)\//)
          const family = pathMatch ? pathMatch[1].toLowerCase() : 'unknown'

          // Type is the filename without extension
          const type = file.replace('.ts', '')

          configs.push({
            type,
            family,
            path: `src/fonts/${file}`,
            exportName,
          })
        }
      }
    } catch {
      // src/fonts/ doesn't exist yet, that's fine
    }

    // Sort families alphabetically
    families.sort((a, b) => a.name.localeCompare(b.name))

    return jsonResponse<FontsListResponse>({ families, configs })
  } catch (error) {
    console.error('Error listing fonts:', error)
    return jsonResponse({ error: 'Failed to list fonts' }, { status: 500 })
  }
}

/**
 * Upload TTF font files with naming convention enforcement
 */
export async function handleFontsUpload(request: Request): Promise<Response> {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const renamesJson = formData.get('renames') as string | null

    if (!files || files.length === 0) {
      return jsonResponse({ error: 'No files provided' }, { status: 400 })
    }

    // Parse renames if provided: { originalName: { basename, weight, style } }
    let renames: Record<string, { basename: string; weight: string; style: string }> = {}
    if (renamesJson) {
      try {
        renames = JSON.parse(renamesJson)
      } catch {
        // Invalid JSON, ignore
      }
    }

    const fontsDir = getWorkspacePath('_fonts')
    const uploaded: { original: string; saved: string; path: string }[] = []
    const errors: { file: string; error: string }[] = []

    for (const file of files) {
      try {
        // Only accept TTF files
        if (!file.name.toLowerCase().endsWith('.ttf')) {
          errors.push({ file: file.name, error: 'Only TTF files are supported' })
          continue
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Get naming info - either from renames or parse from filename
        let basename: string
        let weight: string
        let style: string

        if (renames[file.name]) {
          basename = renames[file.name].basename.toLowerCase()
          weight = renames[file.name].weight.toLowerCase()
          style = renames[file.name].style.toLowerCase()
        } else {
          const parsed = parseFontFilename(file.name)
          basename = parsed.basename
          weight = parsed.weight
          style = parsed.style
        }

        // Generate proper filename
        const newFilename = generateFontFilename(basename, weight, style, '.ttf')

        // Create family folder if needed
        const familyDir = path.join(fontsDir, basename)
        await fs.mkdir(familyDir, { recursive: true })

        // Save file
        const filePath = path.join(familyDir, newFilename)
        await fs.writeFile(filePath, buffer)

        uploaded.push({
          original: file.name,
          saved: newFilename,
          path: `_fonts/${basename}/${newFilename}`,
        })
      } catch (err) {
        errors.push({
          file: file.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return jsonResponse({
      success: true,
      uploaded,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error uploading fonts:', error)
    return jsonResponse({ error: 'Failed to upload fonts' }, { status: 500 })
  }
}
