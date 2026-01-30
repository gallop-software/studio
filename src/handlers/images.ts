import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getAllThumbnailPaths } from '../types'
import {
  loadMeta,
  saveMeta,
  isImageFile,
  getContentType,
  processImage,
  downloadFromCdn,
  uploadToCdn,
  deleteLocalThumbnails,
  getOrAddCdnIndex,
  getFileEntries,
  getMetaEntry,
} from './utils'

export async function handleSync(request: NextRequest) {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return NextResponse.json(
      { error: 'R2 not configured. Set CLOUDFLARE_R2_* environment variables.' },
      { status: 400 }
    )
  }

  try {
    const { imageKeys } = await request.json() as { imageKeys: string[] }

    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return NextResponse.json({ error: 'No image keys provided' }, { status: 400 })
    }

    const meta = await loadMeta()
    
    // Get or add CDN URL to the _cdns array
    const cdnIndex = getOrAddCdnIndex(meta, publicUrl)

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })

    const pushed: string[] = []
    const errors: string[] = []

    for (const imageKey of imageKeys) {
      const entry = getMetaEntry(meta, imageKey)
      if (!entry) {
        errors.push(`Image not found in meta: ${imageKey}. Run Scan first.`)
        continue
      }

      if (entry.c !== undefined) {
        pushed.push(imageKey)
        continue
      }

      if (!entry.p) {
        errors.push(`Image not processed: ${imageKey}. Run Process Images first.`)
        continue
      }

      try {
        // Upload original file first
        const originalLocalPath = path.join(process.cwd(), 'public', imageKey)
        try {
          const originalBuffer = await fs.readFile(originalLocalPath)
          await r2.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: imageKey.replace(/^\//, ''),
              Body: originalBuffer,
              ContentType: getContentType(imageKey),
            })
          )
        } catch (err) {
          errors.push(`Original file not found: ${imageKey}`)
          continue
        }

        // Upload thumbnails
        for (const thumbPath of getAllThumbnailPaths(imageKey)) {
          const localPath = path.join(process.cwd(), 'public', thumbPath)
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
            // Thumbnail might not exist (not processed yet)
          }
        }

        entry.c = cdnIndex

        // Delete local thumbnails
        for (const thumbPath of getAllThumbnailPaths(imageKey)) {
          const localPath = path.join(process.cwd(), 'public', thumbPath)
          try { await fs.unlink(localPath) } catch { /* ignore */ }
        }

        // Delete local original
        try { await fs.unlink(originalLocalPath) } catch { /* ignore */ }

        pushed.push(imageKey)
      } catch (error) {
        console.error(`Failed to push ${imageKey}:`, error)
        errors.push(`Failed to push: ${imageKey}`)
      }
    }

    await saveMeta(meta)

    return NextResponse.json({
      success: true,
      pushed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to sync:', error)
    return NextResponse.json({ error: 'Failed to sync to CDN' }, { status: 500 })
  }
}

