import { promises as fs } from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { jsonResponse } from './utils/response'
import { getAllThumbnailPaths, isProcessed } from '../types'
import {
  loadMeta,
  saveMeta,
  isImageFile,
  getContentType,
  processImage,
  downloadFromCdn,
  uploadToCdn,
  uploadOriginalToCdn,
  deleteLocalThumbnails,
  deleteThumbnailsFromCdn,
  deleteOriginalFromCdn,
  getOrAddCdnIndex,
  getFileEntries,
  getMetaEntry,
  getCdnUrls,
  downloadFromRemoteUrl,
} from './utils'
import { getPublicPath } from '../config'
import { deleteEmptyFolders, cleanupEmptyFoldersRecursive } from './utils/folders'

// Global cancellation tokens for streaming operations
const cancelledOperations = new Set<string>()

export function cancelOperation(operationId: string) {
  cancelledOperations.add(operationId)
  // Clean up after 60 seconds
  setTimeout(() => cancelledOperations.delete(operationId), 60000)
}

export function isOperationCancelled(operationId: string): boolean {
  return cancelledOperations.has(operationId)
}

export function clearCancelledOperation(operationId: string) {
  cancelledOperations.delete(operationId)
}

export async function handleSync(request: Request) {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return jsonResponse(
      { error: 'R2 not configured. Set CLOUDFLARE_R2_* environment variables.' },
      { status: 400 }
    )
  }

  try {
    const { imageKeys } = await request.json() as { imageKeys: string[] }

    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return jsonResponse({ error: 'No image keys provided' }, { status: 400 })
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
    const alreadyPushed: string[] = []
    const errors: string[] = []
    const sourceFolders = new Set<string>()

    for (let imageKey of imageKeys) {
      // Normalize key to have leading /
      if (!imageKey.startsWith('/')) {
        imageKey = `/${imageKey}`
      }
      
      const entry = getMetaEntry(meta, imageKey)
      if (!entry) {
        errors.push(`Image not found in meta: ${imageKey}. Run Scan first.`)
        continue
      }

      // Check if already pushed to our R2
      const existingCdnUrl = entry.c !== undefined ? cdnUrls[entry.c] : undefined
      const isAlreadyInOurR2 = existingCdnUrl === publicUrl
      
      if (isAlreadyInOurR2) {
        alreadyPushed.push(imageKey)
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
          const originalLocalPath = getPublicPath(imageKey)
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

        // Delete local files (only for non-remote, local images being pushed)
        if (!isRemote) {
          const originalLocalPath = getPublicPath(imageKey)
          
          // Track source folder for cleanup
          sourceFolders.add(path.dirname(originalLocalPath))
          
          // Delete local thumbnails
          for (const thumbPath of getAllThumbnailPaths(imageKey)) {
            const localPath = getPublicPath(thumbPath)
            // Track thumbnail folder too
            sourceFolders.add(path.dirname(localPath))
            try { await fs.unlink(localPath) } catch { /* ignore */ }
          }

          // Delete local original
          try { await fs.unlink(originalLocalPath) } catch { /* ignore */ }
        }

        // Save meta after each successful push
        await saveMeta(meta)

        pushed.push(imageKey)
      } catch (error) {
        console.error(`Failed to push ${imageKey}:`, error)
        errors.push(`Failed to push: ${imageKey}`)
      }
    }
    
    // Clean up empty source folders
    for (const folder of sourceFolders) {
      await deleteEmptyFolders(folder)
    }

    return jsonResponse({
      success: true,
      pushed,
      alreadyPushed: alreadyPushed.length > 0 ? alreadyPushed : undefined,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to push:', error)
    return jsonResponse({ error: 'Failed to push to CDN' }, { status: 500 })
  }
}

/**
 * Push files to CDN (streaming version with progress)
 * Handles local files, remote files, and already-pushed files
 */
export async function handleSyncStream(request: Request) {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Controller may be closed if client disconnected
        }
      }

      try {
        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
          sendEvent({ type: 'error', message: 'R2 not configured. Set CLOUDFLARE_R2_* environment variables.' })
          controller.close()
          return
        }

        const { imageKeys, operationId } = await request.json() as { imageKeys: string[], operationId?: string }

        if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
          sendEvent({ type: 'error', message: 'No image keys provided' })
          controller.close()
          return
        }

        // Helper to check if operation was cancelled
        const isCancelled = () => operationId ? isOperationCancelled(operationId) : false

        const meta = await loadMeta()
        const cdnUrls = getCdnUrls(meta)
        const cdnIndex = getOrAddCdnIndex(meta, publicUrl)

        const r2 = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        })

        const pushed: string[] = []
        const alreadyPushed: string[] = []
        const errors: string[] = []
        const sourceFolders = new Set<string>()
        const total = imageKeys.length

        sendEvent({ type: 'start', total })

        for (let i = 0; i < imageKeys.length; i++) {
          // Check for cancellation before each file
          if (isCancelled()) {
            await saveMeta(meta)
            // Clean up empty folders
            for (const folder of sourceFolders) {
              await deleteEmptyFolders(folder)
            }
            if (operationId) clearCancelledOperation(operationId)
            sendEvent({
              type: 'complete',
              pushed: pushed.length,
              alreadyPushed: alreadyPushed.length,
              errors: errors.length,
              message: `Stopped. ${pushed.length} file${pushed.length !== 1 ? 's' : ''} pushed.`,
              cancelled: true,
            })
            controller.close()
            return
          }

          let imageKey = imageKeys[i]
          // Normalize key to have leading /
          if (!imageKey.startsWith('/')) {
            imageKey = `/${imageKey}`
          }

          const entry = getMetaEntry(meta, imageKey)
          if (!entry) {
            errors.push(`Image not found in meta: ${imageKey}. Run Scan first.`)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total,
              pushed: pushed.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: path.basename(imageKey),
            })
            continue
          }

          // Check if already pushed to our R2
          const existingCdnUrl = entry.c !== undefined ? cdnUrls[entry.c] : undefined
          const isAlreadyInOurR2 = existingCdnUrl === publicUrl

          if (isAlreadyInOurR2) {
            alreadyPushed.push(imageKey)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total,
              pushed: pushed.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: path.basename(imageKey),
            })
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
              const originalLocalPath = getPublicPath(imageKey)
              try {
                originalBuffer = await fs.readFile(originalLocalPath)
              } catch {
                errors.push(`Original file not found: ${imageKey}`)
                sendEvent({
                  type: 'progress',
                  current: i + 1,
                  total,
                  pushed: pushed.length,
                  percent: Math.round(((i + 1) / total) * 100),
                  currentFile: path.basename(imageKey),
                })
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

            // Delete local files (only for non-remote, local images being pushed)
            if (!isRemote) {
              const originalLocalPath = getPublicPath(imageKey)

              // Track source folder for cleanup
              sourceFolders.add(path.dirname(originalLocalPath))

              // Delete local thumbnails
              for (const thumbPath of getAllThumbnailPaths(imageKey)) {
                const localPath = getPublicPath(thumbPath)
                sourceFolders.add(path.dirname(localPath))
                try { await fs.unlink(localPath) } catch { /* ignore */ }
              }

              // Delete local original
              try { await fs.unlink(originalLocalPath) } catch { /* ignore */ }
            }

            // Save meta after each successful push
            await saveMeta(meta)

            pushed.push(imageKey)
          } catch (error) {
            console.error(`Failed to push ${imageKey}:`, error)
            errors.push(`Failed to push: ${imageKey}`)
          }

          sendEvent({
            type: 'progress',
            current: i + 1,
            total,
            pushed: pushed.length,
            percent: Math.round(((i + 1) / total) * 100),
            currentFile: path.basename(imageKey),
          })
        }

        // Clean up empty source folders
        for (const folder of sourceFolders) {
          await deleteEmptyFolders(folder)
        }

        // Build completion message
        let message: string | undefined
        if (pushed.length === 0 && errors.length === 0) {
          message = `${alreadyPushed.length} file${alreadyPushed.length !== 1 ? 's' : ''} already on CDN. 0 new files pushed.`
        } else if (alreadyPushed.length > 0 && errors.length === 0) {
          message = `${pushed.length} file${pushed.length !== 1 ? 's' : ''} pushed. ${alreadyPushed.length} already on CDN.`
        }

        if (operationId) clearCancelledOperation(operationId)
        sendEvent({
          type: 'complete',
          pushed: pushed.length,
          alreadyPushed: alreadyPushed.length,
          errors: errors.length,
          errorMessages: errors.length > 0 ? errors : undefined,
          message,
        })
      } catch (error) {
        console.error('Failed to push:', error)
        sendEvent({ type: 'error', message: 'Failed to push to CDN' })
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

export async function handleReprocess(request: Request) {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')
  
  try {
    const { imageKeys } = await request.json() as { imageKeys: string[] }

    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return jsonResponse({ error: 'No image keys provided' }, { status: 400 })
    }

    const meta = await loadMeta()
    const cdnUrls = getCdnUrls(meta)
    const processed: string[] = []
    const errors: string[] = []

    for (let imageKey of imageKeys) {
      // Normalize key to have leading /
      if (!imageKey.startsWith('/')) {
        imageKey = `/${imageKey}`
      }
      
      try {
        let buffer: Buffer
        const entry = getMetaEntry(meta, imageKey)
        const existingCdnIndex = entry?.c
        const existingCdnUrl = existingCdnIndex !== undefined ? cdnUrls[existingCdnIndex] : undefined
        
        // Determine if this is our R2 or a remote CDN
        const isInOurR2 = existingCdnUrl === publicUrl
        const isRemote = existingCdnIndex !== undefined && !isInOurR2
        
        const originalPath = getPublicPath(imageKey)
        
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
        // No need to set p flag - presence of thumbnail dims (sm/md/lg/f) indicates processed
        
        if (isInOurR2) {
          // Re-upload to R2 and clean up local files
          updatedEntry.c = existingCdnIndex
          // Delete original and thumbnails from CDN first to clear cache
          await deleteOriginalFromCdn(imageKey)
          await deleteThumbnailsFromCdn(imageKey)
          // Re-upload original and thumbnails
          await uploadOriginalToCdn(imageKey)
          await uploadToCdn(imageKey)
          
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

    return jsonResponse({
      success: true,
      processed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to reprocess:', error)
    return jsonResponse({ error: 'Failed to reprocess images' }, { status: 500 })
  }
}

export async function handleUnprocessStream(request: Request) {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')
  const encoder = new TextEncoder()
  
  // Parse the request body before creating the stream
  let imageKeys: string[]
  let operationId: string | undefined
  try {
    const body = await request.json() as { imageKeys: string[], operationId?: string }
    imageKeys = body.imageKeys
    operationId = body.operationId
    
    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return jsonResponse({ error: 'No image keys provided' }, { status: 400 })
    }
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, { status: 400 })
  }
  
  // Helper to check if operation was cancelled
  const isCancelled = () => operationId ? isOperationCancelled(operationId) : false
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const meta = await loadMeta()
        const cdnUrls = getCdnUrls(meta)
        const removed: string[] = []
        const skipped: string[] = []
        const errors: string[] = []

        const total = imageKeys.length
        sendEvent({ type: 'start', total })

        for (let i = 0; i < imageKeys.length; i++) {
          // Check for cancellation before each image
          if (isCancelled()) {
            await saveMeta(meta)
            if (operationId) clearCancelledOperation(operationId)
            sendEvent({ type: 'complete', processed: removed.length, errors: errors.length, message: `Stopped. Removed thumbnails for ${removed.length} image${removed.length !== 1 ? 's' : ''}.`, cancelled: true })
            controller.close()
            return
          }
          
          let imageKey = imageKeys[i]
          
          // Normalize key to have leading /
          if (!imageKey.startsWith('/')) {
            imageKey = `/${imageKey}`
          }

          try {
            const entry = getMetaEntry(meta, imageKey)
            if (!entry) {
              errors.push(imageKey)
              sendEvent({ 
                type: 'progress', 
                current: i + 1, 
                total, 
                processed: removed.length,
                percent: Math.round(((i + 1) / total) * 100),
                message: `Error: ${imageKey.slice(1)}`
              })
              continue
            }
            
            // Check if this image has any thumbnails
            const hasThumbnails = entry.sm || entry.md || entry.lg || entry.f
            if (!hasThumbnails) {
              skipped.push(imageKey)
              sendEvent({ 
                type: 'progress', 
                current: i + 1, 
                total, 
                processed: removed.length,
                percent: Math.round(((i + 1) / total) * 100),
                message: `Skipped ${imageKey.slice(1)} (no thumbnails)`
              })
              continue
            }
            
            const existingCdnIndex = entry.c
            const existingCdnUrl = existingCdnIndex !== undefined ? cdnUrls[existingCdnIndex] : undefined
            const isInOurR2 = existingCdnUrl === publicUrl
            
            // Delete local thumbnails
            await deleteLocalThumbnails(imageKey)
            
            // Delete cloud thumbnails if in our R2
            if (isInOurR2) {
              await deleteThumbnailsFromCdn(imageKey)
            }
            
            // Update meta - keep o, b, c but remove thumbnail dimensions
            meta[imageKey] = {
              o: entry.o,
              b: entry.b,
              ...(entry.c !== undefined ? { c: entry.c } : {}),
            }
            
            // Save meta after each successful removal
            await saveMeta(meta)
            
            removed.push(imageKey)
            sendEvent({ 
              type: 'progress', 
              current: i + 1, 
              total, 
              processed: removed.length,
              percent: Math.round(((i + 1) / total) * 100),
              message: `Removed thumbnails for ${imageKey.slice(1)}`
            })
          } catch (error) {
            console.error(`Failed to unprocess ${imageKey}:`, error)
            errors.push(imageKey)
            sendEvent({ 
              type: 'progress', 
              current: i + 1, 
              total, 
              processed: removed.length,
              percent: Math.round(((i + 1) / total) * 100),
              message: `Failed: ${imageKey.slice(1)}`
            })
          }
        }

        sendEvent({ type: 'cleanup', message: 'Saving metadata...' })
        await saveMeta(meta)

        // Clean up empty folders in the images directory
        sendEvent({ type: 'cleanup', message: 'Cleaning up empty folders...' })
        
        const imagesDir = getPublicPath('images')
        try {
          await cleanupEmptyFoldersRecursive(imagesDir)
        } catch {
          // images dir might not exist
        }

        // Build completion message
        let message = `Removed thumbnails from ${removed.length} image${removed.length !== 1 ? 's' : ''}.`
        if (skipped.length > 0) {
          message += ` ${skipped.length} image${skipped.length !== 1 ? 's' : ''} had no thumbnails.`
        }
        if (errors.length > 0) {
          message += ` ${errors.length} image${errors.length !== 1 ? 's' : ''} failed.`
        }

        sendEvent({ 
          type: 'complete', 
          processed: removed.length,
          skipped: skipped.length,
          errors: errors.length,
          message
        })
        
        controller.close()
      } catch (error) {
        console.error('Unprocess stream error:', error)
        sendEvent({ type: 'error', message: 'Failed to remove thumbnails' })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function handleReprocessStream(request: Request) {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/\s*$/, '')
  const encoder = new TextEncoder()
  
  // Parse the request body before creating the stream
  let imageKeys: string[]
  let operationId: string | undefined
  try {
    const body = await request.json() as { imageKeys: string[], operationId?: string }
    imageKeys = body.imageKeys
    operationId = body.operationId
    
    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return jsonResponse({ error: 'No image keys provided' }, { status: 400 })
    }
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, { status: 400 })
  }
  
  // Helper to check if operation was cancelled
  const isCancelled = () => operationId ? isOperationCancelled(operationId) : false
  
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

        const total = imageKeys.length
        sendEvent({ type: 'start', total })

        for (let i = 0; i < imageKeys.length; i++) {
          // Check for cancellation before each image
          if (isCancelled()) {
            await saveMeta(meta)
            if (operationId) clearCancelledOperation(operationId)
            sendEvent({ type: 'complete', processed: processed.length, errors: errors.length, message: `Stopped. Generated thumbnails for ${processed.length} image${processed.length !== 1 ? 's' : ''}.`, cancelled: true })
            controller.close()
            return
          }
          
          let imageKey = imageKeys[i]
          
          // Normalize key to have leading /
          if (!imageKey.startsWith('/')) {
            imageKey = `/${imageKey}`
          }

          try {
            let buffer: Buffer
            const entry = getMetaEntry(meta, imageKey)
            const existingCdnIndex = entry?.c
            const existingCdnUrl = existingCdnIndex !== undefined ? cdnUrls[existingCdnIndex] : undefined
            
            // Determine if this is our R2 or a remote CDN
            const isInOurR2 = existingCdnUrl === publicUrl
            const isRemote = existingCdnIndex !== undefined && !isInOurR2
            
            const originalPath = getPublicPath(imageKey)
            
            try {
              buffer = await fs.readFile(originalPath)
            } catch {
              if (isInOurR2) {
                buffer = await downloadFromCdn(imageKey)
                const dir = path.dirname(originalPath)
                await fs.mkdir(dir, { recursive: true })
                await fs.writeFile(originalPath, buffer)
              } else if (isRemote && existingCdnUrl) {
                const remoteUrl = `${existingCdnUrl}${imageKey}`
                buffer = await downloadFromRemoteUrl(remoteUrl)
                const dir = path.dirname(originalPath)
                await fs.mkdir(dir, { recursive: true })
                await fs.writeFile(originalPath, buffer)
              } else {
                throw new Error(`File not found: ${imageKey}`)
              }
            }

            const ext = path.extname(imageKey).toLowerCase()
            const isSvg = ext === '.svg'

            if (isSvg) {
              const imageDir = path.dirname(imageKey.slice(1))
              const imagesPath = getPublicPath('images', imageDir === '.' ? '' : imageDir)
              await fs.mkdir(imagesPath, { recursive: true })
              
              const fileName = path.basename(imageKey)
              const destPath = path.join(imagesPath, fileName)
              await fs.writeFile(destPath, buffer)

              meta[imageKey] = {
                ...entry,
                o: { w: 0, h: 0 },
                b: '',
                f: { w: 0, h: 0 },
              }
              
              if (isRemote) {
                delete (meta[imageKey] as import('../types').MetaEntry).c
              }
            } else {
              const updatedEntry = await processImage(buffer, imageKey)
              
              if (isInOurR2) {
                updatedEntry.c = existingCdnIndex
                // Delete original and thumbnails from CDN first to clear cache
                await deleteOriginalFromCdn(imageKey)
                await deleteThumbnailsFromCdn(imageKey)
                // Re-upload original and thumbnails
                await uploadOriginalToCdn(imageKey)
                await uploadToCdn(imageKey)
                
                await deleteLocalThumbnails(imageKey)
                try { await fs.unlink(originalPath) } catch { /* ignore */ }
              }
              
              meta[imageKey] = updatedEntry
            }
            
            // Save meta after each successful process
            await saveMeta(meta)
            
            processed.push(imageKey)
            sendEvent({ 
              type: 'progress', 
              current: i + 1, 
              total, 
              processed: processed.length,
              percent: Math.round(((i + 1) / total) * 100),
              message: `Processed ${imageKey.slice(1)}`
            })
          } catch (error) {
            console.error(`Failed to reprocess ${imageKey}:`, error)
            errors.push(imageKey)
            sendEvent({ 
              type: 'progress', 
              current: i + 1, 
              total, 
              processed: processed.length,
              percent: Math.round(((i + 1) / total) * 100),
              message: `Failed: ${imageKey.slice(1)}`
            })
          }
        }

        sendEvent({ type: 'cleanup', message: 'Saving metadata...' })
        await saveMeta(meta)

        // Build completion message
        let message = `Generated thumbnails for ${processed.length} image${processed.length !== 1 ? 's' : ''}.`
        if (errors.length > 0) {
          message += ` ${errors.length} image${errors.length !== 1 ? 's' : ''} failed.`
        }

        sendEvent({ 
          type: 'complete', 
          processed: processed.length,
          errors: errors.length,
          message
        })
        
        controller.close()
      } catch (error) {
        console.error('Reprocess stream error:', error)
        sendEvent({ type: 'error', message: 'Failed to generate thumbnails' })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
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

        // Count images in different states
        let alreadyProcessed = 0

        // Get all images from meta that need processing (no p flag = not processed yet)
        const imagesToProcess: Array<{ key: string; entry: import('../types').MetaEntry }> = []
        
        for (const [key, entry] of getFileEntries(meta)) {
          const fileName = path.basename(key)
          if (!isImageFile(fileName)) continue
          
          // Check if needs processing (no thumbnail dims = not processed yet)
          if (!isProcessed(entry)) {
            imagesToProcess.push({ key, entry })
          } else {
            alreadyProcessed++
          }
        }

        const total = imagesToProcess.length
        sendEvent({ type: 'start', total })

        for (let i = 0; i < imagesToProcess.length; i++) {
          const { key, entry } = imagesToProcess[i]
          const fullPath = getPublicPath(key)
          const existingCdnIndex = entry.c
          const existingCdnUrl = existingCdnIndex !== undefined ? cdnUrls[existingCdnIndex] : undefined
          
          // Determine if this is our R2 or a remote CDN
          const isInOurR2 = existingCdnUrl === publicUrl
          const isRemote = existingCdnIndex !== undefined && !isInOurR2

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
              const imagesPath = getPublicPath('images', imageDir === '.' ? '' : imageDir)
              await fs.mkdir(imagesPath, { recursive: true })
              
              const fileName = path.basename(key)
              const destPath = path.join(imagesPath, fileName)
              await fs.writeFile(destPath, buffer)

              meta[key] = {
                ...entry,
                o: { w: 0, h: 0 },
                b: '',
                f: { w: 0, h: 0 },  // SVG has "full" to indicate processed
              }
              
              // Remote images become local after processing
              if (isRemote) {
                delete (meta[key] as import('../types').MetaEntry).c
              }
            } else {
              const processedEntry = await processImage(buffer, key)
              meta[key] = {
                ...processedEntry,
                ...(isInOurR2 ? { c: existingCdnIndex } : {}),
              }
              // Remote images become local after processing (no c)
            }

            // If image was in our R2, re-upload original + thumbnails and clean up local files
            if (isInOurR2) {
              // Delete original and thumbnails from CDN first to clear cache
              await deleteOriginalFromCdn(key)
              await deleteThumbnailsFromCdn(key)
              // Re-upload original and thumbnails
              await uploadOriginalToCdn(key)
              await uploadToCdn(key)
              
              await deleteLocalThumbnails(key)
              // Delete local original
              try { await fs.unlink(fullPath) } catch { /* ignore */ }
            }
            // Remote images stay local after processing (original + thumbnails)

            processed.push(key.slice(1))
            sendEvent({ 
              type: 'progress', 
              current: i + 1, 
              total, 
              processed: processed.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: key.slice(1)
            })
          } catch (error) {
            console.error(`Failed to process ${key}:`, error)
            errors.push(key.slice(1))
            sendEvent({ 
              type: 'progress', 
              current: i + 1, 
              total, 
              processed: processed.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: key.slice(1),
              message: `Failed: ${key.slice(1)}`
            })
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

        const imagesDir = getPublicPath('images')
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

/**
 * Download images from R2 CDN to local storage (streaming)
 * This removes the images from R2 and stores them locally
 */
export async function handleDownloadStream(request: Request) {
  const { imageKeys, operationId } = await request.json() as { imageKeys: string[], operationId?: string }

  if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
    return jsonResponse({ error: 'No image keys provided' }, { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const sendEvent = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Controller may be closed if client disconnected
        }
      }

      sendEvent({ type: 'start', total: imageKeys.length })

      const downloaded: string[] = []
      const skipped: string[] = []
      const errors: string[] = []

      // Helper to check if operation was cancelled
      const isCancelled = () => operationId ? isOperationCancelled(operationId) : false

      try {
        const meta = await loadMeta()

        for (let i = 0; i < imageKeys.length; i++) {
          // Check if operation was cancelled
          if (isCancelled()) {
            // Save meta with what we've done so far
            await saveMeta(meta)
            if (operationId) clearCancelledOperation(operationId)
            sendEvent({
              type: 'complete',
              downloaded: downloaded.length,
              message: `Stopped. ${downloaded.length} image${downloaded.length !== 1 ? 's' : ''} downloaded.`,
              cancelled: true,
            })
            controller.close()
            return
          }

          const imageKey = imageKeys[i]
          const entry = getMetaEntry(meta, imageKey)
          
          if (!entry || entry.c === undefined) {
            skipped.push(imageKey)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total: imageKeys.length,
              downloaded: downloaded.length,
              message: `Skipped ${imageKey} (not on cloud)`,
            })
            continue
          }

          try {
            // Download original from R2
            const imageBuffer = await downloadFromCdn(imageKey)
            
            // Check again after download (long operation)
            if (isCancelled()) {
              await saveMeta(meta)
              if (operationId) clearCancelledOperation(operationId)
              sendEvent({
                type: 'complete',
                downloaded: downloaded.length,
                message: `Stopped. ${downloaded.length} image${downloaded.length !== 1 ? 's' : ''} downloaded.`,
                cancelled: true,
              })
              controller.close()
              return
            }
            
            // Ensure directory exists
            const localPath = getPublicPath(imageKey.replace(/^\//, ''))
            await fs.mkdir(path.dirname(localPath), { recursive: true })
            
            // Write to local filesystem
            await fs.writeFile(localPath, imageBuffer)
            
            // Delete original and thumbnails from R2
            await deleteOriginalFromCdn(imageKey)
            await deleteThumbnailsFromCdn(imageKey)
            
            // Check if image was processed (has thumbnails)
            const wasProcessed = isProcessed(entry)
            
            // Remove the c property (no longer on CDN)
            delete entry.c
            
            // If it was processed, regenerate thumbnails locally
            if (wasProcessed) {
              const processedEntry = await processImage(imageBuffer, imageKey)
              // Update dimensions in meta
              entry.sm = processedEntry.sm
              entry.md = processedEntry.md
              entry.lg = processedEntry.lg
              entry.f = processedEntry.f
            }
            
            // Save meta after each successful download
            await saveMeta(meta)
            
            downloaded.push(imageKey)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total: imageKeys.length,
              downloaded: downloaded.length,
              message: `Downloaded ${imageKey}`,
            })
          } catch (error) {
            console.error(`Failed to download ${imageKey}:`, error)
            errors.push(imageKey)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total: imageKeys.length,
              downloaded: downloaded.length,
              message: `Failed to download ${imageKey}`,
            })
          }
        }

        await saveMeta(meta)

        // Build completion message
        let message = `Downloaded ${downloaded.length} image${downloaded.length !== 1 ? 's' : ''}.`
        if (skipped.length > 0) {
          message += ` ${skipped.length} image${skipped.length !== 1 ? 's were' : ' was'} not on cloud.`
        }
        if (errors.length > 0) {
          message += ` ${errors.length} image${errors.length !== 1 ? 's' : ''} failed.`
        }

        sendEvent({
          type: 'complete',
          downloaded: downloaded.length,
          skipped: skipped.length,
          errors: errors.length,
          message,
        })
      } catch (error) {
        console.error('Download stream error:', error)
        sendEvent({ type: 'error', message: 'Failed to download images' })
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

/**
 * Push pending updates to cloud (replace cloud files with local versions)
 * Streaming handler for progress feedback
 */
export async function handlePushUpdatesStream(request: Request) {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '')

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
          sendEvent({ type: 'error', message: 'R2 not configured' })
          controller.close()
          return
        }

        const { paths: inputPaths, operationId } = await request.json() as { paths: string[], operationId?: string }
        
        if (!inputPaths || !Array.isArray(inputPaths) || inputPaths.length === 0) {
          sendEvent({ type: 'error', message: 'No paths provided' })
          controller.close()
          return
        }

        // Helper to check if operation was cancelled
        const isCancelled = () => operationId ? isOperationCancelled(operationId) : false

        const s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        })

        const meta = await loadMeta()
        const cdnUrls = getCdnUrls(meta)
        const r2PublicUrl = publicUrl.replace(/\/$/, '')

        // Expand folder paths to individual file paths with pending updates
        const paths: string[] = []
        for (const inputPath of inputPaths) {
          const key = inputPath.startsWith('public/') ? '/' + inputPath.slice(7) : inputPath
          // Check if this is a folder path (no extension or ends without extension-like pattern)
          const isFolder = !key.match(/\.[a-zA-Z0-9]+$/)
          
          if (isFolder) {
            // Find all files in meta that start with this folder path and have u: 1
            const folderPrefix = key.endsWith('/') ? key : key + '/'
            for (const [metaKey, entry] of Object.entries(meta)) {
              if (metaKey.startsWith(folderPrefix) && entry && typeof entry === 'object' && 'u' in entry && entry.u === 1) {
                paths.push(metaKey)
              }
            }
          } else {
            paths.push(inputPath)
          }
        }
        
        const pushed: string[] = []
        const skipped: string[] = []
        const errors: string[] = []
        const total = paths.length

        if (total === 0) {
          sendEvent({ type: 'complete', pushed: 0, message: 'No files with pending updates found.' })
          controller.close()
          return
        }

        sendEvent({ type: 'start', total })

        for (let i = 0; i < paths.length; i++) {
          // Check for cancellation before each file
          if (isCancelled()) {
            await saveMeta(meta)
            if (operationId) clearCancelledOperation(operationId)
            sendEvent({ type: 'complete', pushed: pushed.length, message: `Stopped. ${pushed.length} file${pushed.length !== 1 ? 's' : ''} pushed.`, cancelled: true })
            controller.close()
            return
          }
          const itemPath = paths[i]
          const key = itemPath.startsWith('public/') ? '/' + itemPath.slice(7) : itemPath
          const entry = meta[key] as { c?: number; u?: 1; o?: { w: number; h: number }; b?: string; sm?: object; md?: object; lg?: object; f?: object } | undefined

          if (!entry || entry.u !== 1) {
            skipped.push(key)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total,
              pushed: pushed.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: path.basename(key),
            })
            continue
          }

          // Check if this is an R2 file
          const fileCdnUrl = entry.c !== undefined ? cdnUrls[entry.c]?.replace(/\/$/, '') : undefined
          if (!fileCdnUrl || fileCdnUrl !== r2PublicUrl) {
            skipped.push(key)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total,
              pushed: pushed.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: path.basename(key),
            })
            continue
          }

          try {
            // Read the local file
            const localPath = getPublicPath(key)
            const buffer = await fs.readFile(localPath)
            const contentType = getContentType(path.basename(key))

            // Delete from CDN first to clear cache
            const uploadKey = key.startsWith('/') ? key.slice(1) : key
            try {
              await s3.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: uploadKey,
              }))
            } catch {
              // Ignore delete errors - file might not exist
            }

            // Upload to R2
            await s3.send(new PutObjectCommand({
              Bucket: bucketName,
              Key: uploadKey,
              Body: buffer,
              ContentType: contentType,
            }))

            // If image is processed, also update thumbnails
            if (isProcessed(entry)) {
              // Delete existing thumbnails from CDN first
              await deleteThumbnailsFromCdn(key)
              
              // Re-process to generate new thumbnails from local file
              const processedEntry = await processImage(buffer, key)
              Object.assign(entry, processedEntry)
              
              // Upload thumbnails
              await uploadToCdn(key)
              
              // Delete local thumbnails
              await deleteLocalThumbnails(key)
            }

            // Delete local file (it's now on cloud)
            await fs.unlink(localPath)

            // Remove the update flag
            delete entry.u
            
            // Save meta after each successful push
            await saveMeta(meta)

            pushed.push(key)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total,
              pushed: pushed.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: path.basename(key),
            })
          } catch (error) {
            console.error(`Failed to push update for ${key}:`, error)
            errors.push(key)
            sendEvent({
              type: 'progress',
              current: i + 1,
              total,
              pushed: pushed.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: path.basename(key),
              message: `Failed: ${path.basename(key)}`,
            })
          }
        }

        // Clean up empty folders
        sendEvent({ type: 'cleanup', message: 'Cleaning up...' })
        for (const itemPath of pushed) {
          const localPath = getPublicPath(itemPath)
          await deleteEmptyFolders(path.dirname(localPath))
        }

        await saveMeta(meta)

        let message = `Pushed ${pushed.length} update${pushed.length !== 1 ? 's' : ''} to cloud.`
        if (skipped.length > 0) {
          message += ` ${skipped.length} file${skipped.length !== 1 ? 's' : ''} skipped.`
        }
        if (errors.length > 0) {
          message += ` ${errors.length} file${errors.length !== 1 ? 's' : ''} failed.`
        }

        sendEvent({
          type: 'complete',
          pushed: pushed.length,
          skipped: skipped.length,
          errors: errors.length,
          message,
        })
      } catch (error) {
        console.error('Push updates error:', error)
        sendEvent({ type: 'error', message: 'Failed to push updates' })
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

/**
 * Cancel a streaming operation (download, push, etc.)
 */
export async function handleCancelStreamOperation(request: Request) {
  try {
    const { operationId } = await request.json()
    
    if (!operationId || typeof operationId !== 'string') {
      return jsonResponse({ error: 'No operation ID provided' }, { status: 400 })
    }

    cancelOperation(operationId)
    
    return jsonResponse({ success: true, operationId })
  } catch (error) {
    console.error('Failed to cancel operation:', error)
    return jsonResponse({ error: 'Failed to cancel operation' }, { status: 500 })
  }
}

/**
 * Cancel pending updates (delete local files, keep cloud versions)
 */
export async function handleCancelUpdates(request: Request) {
  try {
    const { paths: inputPaths } = await request.json()
    
    if (!inputPaths || !Array.isArray(inputPaths) || inputPaths.length === 0) {
      return jsonResponse({ error: 'No paths provided' }, { status: 400 })
    }

    const meta = await loadMeta()

    // Expand folder paths to individual file paths with pending updates
    const paths: string[] = []
    for (const inputPath of inputPaths) {
      const key = inputPath.startsWith('public/') ? '/' + inputPath.slice(7) : inputPath
      // Check if this is a folder path (no extension or ends without extension-like pattern)
      const isFolder = !key.match(/\.[a-zA-Z0-9]+$/)
      
      if (isFolder) {
        // Find all files in meta that start with this folder path and have u: 1
        const folderPrefix = key.endsWith('/') ? key : key + '/'
        for (const [metaKey, entry] of Object.entries(meta)) {
          if (metaKey.startsWith(folderPrefix) && entry && typeof entry === 'object' && 'u' in entry && entry.u === 1) {
            paths.push(metaKey)
          }
        }
      } else {
        paths.push(inputPath)
      }
    }

    const cancelled: string[] = []
    const skipped: string[] = []
    const errors: string[] = []
    const foldersToClean = new Set<string>()

    for (const itemPath of paths) {
      const key = itemPath.startsWith('public/') ? '/' + itemPath.slice(7) : itemPath
      const entry = meta[key] as { u?: 1 } | undefined

      if (!entry || entry.u !== 1) {
        skipped.push(key)
        continue
      }

      try {
        // Delete the local file
        const localPath = getPublicPath(key)
        await fs.unlink(localPath)
        
        // Track folder for cleanup
        foldersToClean.add(path.dirname(localPath))

        // Remove the update flag
        delete entry.u

        cancelled.push(key)
      } catch (error) {
        console.error(`Failed to cancel update for ${key}:`, error)
        errors.push(key)
      }
    }

    // Clean up empty folders
    for (const folder of foldersToClean) {
      await deleteEmptyFolders(folder)
    }

    await saveMeta(meta)

    return jsonResponse({
      success: true,
      cancelled: cancelled.length,
      skipped: skipped.length,
      errors: errors.length,
    })
  } catch (error) {
    console.error('Cancel updates error:', error)
    return jsonResponse({ error: 'Failed to cancel updates' }, { status: 500 })
  }
}
