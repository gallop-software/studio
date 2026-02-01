import { promises as fs } from 'fs'
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3'
import { getAllThumbnailPaths } from '../../types'
import { getContentType } from './files'
import { getPublicPath } from '../../config'

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 not configured')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export async function downloadFromCdn(originalPath: string): Promise<Buffer> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucketName) throw new Error('R2 bucket not configured')

  const r2 = getR2Client()
  const maxRetries = 3
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await r2.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: originalPath.replace(/^\//, ''),
        })
      )

      const stream = response.Body as NodeJS.ReadableStream
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
      }
      return Buffer.concat(chunks)
    } catch (error) {
      lastError = error as Error
      // Wait before retry (exponential backoff: 500ms, 1s)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error(`Failed to download ${originalPath} after ${maxRetries} attempts`)
}

export async function uploadToCdn(imageKey: string): Promise<void> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucketName) throw new Error('R2 bucket not configured')

  const r2 = getR2Client()

  // Upload all thumbnail sizes derived from imageKey
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
      // File might not exist (e.g., if image is smaller than thumbnail size)
    }
  }
}

export async function deleteLocalThumbnails(imageKey: string): Promise<void> {
  for (const thumbPath of getAllThumbnailPaths(imageKey)) {
    const localPath = getPublicPath(thumbPath)
    try {
      await fs.unlink(localPath)
    } catch {
      // File might not exist
    }
  }
}

/**
 * Download image from a remote URL (not R2)
 */
export async function downloadFromRemoteUrl(url: string): Promise<Buffer> {
  const maxRetries = 3
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download from ${url}: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      lastError = error as Error
      // Wait before retry (exponential backoff: 500ms, 1s)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error(`Failed to download from ${url} after ${maxRetries} attempts`)
}

/**
 * Upload original image to R2 CDN
 */
export async function uploadOriginalToCdn(imageKey: string): Promise<void> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucketName) throw new Error('R2 bucket not configured')

  const r2 = getR2Client()
  const localPath = getPublicPath(imageKey)
  const fileBuffer = await fs.readFile(localPath)
  
  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: imageKey.replace(/^\//, ''),
      Body: fileBuffer,
      ContentType: getContentType(imageKey),
    })
  )
}

/**
 * Delete original and thumbnails from R2 CDN
 */
export async function deleteFromCdn(imageKey: string, hasThumbnails: boolean): Promise<void> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucketName) throw new Error('R2 bucket not configured')

  const r2 = getR2Client()

  // Delete original
  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: imageKey.replace(/^\//, ''),
      })
    )
  } catch {
    // May not exist
  }

  // Delete thumbnails if they exist
  if (hasThumbnails) {
    for (const thumbPath of getAllThumbnailPaths(imageKey)) {
      try {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: thumbPath.replace(/^\//, ''),
          })
        )
      } catch {
        // May not exist
      }
    }
  }
}

/**
 * Delete only thumbnails from R2 CDN (keeps original)
 */
export async function deleteThumbnailsFromCdn(imageKey: string): Promise<void> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucketName) throw new Error('R2 bucket not configured')

  const r2 = getR2Client()

  for (const thumbPath of getAllThumbnailPaths(imageKey)) {
    try {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: thumbPath.replace(/^\//, ''),
        })
      )
    } catch {
      // May not exist
    }
  }
}

/**
 * Delete only original from R2 CDN (keeps thumbnails)
 * Used for cache busting before re-upload
 */
export async function deleteOriginalFromCdn(imageKey: string): Promise<void> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucketName) throw new Error('R2 bucket not configured')

  const r2 = getR2Client()

  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: imageKey.replace(/^\//, ''),
      })
    )
  } catch {
    // May not exist
  }
}

/**
 * Copy a file within R2 CDN (server-side, no download/upload)
 * Used for rename/move operations - much faster than download+upload
 */
export async function copyInCdn(oldKey: string, newKey: string): Promise<void> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucketName) throw new Error('R2 bucket not configured')

  const r2 = getR2Client()
  const oldKeyClean = oldKey.replace(/^\//, '')
  const newKeyClean = newKey.replace(/^\//, '')

  await r2.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${oldKeyClean}`,
      Key: newKeyClean,
    })
  )
}

/**
 * Move a file within R2 CDN (copy + delete, server-side)
 * Handles original and thumbnails
 */
export async function moveInCdn(oldKey: string, newKey: string, hasThumbnails: boolean): Promise<void> {
  // Copy original
  await copyInCdn(oldKey, newKey)
  
  // Copy thumbnails if they exist
  if (hasThumbnails) {
    const oldThumbPaths = getAllThumbnailPaths(oldKey)
    const newThumbPaths = getAllThumbnailPaths(newKey)
    
    for (let i = 0; i < oldThumbPaths.length; i++) {
      try {
        await copyInCdn(oldThumbPaths[i], newThumbPaths[i])
      } catch {
        // Thumbnail might not exist
      }
    }
  }
  
  // Delete old files
  await deleteFromCdn(oldKey, hasThumbnails)
}
