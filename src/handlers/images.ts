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
  getCdnUrls,
  downloadFromRemoteUrl,
  purgeCloudflareCache,
} from './utils'

export async function handleSync(request: NextRequest) {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')

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
    const cdnUrls = getCdnUrls(meta)
    
    // Get or add CDN URL to the _cdns array
    const cdnIndex = getOrAddCdnIndex(meta, publicUrl)

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })

    const pushed: string[] = []
    const errors: string[] = []
    const urlsToPurge: string[] = []

    for (const imageKey of imageKeys) {
      const entry = getMetaEntry(meta, imageKey)
      if (!entry) {
        errors.push(`Image not found in meta: ${imageKey}. Run Scan first.`)
        continue
      }

      // Check if already pushed to our R2
      const existingCdnUrl = entry.c !== undefined ? cdnUrls[entry.c] : undefined
      const isAlreadyInOurR2 = existingCdnUrl === publicUrl
      
      if (isAlreadyInOurR2) {
        pushed.push(imageKey)
        continue
      }

      // Check if this is a remote image (in another CDN)
      const isRemote = entry.c !== undefined && existingCdnUrl !== publicUrl

      try {
        let originalBuffer: Buffer

        if (isRemote) {
          // Download from remote URL
          const remoteUrl = `${existingCdnUrl}${imageKey}`
          originalBuffer = await downloadFromRemoteUrl(remoteUrl)
        } else {
          // Read from local file
          const originalLocalPath = path.join(process.cwd(), 'public', imageKey)
          try {
            originalBuffer = await fs.readFile(originalLocalPath)
          } catch {
            errors.push(`Original file not found: ${imageKey}`)
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
        urlsToPurge.push(`${publicUrl}${imageKey}`)

        // Upload thumbnails (only if processed locally, not for remote imports)
        if (!isRemote && entry.p) {
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
              urlsToPurge.push(`${publicUrl}${thumbPath}`)
            } catch {
              // Thumbnail might not exist
            }
          }
        }

        entry.c = cdnIndex

        // Delete local files (only for non-remote, local images being pushed)
        if (!isRemote) {
          const originalLocalPath = path.join(process.cwd(), 'public', imageKey)
          
          // Delete local thumbnails
          for (const thumbPath of getAllThumbnailPaths(imageKey)) {
            const localPath = path.join(process.cwd(), 'public', thumbPath)
            try { await fs.unlink(localPath) } catch { /* ignore */ }
          }

          // Delete local original
          try { await fs.unlink(originalLocalPath) } catch { /* ignore */ }
        }

        pushed.push(imageKey)
      } catch (error) {
        console.error(`Failed to push ${imageKey}:`, error)
        errors.push(`Failed to push: ${imageKey}`)
      }
    }

    await saveMeta(meta)
    
    // Purge Cloudflare cache for uploaded files
    if (urlsToPurge.length > 0) {
      await purgeCloudflareCache(urlsToPurge)
    }

    return NextResponse.json({
      success: true,
      pushed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to push:', error)
    return NextResponse.json({ error: 'Failed to push to CDN' }, { status: 500 })
  }
}

