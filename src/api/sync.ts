import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import type { StudioMeta } from '../types'

/**
 * API route handler for syncing images to Cloudflare R2
 * Uploads to CDN and deletes local files
 * 
 * Usage in consuming project:
 * ```ts
 * // src/app/api/studio/sync/route.ts
 * export { POST } from '@gallop.software/studio/api/sync'
 * ```
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // Check R2 configuration
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

    // Load meta
    const metaPath = path.join(process.cwd(), '_data', '_meta.json')
    let meta: StudioMeta
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8')
      meta = JSON.parse(metaContent)
    } catch {
      return NextResponse.json({ error: 'Meta file not found' }, { status: 404 })
    }

    // Initialize R2 client
    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const synced: string[] = []
    const errors: string[] = []

    for (const imageKey of imageKeys) {
      const entry = meta.images[imageKey]
      if (!entry) {
        errors.push(`Image not found in meta: ${imageKey}`)
        continue
      }

      if (entry.cdn?.synced) {
        // Already synced
        synced.push(imageKey)
        continue
      }

      try {
        // Upload all sizes to R2
        for (const sizeData of Object.values(entry.sizes)) {
          const localPath = path.join(process.cwd(), 'public', sizeData.path)
          
          try {
            const fileBuffer = await fs.readFile(localPath)
            const contentType = getContentType(sizeData.path)

            await r2.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: sizeData.path.replace(/^\//, ''),
                Body: fileBuffer,
                ContentType: contentType,
              })
            )
          } catch (error) {
            console.error(`Failed to upload ${sizeData.path}:`, error)
            throw error
          }
        }

        // Update meta with CDN info
        entry.cdn = {
          synced: true,
          baseUrl: publicUrl,
          syncedAt: new Date().toISOString(),
        }

        // Delete local files
        for (const sizeData of Object.values(entry.sizes)) {
          const localPath = path.join(process.cwd(), 'public', sizeData.path)
          try {
            await fs.unlink(localPath)
          } catch {
            // File might already be deleted
          }
        }

        synced.push(imageKey)
      } catch (error) {
        console.error(`Failed to sync ${imageKey}:`, error)
        errors.push(imageKey)
      }
    }

    // Save updated meta
    meta.generatedAt = new Date().toISOString()
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))

    return NextResponse.json({
      success: true,
      synced,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to sync:', error)
    return NextResponse.json(
      { error: 'Failed to sync to CDN' },
      { status: 500 }
    )
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}