export async function handleReprocess(request: NextRequest) {
  try {
    const { imageKeys } = await request.json() as { imageKeys: string[] }

    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return NextResponse.json({ error: 'No image keys provided' }, { status: 400 })
    }

    const meta = await loadMeta()
    const processed: string[] = []
    const errors: string[] = []

    for (const imageKey of imageKeys) {
      try {
        let buffer: Buffer
        const entry = getMetaEntry(meta, imageKey)
        const isPushedToCloud = entry?.c !== undefined
        const existingCdnIndex = entry?.c
        
        const originalPath = path.join(process.cwd(), 'public', imageKey)
        
        try {
          buffer = await fs.readFile(originalPath)
        } catch {
          if (isPushedToCloud) {
            // Download original from CDN to local path
            buffer = await downloadFromCdn(imageKey)
            // Save to local path for processing
            const dir = path.dirname(originalPath)
            await fs.mkdir(dir, { recursive: true })
            await fs.writeFile(originalPath, buffer)
          } else {
            throw new Error(`File not found: ${imageKey}`)
          }
        }

        const updatedEntry = await processImage(buffer, imageKey)
        
        if (isPushedToCloud) {
          // Re-upload to CDN and clean up local files
          updatedEntry.c = existingCdnIndex
          await uploadToCdn(imageKey)
          await deleteLocalThumbnails(imageKey)
          // Delete local original
          try { await fs.unlink(originalPath) } catch { /* ignore */ }
        }
        
        meta[imageKey] = updatedEntry
        processed.push(imageKey)
      } catch (error) {
        console.error(`Failed to reprocess ${imageKey}:`, error)
        errors.push(imageKey)
      }
    }

    await saveMeta(meta)

    return NextResponse.json({
      success: true,
      processed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to reprocess:', error)
    return NextResponse.json({ error: 'Failed to reprocess images' }, { status: 500 })
  }
}

export async function handleProcessAllStream() {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const meta = await loadMeta()
        const processed: string[] = []
        const errors: string[] = []
        const orphansRemoved: string[] = []

        // Count images in different states
        let alreadyProcessed = 0

        // Get all images from meta that need processing (no p flag = not processed yet)
        const imagesToProcess: Array<{ key: string; entry: import('../types').MetaEntry }> = []
        
        for (const [key, entry] of getFileEntries(meta)) {
          const fileName = path.basename(key)
          if (!isImageFile(fileName)) continue
          
          // Check if needs processing (no p = not processed yet)
          if (!entry.p) {
            imagesToProcess.push({ key, entry })
          } else {
            alreadyProcessed++
          }
        }

        const total = imagesToProcess.length
        sendEvent({ type: 'start', total })

        for (let i = 0; i < imagesToProcess.length; i++) {
          const { key, entry } = imagesToProcess[i]
          const fullPath = path.join(process.cwd(), 'public', key)
          const isInCloud = entry.c !== undefined
          const existingCdnIndex = entry.c
          
          sendEvent({ 
            type: 'progress', 
            current: i + 1, 
            total, 
            percent: Math.round(((i + 1) / total) * 100),
            currentFile: key.slice(1) // Remove leading /
          })

          try {
            let buffer: Buffer
            
            // If image is in cloud, download it first
            if (isInCloud) {
              buffer = await downloadFromCdn(key)
              // Save to local path temporarily for processing
              const dir = path.dirname(fullPath)
              await fs.mkdir(dir, { recursive: true })
              await fs.writeFile(fullPath, buffer)
            } else {
              buffer = await fs.readFile(fullPath)
            }
            
            const ext = path.extname(key).toLowerCase()
            const isSvg = ext === '.svg'

            if (isSvg) {
              const imageDir = path.dirname(key.slice(1))
              const imagesPath = path.join(process.cwd(), 'public', 'images', imageDir === '.' ? '' : imageDir)
              await fs.mkdir(imagesPath, { recursive: true })
              
              const fileName = path.basename(key)
              const destPath = path.join(imagesPath, fileName)
              await fs.writeFile(destPath, buffer)

              meta[key] = {
                ...entry,
                w: 0,
                h: 0,
                b: '',
                p: 1,
              }
            } else {
              const processedEntry = await processImage(buffer, key)
              meta[key] = {
                ...processedEntry,
                p: 1,
                ...(isInCloud ? { c: existingCdnIndex } : {}),
              }
            }

            // If image was in cloud, upload new thumbnails and clean up local files
            if (isInCloud) {
              await uploadToCdn(key)
              await deleteLocalThumbnails(key)
              // Delete local original
              try { await fs.unlink(fullPath) } catch { /* ignore */ }
            }

            processed.push(key.slice(1))
          } catch (error) {
            console.error(`Failed to process ${key}:`, error)
            errors.push(key.slice(1))
          }
        }

        sendEvent({ type: 'cleanup', message: 'Removing orphaned thumbnails...' })
        
        // Build set of expected thumbnail paths
        const trackedPaths = new Set<string>()
        for (const [imageKey, entry] of getFileEntries(meta)) {
          // Only track local thumbnails (not pushed to CDN)
          if (entry.c === undefined) {
            for (const thumbPath of getAllThumbnailPaths(imageKey)) {
              trackedPaths.add(thumbPath)
            }
          }
        }

        async function findOrphans(dir: string, relativePath: string = ''): Promise<void> {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            
            for (const entry of entries) {
              if (entry.name.startsWith('.')) continue

              const fullPath = path.join(dir, entry.name)
              const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

              if (entry.isDirectory()) {
                await findOrphans(fullPath, relPath)
              } else if (isImageFile(entry.name)) {
                const publicPath = `/images/${relPath}`
                if (!trackedPaths.has(publicPath)) {
                  try {
                    await fs.unlink(fullPath)
                    orphansRemoved.push(publicPath)
                  } catch (err) {
                    console.error(`Failed to remove orphan ${publicPath}:`, err)
                  }
                }
              }
            }
          } catch {
            // Directory might not exist
          }
        }

        const imagesDir = path.join(process.cwd(), 'public', 'images')
        try {
          await findOrphans(imagesDir)
        } catch {
          // images dir might not exist
        }

        async function removeEmptyDirs(dir: string): Promise<boolean> {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            let isEmpty = true

            for (const entry of entries) {
              if (entry.isDirectory()) {
                const subDirEmpty = await removeEmptyDirs(path.join(dir, entry.name))
                if (!subDirEmpty) isEmpty = false
              } else {
                isEmpty = false
              }
            }

            if (isEmpty && dir !== imagesDir) {
              await fs.rmdir(dir)
            }

            return isEmpty
          } catch {
            return true
          }
        }

        try {
          await removeEmptyDirs(imagesDir)
        } catch {
          // images dir might not exist
        }
        
        await saveMeta(meta)

        sendEvent({ 
          type: 'complete', 
          processed: processed.length, 
          alreadyProcessed,
          orphansRemoved: orphansRemoved.length,
          errors: errors.length,
        })
      } catch (error) {
        console.error('Failed to process all:', error)
        sendEvent({ type: 'error', message: 'Failed to process images' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
