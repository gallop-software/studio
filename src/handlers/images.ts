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

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })

    const synced: string[] = []
    const errors: string[] = []

    for (const imageKey of imageKeys) {
      const entry = meta[imageKey]
      if (!entry) {
        errors.push(`Image not found in meta: ${imageKey}`)
        continue
      }

      if (entry.s) {
        synced.push(imageKey)
        continue
      }

      try {
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
            // File might not exist
          }
        }

        entry.s = 1

        for (const thumbPath of getAllThumbnailPaths(imageKey)) {
          const localPath = path.join(process.cwd(), 'public', thumbPath)
          try { await fs.unlink(localPath) } catch { /* ignore */ }
        }

        synced.push(imageKey)
      } catch (error) {
        console.error(`Failed to sync ${imageKey}:`, error)
        errors.push(imageKey)
      }
    }

    await saveMeta(meta)

    return NextResponse.json({
      success: true,
      synced,
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
        const entry = meta[imageKey]
        
        const originalPath = path.join(process.cwd(), 'public', imageKey)
        
        try {
          buffer = await fs.readFile(originalPath)
        } catch {
          if (entry?.s) {
            buffer = await downloadFromCdn(imageKey)
          } else {
            throw new Error(`File not found: ${imageKey}`)
          }
        }

        const updatedEntry = await processImage(buffer, imageKey)
        
        if (entry?.s) {
          updatedEntry.s = 1
          await uploadToCdn(imageKey)
          await deleteLocalThumbnails(imageKey)
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

        const allImages: Array<{ key: string; fullPath: string }> = []

        async function scanPublicFolder(dir: string, relativePath: string = ''): Promise<void> {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            
            for (const entry of entries) {
              if (entry.name.startsWith('.')) continue
              
              const fullPath = path.join(dir, entry.name)
              const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

              if (relPath === 'images' || relPath.startsWith('images/')) continue

              if (entry.isDirectory()) {
                await scanPublicFolder(fullPath, relPath)
              } else if (isImageFile(entry.name)) {
                allImages.push({ key: relPath, fullPath })
              }
            }
          } catch {
            // Directory might not exist
          }
        }

        const publicDir = path.join(process.cwd(), 'public')
        await scanPublicFolder(publicDir)

        const total = allImages.length
        sendEvent({ type: 'start', total })

        for (let i = 0; i < allImages.length; i++) {
          const { key, fullPath } = allImages[i]
          const imageKey = '/' + key
          
          sendEvent({ 
            type: 'progress', 
            current: i + 1, 
            total, 
            percent: Math.round(((i + 1) / total) * 100),
            currentFile: key 
          })

          try {
            const buffer = await fs.readFile(fullPath)
            const ext = path.extname(key).toLowerCase()
            const isSvg = ext === '.svg'

            if (isSvg) {
              const imageDir = path.dirname(key)
              const imagesPath = path.join(process.cwd(), 'public', 'images', imageDir === '.' ? '' : imageDir)
              await fs.mkdir(imagesPath, { recursive: true })
              
              const fileName = path.basename(key)
              const destPath = path.join(imagesPath, fileName)
              await fs.writeFile(destPath, buffer)

              meta[imageKey] = {
                w: 0,
                h: 0,
                blur: '',
              }
            } else {
              const existingEntry = meta[imageKey]
              const processedEntry = await processImage(buffer, imageKey)
              
              if (existingEntry?.s) {
                processedEntry.s = 1
              }
              
              meta[imageKey] = processedEntry
            }

            processed.push(key)
          } catch (error) {
            console.error(`Failed to process ${key}:`, error)
            errors.push(key)
          }
        }

        sendEvent({ type: 'cleanup', message: 'Removing orphaned thumbnails...' })
        
        const trackedPaths = new Set<string>()
        for (const imageKey of Object.keys(meta)) {
          for (const thumbPath of getAllThumbnailPaths(imageKey)) {
            trackedPaths.add(thumbPath)
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
        await findOrphans(imagesDir)

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

        await removeEmptyDirs(imagesDir)
        await saveMeta(meta)

        sendEvent({ 
          type: 'complete', 
          processed: processed.length, 
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
