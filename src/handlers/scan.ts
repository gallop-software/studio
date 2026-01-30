import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { encode } from 'blurhash'
import { loadMeta, saveMeta, isMediaFile, isImageFile } from './utils'

/**
 * Streaming scan handler - scans filesystem for new files not in meta
 * For images, reads dimensions (w/h)
 * Handles collisions by renaming files with -1, -2, etc.
 */
export async function handleScanStream() {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const meta = await loadMeta()
        const existingCount = Object.keys(meta).length
        const existingKeys = new Set(Object.keys(meta))
        const added: string[] = []
        const renamed: Array<{ from: string; to: string }> = []
        const errors: string[] = []

        // Collect all files first
        const allFiles: Array<{ relativePath: string; fullPath: string }> = []

        async function scanDir(dir: string, relativePath: string = ''): Promise<void> {
          try {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            
            for (const entry of entries) {
              if (entry.name.startsWith('.')) continue
              
              const fullPath = path.join(dir, entry.name)
              const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

              // Skip the images folder (generated thumbnails)
              if (relPath === 'images' || relPath.startsWith('images/')) continue

              if (entry.isDirectory()) {
                await scanDir(fullPath, relPath)
              } else if (isMediaFile(entry.name)) {
                allFiles.push({ relativePath: relPath, fullPath })
              }
            }
          } catch {
            // Directory might not exist
          }
        }

        const publicDir = path.join(process.cwd(), 'public')
        await scanDir(publicDir)

        const total = allFiles.length
        sendEvent({ type: 'start', total })

        for (let i = 0; i < allFiles.length; i++) {
          let { relativePath, fullPath } = allFiles[i]
          let imageKey = '/' + relativePath
          
          sendEvent({ 
            type: 'progress', 
            current: i + 1, 
            total, 
            percent: Math.round(((i + 1) / total) * 100),
            currentFile: relativePath 
          })

          // Check if already in meta
          if (existingKeys.has(imageKey)) {
            // File already tracked - skip
            continue
          }

          // Check for collision (path exists in meta but file is new)
          if (meta[imageKey]) {
            // Need to rename this file to avoid collision
            const ext = path.extname(relativePath)
            const baseName = relativePath.slice(0, -ext.length)
            let counter = 1
            let newKey = `/${baseName}-${counter}${ext}`
            
            while (meta[newKey]) {
              counter++
              newKey = `/${baseName}-${counter}${ext}`
            }
            
            // Rename the physical file
            const newRelativePath = `${baseName}-${counter}${ext}`
            const newFullPath = path.join(process.cwd(), 'public', newRelativePath)
            
            try {
              await fs.rename(fullPath, newFullPath)
              renamed.push({ from: relativePath, to: newRelativePath })
              relativePath = newRelativePath
              fullPath = newFullPath
              imageKey = newKey
            } catch (err) {
              console.error(`Failed to rename ${relativePath}:`, err)
              errors.push(`Failed to rename ${relativePath}`)
              continue
            }
          }

          try {
            const isImage = isImageFile(relativePath)
            
            if (isImage) {
              // Read dimensions and generate blurhash for images
              const ext = path.extname(relativePath).toLowerCase()
              
              if (ext === '.svg') {
                // SVGs don't have pixel dimensions in the same way
                meta[imageKey] = { w: 0, h: 0, b: '' }
              } else {
                try {
                  const buffer = await fs.readFile(fullPath)
                  const metadata = await sharp(buffer).metadata()
                  
                  // Generate blurhash
                  const { data, info } = await sharp(buffer)
                    .resize(32, 32, { fit: 'inside' })
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true })
                  
                  const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)
                  
                  meta[imageKey] = {
                    w: metadata.width || 0,
                    h: metadata.height || 0,
                    b: blurhash,
                  }
                } catch {
                  // Couldn't read dimensions
                  meta[imageKey] = { w: 0, h: 0 }
                }
              }
            } else {
              // Non-image files - just add empty entry
              meta[imageKey] = {}
            }
            
            existingKeys.add(imageKey)
            added.push(imageKey)
          } catch (error) {
            console.error(`Failed to process ${relativePath}:`, error)
            errors.push(relativePath)
          }
        }

        await saveMeta(meta)

        sendEvent({ 
          type: 'complete', 
          existingCount,
          added: added.length, 
          renamed: renamed.length,
          errors: errors.length,
          renamedFiles: renamed,
        })
      } catch (error) {
        console.error('Scan failed:', error)
        sendEvent({ type: 'error', message: 'Scan failed' })
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
