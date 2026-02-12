import { promises as fs } from 'fs'
import path from 'path'
import { printProgress, printComplete, printError } from './index'
import { parseFontMetadata } from '../handlers/fonts'
import { getWorkspacePath } from '../config'

export async function runFonts(args: string[]) {
  const subcommand = args[0]

  if (!subcommand) {
    console.error('Usage:')
    console.error('  studio fonts woff2 <folder>    Convert TTF/OTF to woff2')
    console.error('  studio fonts assign <folder> --name <name>  Generate src/fonts/<name>.ts')
    process.exit(1)
  }

  switch (subcommand) {
    case 'woff2':
      await runFontsWoff2(args.slice(1))
      break
    case 'assign':
      await runFontsAssign(args.slice(1))
      break
    default:
      console.error(`Unknown fonts subcommand: ${subcommand}`)
      console.error('Available: woff2, assign')
      process.exit(1)
  }
}

async function runFontsWoff2(args: string[]) {
  const folder = args[0]

  if (!folder) {
    console.error('Usage: studio fonts woff2 <folder>')
    console.error('  <folder> is the folder name inside _fonts/')
    process.exit(1)
  }

  const folderPath = getWorkspacePath('_fonts', folder)

  // Check folder exists
  try {
    const stat = await fs.stat(folderPath)
    if (!stat.isDirectory()) {
      printError(`Not a directory: _fonts/${folder}`)
      process.exit(1)
    }
  } catch {
    printError(`Folder not found: _fonts/${folder}`)
    process.exit(1)
  }

  const entries = await fs.readdir(folderPath)
  const sourceFiles = entries.filter(f => {
    const lower = f.toLowerCase()
    return lower.endsWith('.ttf') || lower.endsWith('.otf')
  })

  if (sourceFiles.length === 0) {
    console.log(`No TTF/OTF files found in _fonts/${folder}/`)
    return
  }

  console.log(`Converting ${sourceFiles.length} font file${sourceFiles.length !== 1 ? 's' : ''} to woff2...`)

  const ttf2woff2Module = await import('ttf2woff2')
  const ttf2woff2 = ttf2woff2Module.default

  const converted: string[] = []
  const errors: string[] = []

  for (let i = 0; i < sourceFiles.length; i++) {
    const sourceFile = sourceFiles[i]
    const sourceExt = path.extname(sourceFile)
    const baseName = path.basename(sourceFile, sourceExt)
    const woff2Name = baseName + '.woff2'

    printProgress(i + 1, sourceFiles.length, sourceFile)

    try {
      const sourcePath = path.join(folderPath, sourceFile)
      const input = await fs.readFile(sourcePath)
      const woff2Data = ttf2woff2(input)
      await fs.writeFile(path.join(folderPath, woff2Name), woff2Data)
      converted.push(woff2Name)
    } catch (error) {
      console.error(`\nFailed to convert ${sourceFile}:`, error)
      errors.push(sourceFile)
    }
  }

  if (errors.length > 0) {
    printError(`Converted ${converted.length} files, ${errors.length} failed.`)
  } else {
    printComplete(`Converted ${converted.length} file${converted.length !== 1 ? 's' : ''} to woff2.`)
  }
}

async function runFontsAssign(args: string[]) {
  const folder = args[0]

  // Parse --name flag
  let name = ''
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[i + 1]
      break
    }
  }

  if (!folder || !name) {
    console.error('Usage: studio fonts assign <folder> --name <name>')
    console.error('  <folder> is the folder name inside _fonts/')
    console.error('  <name> is the variable name for src/fonts/<name>.ts')
    process.exit(1)
  }

  // Validate name
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
    printError(`Invalid assignment name: ${name}. Must start with a letter and contain only letters/numbers.`)
    process.exit(1)
  }

  const folderPath = getWorkspacePath('_fonts', folder)

  // Check folder exists
  try {
    const stat = await fs.stat(folderPath)
    if (!stat.isDirectory()) {
      printError(`Not a directory: _fonts/${folder}`)
      process.exit(1)
    }
  } catch {
    printError(`Folder not found: _fonts/${folder}`)
    process.exit(1)
  }

  const entries = await fs.readdir(folderPath)
  const woff2Files = entries.filter(f => f.toLowerCase().endsWith('.woff2'))

  if (woff2Files.length === 0) {
    printError(`No woff2 files found in _fonts/${folder}/. Run 'studio fonts woff2 ${folder}' first.`)
    process.exit(1)
  }

  console.log(`Generating font assignment from ${woff2Files.length} woff2 file${woff2Files.length !== 1 ? 's' : ''}...`)

  // Parse font metadata from filenames
  const fontMap = woff2Files.map(file => {
    const baseName = path.basename(file, '.woff2')
    const { weight, style } = parseFontMetadata(baseName)
    return { path: `${folder}/${file}`, weight, style }
  })

  // Sort by weight, then style
  fontMap.sort((a, b) => {
    const wa = parseInt(a.weight) || 400
    const wb = parseInt(b.weight) || 400
    if (wa !== wb) return wa - wb
    return a.style === 'normal' ? -1 : 1
  })

  // Generate the template
  const variableName = `${name}Font`
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

  // Write the file
  const srcFontsPath = getWorkspacePath('src/fonts')
  await fs.mkdir(srcFontsPath, { recursive: true })

  const filePath = path.join(srcFontsPath, `${name}.ts`)

  // Check if file already exists
  let overwritten = false
  try {
    await fs.stat(filePath)
    overwritten = true
  } catch {
    // File doesn't exist
  }

  await fs.writeFile(filePath, template, 'utf8')

  if (overwritten) {
    printComplete(`Overwrote src/fonts/${name}.ts with ${woff2Files.length} font source${woff2Files.length !== 1 ? 's' : ''}.`)
  } else {
    printComplete(`Created src/fonts/${name}.ts with ${woff2Files.length} font source${woff2Files.length !== 1 ? 's' : ''}.`)
  }

  // Print detected weights
  for (const font of fontMap) {
    const weightName = getWeightNameLocal(font.weight)
    console.log(`  ${font.path} -> ${weightName} ${font.style}`)
  }
}

function getWeightNameLocal(weight: string): string {
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
