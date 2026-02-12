import { promises as fs } from 'fs'
import path from 'path'
import { printProgress, printComplete, printError } from './index'
import {
  loadMeta,
  saveMeta,
  getFileEntries,
  getMetaEntry,
  processImage,
  downloadFromCdn,
  deleteOriginalFromCdn,
  deleteThumbnailsFromCdn,
} from '../handlers/utils'
import { isProcessed } from '../types'
import { getPublicPath } from '../config'

export async function runDownload(args: string[]) {
  const prefix = args[0] || ''

  if (prefix) {
    console.log(`Downloading cloud images matching "/${prefix}" to local...`)
  } else {
    console.log('Downloading all cloud images to local...')
  }

  const meta = await loadMeta()

  // Find cloud images to download
  const imagesToDownload: string[] = []

  for (const [key, entry] of getFileEntries(meta)) {
    // Apply prefix filter
    if (prefix && !key.startsWith(`/${prefix}`)) continue

    // Only download cloud files
    if (entry.c === undefined) continue

    imagesToDownload.push(key)
  }

  if (imagesToDownload.length === 0) {
    console.log(`No cloud images to download${prefix ? ` matching "/${prefix}"` : ''}.`)
    return
  }

  const total = imagesToDownload.length
  console.log(`Downloading ${total} image${total !== 1 ? 's' : ''} from CDN...`)

  const downloaded: string[] = []
  const errors: string[] = []

  for (let i = 0; i < imagesToDownload.length; i++) {
    const imageKey = imagesToDownload[i]
    const entry = getMetaEntry(meta, imageKey)

    printProgress(i + 1, total, path.basename(imageKey))

    if (!entry || entry.c === undefined) {
      errors.push(`Not on cloud: ${imageKey}`)
      continue
    }

    try {
      // Download original from R2
      const imageBuffer = await downloadFromCdn(imageKey)

      // Ensure directory exists
      const localPath = getPublicPath(imageKey.replace(/^\//, ''))
      await fs.mkdir(path.dirname(localPath), { recursive: true })

      // Write to local filesystem
      await fs.writeFile(localPath, imageBuffer)

      // Delete original and thumbnails from R2
      await deleteOriginalFromCdn(imageKey)
      await deleteThumbnailsFromCdn(imageKey)

      // Check if image was processed
      const wasProcessed = isProcessed(entry)

      // Remove the c property (no longer on CDN)
      delete entry.c

      // If it was processed, regenerate thumbnails locally
      if (wasProcessed) {
        const processedEntry = await processImage(imageBuffer, imageKey)
        entry.sm = processedEntry.sm
        entry.md = processedEntry.md
        entry.lg = processedEntry.lg
        entry.f = processedEntry.f
      }

      // Save meta after each successful download
      await saveMeta(meta)

      downloaded.push(imageKey)
    } catch (error) {
      console.error(`\nFailed to download ${imageKey}:`, error)
      errors.push(imageKey)
    }
  }

  await saveMeta(meta)

  // Print summary
  const parts: string[] = []
  parts.push(`${downloaded.length} downloaded`)
  if (errors.length > 0) parts.push(`${errors.length} failed`)

  if (errors.length > 0) {
    printError(`Download complete. ${parts.join(', ')}.`)
  } else {
    printComplete(`Download complete. ${parts.join(', ')}.`)
  }
}
