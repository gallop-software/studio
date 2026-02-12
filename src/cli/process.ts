import { promises as fs } from 'fs'
import path from 'path'
import { printProgress, printComplete, printError } from './index'
import {
  loadMeta,
  saveMeta,
  isImageFile,
  getFileEntries,
  processImage,
} from '../handlers/utils'
import { isProcessed } from '../types'
import { getPublicPath } from '../config'

export async function runProcess(args: string[]) {
  const prefix = args[0] || ''

  if (prefix) {
    console.log(`Processing unprocessed images matching "/${prefix}"...`)
  } else {
    console.log('Processing all unprocessed images...')
  }

  const meta = await loadMeta()
  const processed: string[] = []
  const errors: string[] = []
  let alreadyProcessed = 0

  // Get all images from meta that need processing
  const imagesToProcess: Array<{ key: string }> = []

  for (const [key, entry] of getFileEntries(meta)) {
    const fileName = path.basename(key)
    if (!isImageFile(fileName)) continue

    // Apply prefix filter
    if (prefix && !key.startsWith(`/${prefix}`)) continue

    if (!isProcessed(entry)) {
      imagesToProcess.push({ key })
    } else {
      alreadyProcessed++
    }
  }

  if (imagesToProcess.length === 0) {
    console.log(`No unprocessed images found${prefix ? ` matching "/${prefix}"` : ''}. ${alreadyProcessed} already processed.`)
    return
  }

  const total = imagesToProcess.length
  console.log(`Found ${total} unprocessed image${total !== 1 ? 's' : ''} (${alreadyProcessed} already processed)`)

  for (let i = 0; i < imagesToProcess.length; i++) {
    const { key } = imagesToProcess[i]
    const fullPath = getPublicPath(key)

    printProgress(i + 1, total, key.slice(1))

    try {
      let buffer: Buffer

      try {
        buffer = await fs.readFile(fullPath)
      } catch {
        printError(`File not found: ${key}`)
        errors.push(key)
        continue
      }

      const ext = path.extname(key).toLowerCase()
      const isSvg = ext === '.svg'

      if (isSvg) {
        const imageDir = path.dirname(key.slice(1))
        const imagesPath = getPublicPath('images', imageDir === '.' ? '' : imageDir)
        await fs.mkdir(imagesPath, { recursive: true })

        const fileName = path.basename(key)
        const destPath = path.join(imagesPath, fileName)
        await fs.writeFile(destPath, buffer)

        const existingEntry = meta[key]
        meta[key] = {
          ...(typeof existingEntry === 'object' && !Array.isArray(existingEntry) ? existingEntry : {}),
          o: { w: 0, h: 0 },
          f: { w: 0, h: 0 },
        }
      } else {
        const updatedEntry = await processImage(buffer, key)
        meta[key] = updatedEntry
      }

      // Save meta after each
      await saveMeta(meta)
      processed.push(key)
    } catch (error) {
      console.error(`\nFailed to process ${key}:`, error)
      errors.push(key)
    }
  }

  await saveMeta(meta)

  // Print summary
  const parts: string[] = []
  parts.push(`${processed.length} processed`)
  if (errors.length > 0) parts.push(`${errors.length} failed`)

  if (errors.length > 0) {
    printError(`Processing complete. ${parts.join(', ')}.`)
  } else {
    printComplete(`Processing complete. ${parts.join(', ')}.`)
  }
}