export async function handleReprocess(request: NextRequest) {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')
  
  try {
    const { imageKeys } = await request.json() as { imageKeys: string[] }

    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return NextResponse.json({ error: 'No image keys provided' }, { status: 400 })
    }

    const meta = await loadMeta()
    const cdnUrls = getCdnUrls(meta)
    const processed: string[] = []
    const errors: string[] = []
    const urlsToPurge: string[] = []

    for (const imageKey of imageKeys) {
      try {
        let buffer: Buffer
        const entry = getMetaEntry(meta, imageKey)
        const existingCdnIndex = entry?.c
        const existingCdnUrl = existingCdnIndex !== undefined ? cdnUrls[existingCdnIndex] : undefined
        
        // Determine if this is our R2 or a remote CDN
        const isInOurR2 = existingCdnUrl === publicUrl
        const isRemote = existingCdnIndex !== undefined && !isInOurR2
        
        const originalPath = path.join(process.cwd(), 'public', imageKey)
        
        try {
          buffer = await fs.readFile(originalPath)
        } catch {
          if (isInOurR2) {
            // Download original from our R2
            buffer = await downloadFromCdn(imageKey)
            const dir = path.dirname(originalPath)
            await fs.mkdir(dir, { recursive: true })
            await fs.writeFile(originalPath, buffer)
          } else if (isRemote && existingCdnUrl) {
            // Download from remote URL
            const remoteUrl = `${existingCdnUrl}${imageKey}`
            buffer = await downloadFromRemoteUrl(remoteUrl)
            const dir = path.dirname(originalPath)
            await fs.mkdir(dir, { recursive: true })
            await fs.writeFile(originalPath, buffer)
          } else {
            throw new Error(`File not found: ${imageKey}`)
          }
        }

        const updatedEntry = await processImage(buffer, imageKey)
        updatedEntry.p = 1  // Mark as processed
        
        if (isInOurR2) {
          // Re-upload thumbnails to R2 and clean up local files
          updatedEntry.c = existingCdnIndex
          await uploadToCdn(imageKey)
          
          // Collect URLs to purge
          for (const thumbPath of getAllThumbnailPaths(imageKey)) {
            urlsToPurge.push(`${publicUrl}${thumbPath}`)
          }
          
          await deleteLocalThumbnails(imageKey)
          // Delete local original
          try { await fs.unlink(originalPath) } catch { /* ignore */ }
        } else if (isRemote) {
          // Remote image processed locally - remove c flag, now it's local
          // Keep the original and thumbnails locally
        }
        
        meta[imageKey] = updatedEntry
        processed.push(imageKey)
      } catch (error) {
        console.error(`Failed to reprocess ${imageKey}:`, error)
        errors.push(imageKey)
      }
    }

    await saveMeta(meta)
    
    // Purge Cloudflare cache for re-uploaded thumbnails
    if (urlsToPurge.length > 0) {
      await purgeCloudflareCache(urlsToPurge)
    }

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
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const meta = await loadMeta()
        const cdnUrls = getCdnUrls(meta)
        const processed: string[] = []
        const errors: string[] = []
        const orphansRemoved: string[] = []
        const urlsToPurge: string[] = []

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
          const existingCdnIndex = entry.c
          const existingCdnUrl = existingCdnIndex !== undefined ? cdnUrls[existingCdnIndex] : undefined
          
          // Determine if this is our R2 or a remote CDN
          const isInOurR2 = existingCdnUrl === publicUrl
          const isRemote = existingCdnIndex !== undefined && !isInOurR2
          
          sendEvent({ 
            type: 'progress', 
            current: i + 1, 
            total, 
            percent: Math.round(((i + 1) / total) * 100),
            currentFile: key.slice(1) // Remove leading /
          })

          try {
            let buffer: Buffer
            
            // Download from appropriate source
            if (isInOurR2) {
              buffer = await downloadFromCdn(key)
              const dir = path.dirname(fullPath)
              await fs.mkdir(dir, { recursive: true })
              await fs.writeFile(fullPath, buffer)
            } else if (isRemote && existingCdnUrl) {
              const remoteUrl = `${existingCdnUrl}${key}`
              buffer = await downloadFromRemoteUrl(remoteUrl)
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
              
              // Remote images become local after processing
              if (isRemote) {
                delete (meta[key] as import('../types').MetaEntry).c
              }
            } else {
              const processedEntry = await processImage(buffer, key)
              meta[key] = {
                ...processedEntry,
                p: 1,
                ...(isInOurR2 ? { c: existingCdnIndex } : {}),
              }
              // Remote images become local after processing (no c)
            }

            // If image was in our R2, upload new thumbnails and clean up local files
            if (isInOurR2) {
              await uploadToCdn(key)
              
              // Collect URLs to purge
              for (const thumbPath of getAllThumbnailPaths(key)) {
                urlsToPurge.push(`${publicUrl}${thumbPath}`)
              }
              
              await deleteLocalThumbnails(key)
              // Delete local original
              try { await fs.unlink(fullPath) } catch { /* ignore */ }
            }
            // Remote images stay local after processing (original + thumbnails)

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
            
            for (const fsEntry of entries) {
              if (fsEntry.name.startsWith('.')) continue

              const entryFullPath = path.join(dir, fsEntry.name)
              const relPath = relativePath ? `${relativePath}/${fsEntry.name}` : fsEntry.name

              if (fsEntry.isDirectory()) {
                await findOrphans(entryFullPath, relPath)
              } else if (isImageFile(fsEntry.name)) {
                const publicPath = `/images/${relPath}`
                if (!trackedPaths.has(publicPath)) {
                  try {
                    await fs.unlink(entryFullPath)
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

            for (const fsEntry of entries) {
              if (fsEntry.isDirectory()) {
                const subDirEmpty = await removeEmptyDirs(path.join(dir, fsEntry.name))
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
        
        // Purge Cloudflare cache for re-uploaded thumbnails
        if (urlsToPurge.length > 0) {
          await purgeCloudflareCache(urlsToPurge)
        }

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
