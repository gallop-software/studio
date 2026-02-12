import { promises as fs } from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { printProgress, printComplete, printError } from './index'
import {
  loadMeta,
  saveMeta,
  getFileEntries,
  getContentType,
  getCdnUrls,
  getOrAddCdnIndex,
  getMetaEntry,
  downloadFromRemoteUrl,
} from '../handlers/utils'
import { getAllThumbnailPaths, isProcessed } from '../types'
import { getPublicPath } from '../config'
import { deleteEmptyFolders } from '../handlers/utils/folders'

export async function runPush(args: string[]) {
  const prefix = args[0] || ''

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    printError('R2 not configured. Set CLOUDFLARE_R2_* environment variables in .env.local')
    process.exit(1)
  }

  if (prefix) {
    console.log(`Pushing local images matching "/${prefix}" to CDN...`)
  } else {
    console.log('Pushing all local images to CDN...')
  }

  const meta = await loadMeta()
  const cdnUrls = getCdnUrls(meta)
  const cdnIndex = getOrAddCdnIndex(meta, publicUrl)

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  // Find local images to push
  const imagesToPush: string[] = []

  for (const [key, entry] of getFileEntries(meta)) {
    // Apply prefix filter
    if (prefix && !key.startsWith(`/${prefix}`)) continue

    // Skip already-pushed files
    const existingCdnUrl = entry.c !== undefined ? cdnUrls[entry.c] : undefined
    if (existingCdnUrl === publicUrl) continue

    // Only push local files (no c flag) or remote files (different CDN)
    imagesToPush.push(key)
  }

  if (imagesToPush.length === 0) {
    console.log(`No local images to push${prefix ? ` matching "/${prefix}"` : ''}.`)
    return
  }

  const total = imagesToPush.length
  console.log(`Pushing ${total} image${total !== 1 ? 's' : ''} to CDN...`)

  const pushed: string[] = []
  const errors: string[] = []
  const sourceFolders = new Set<string>()

  for (let i = 0; i < imagesToPush.length; i++) {
    const imageKey = imagesToPush[i]
    const entry = getMetaEntry(meta, imageKey)

    printProgress(i + 1, total, path.basename(imageKey))

    if (!entry) {
      errors.push(`Not in meta: ${imageKey}`)
      continue
    }

    const existingCdnUrl = entry.c !== undefined ? cdnUrls[entry.c] : undefined
    const isRemote = entry.c !== undefined && existingCdnUrl !== publicUrl

    try {
      let originalBuffer: Buffer

      if (isRemote && existingCdnUrl) {
        const remoteUrl = `${existingCdnUrl}${imageKey}`
        originalBuffer = await downloadFromRemoteUrl(remoteUrl)
      } else {
        const originalLocalPath = getPublicPath(imageKey)
        try {
          originalBuffer = await fs.readFile(originalLocalPath)
        } catch {
          errors.push(`File not found: ${imageKey}`)
          continue
        }
      }

      // Upload original to R2
      await r2.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: imageKey.replace(/^\//, ''),
          Body: originalBuffer,
          ContentType: getContentType(imageKey),
        })
      )

      // Upload thumbnails (only if processed locally, not for remote imports)
      if (!isRemote && isProcessed(entry)) {
        for (const thumbPath of getAllThumbnailPaths(imageKey)) {
          const localPath = getPublicPath(thumbPath)
          try {
            const fileBuffer = await fs.readFile(localPath)
            await r2.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: thumbPath.replace(/^\//, ''),
                Body: fileBuffer,
                ContentType: getContentType(thumbPath),
              })
            )
          } catch {
            // Thumbnail might not exist
          }
        }
      }

      entry.c = cdnIndex

      // Delete local files (only for non-remote)
      if (!isRemote) {
        const originalLocalPath = getPublicPath(imageKey)
        sourceFolders.add(path.dirname(originalLocalPath))

        // Delete local thumbnails
        for (const thumbPath of getAllThumbnailPaths(imageKey)) {
          const localPath = getPublicPath(thumbPath)
          sourceFolders.add(path.dirname(localPath))
          try {
            await fs.unlink(localPath)
          } catch {
            /* ignore */
          }
        }

        // Delete local original
        try {
          await fs.unlink(originalLocalPath)
        } catch {
          /* ignore */
        }
      }

      await saveMeta(meta)
      pushed.push(imageKey)
    } catch (error) {
      console.error(`\nFailed to push ${imageKey}:`, error)
      errors.push(`Failed: ${imageKey}`)
    }
  }

  // Clean up empty source folders
  for (const folder of sourceFolders) {
    await deleteEmptyFolders(folder)
  }

  // Print summary
  const parts: string[] = []
  parts.push(`${pushed.length} pushed`)
  if (errors.length > 0) parts.push(`${errors.length} failed`)

  if (errors.length > 0) {
    printError(`Push complete. ${parts.join(', ')}.`)
  } else {
    printComplete(`Push complete. ${parts.join(', ')}.`)
  }
}
