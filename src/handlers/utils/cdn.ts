import { promises as fs } from 'fs'
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getAllThumbnailPaths } from '../../types'
import { getContentType } from './files'
import { getPublicPath } from '../../config'

/**
 * Purge URLs from Cloudflare cache
 * Requires CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN environment variables
 */
export async function purgeCloudflareCache(urls: string[]): Promise<void> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  
  if (!zoneId || !apiToken || urls.length === 0) {
    return // Cache purge not configured or no URLs to purge
  }
  
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    )
    
    if (!response.ok) {
      console.error('Cache purge failed:', await response.text())
    }
  } catch (error) {
    console.error('Cache purge error:', error)
  }
}

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
