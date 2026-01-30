import { NextRequest } from 'next/server'
import sharp from 'sharp'
import { encode } from 'blurhash'
import {
  loadMeta,
  saveMeta,
  getOrAddCdnIndex,
  getMetaEntry,
  setMetaEntry,
} from './utils'
import type { Dimensions } from '../types'

/**
 * Parse an image URL into base URL and path
 */
function parseImageUrl(url: string): { base: string; path: string } {
  const parsed = new URL(url)
  // Base is protocol + host
  const base = `${parsed.protocol}//${parsed.host}`
  // Path is everything after
  const path = parsed.pathname
  return { base, path }
}

/**
 * Fetch remote image and get dimensions + blurhash
 */
async function processRemoteImage(url: string): Promise<{ o: Dimensions; b: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }
  
  const buffer = Buffer.from(await response.arrayBuffer())
  
  const metadata = await sharp(buffer).metadata()
  
  // Generate blurhash
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  
  const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)
  
  return {
    o: { w: metadata.width || 0, h: metadata.height || 0 },
    b: blurhash,
  }
}

/**
 * Streaming endpoint to import images from URLs
 */
export async function handleImportUrls(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const { urls } = await request.json() as { urls: string[] }
        
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          sendEvent({ type: 'error', message: 'No URLs provided' })
          controller.close()
          return
        }

        const meta = await loadMeta()
        const added: string[] = []
        const skipped: string[] = []
        const errors: string[] = []

        const total = urls.length
        sendEvent({ type: 'start', total })

        for (let i = 0; i < urls.length; i++) {
          const url = urls[i].trim()
          if (!url) continue
          
          sendEvent({
            type: 'progress',
            current: i + 1,
            total,
            percent: Math.round(((i + 1) / total) * 100),
            currentFile: url,
          })

          try {
            // Parse URL to get base and path
            const { base, path } = parseImageUrl(url)
            
            // Check if this path already exists in meta
            const existingEntry = getMetaEntry(meta, path)
            if (existingEntry) {
              skipped.push(path)
              continue
            }
            
            // Get or add CDN URL to _cdns array
            const cdnIndex = getOrAddCdnIndex(meta, base)
            
            // Fetch and process the image
            const imageData = await processRemoteImage(url)
            
            // Add entry to meta
            // Note: No thumbnail dims since this is an external image, not processed locally
            setMetaEntry(meta, path, {
              o: imageData.o,
              b: imageData.b,
              c: cdnIndex,
            })
            
            added.push(path)
          } catch (error) {
            console.error(`Failed to import ${url}:`, error)
            errors.push(url)
          }
        }

        await saveMeta(meta)

        sendEvent({
          type: 'complete',
          added: added.length,
          skipped: skipped.length,
          errors: errors.length,
        })
      } catch (error) {
        console.error('Import failed:', error)
        sendEvent({ type: 'error', message: 'Import failed' })
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
 * Get CDN URLs for settings
 */
export async function handleGetCdns() {
  try {
    const meta = await loadMeta()
    const cdns = meta._cdns || []
    
    return Response.json({ cdns })
  } catch (error) {
    console.error('Failed to get CDNs:', error)
    return Response.json({ error: 'Failed to get CDNs' }, { status: 500 })
  }
}

/**
 * Update CDN URLs from settings
 */
export async function handleUpdateCdns(request: NextRequest) {
  try {
    const { cdns } = await request.json() as { cdns: string[] }
    
    if (!Array.isArray(cdns)) {
      return Response.json({ error: 'Invalid CDN array' }, { status: 400 })
    }
    
    const meta = await loadMeta()
    
    // Normalize URLs (remove trailing slashes)
    meta._cdns = cdns.map(url => url.replace(/\/$/, ''))
    
    await saveMeta(meta)
    
    return Response.json({ success: true, cdns: meta._cdns })
  } catch (error) {
    console.error('Failed to update CDNs:', error)
    return Response.json({ error: 'Failed to update CDNs' }, { status: 500 })
  }
}
