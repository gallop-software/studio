import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { FileItem, MetaEntry } from '../types'
import { loadMeta, isImageFile, getCdnUrls, getFileEntries } from './utils'
import { getThumbnailPath } from '../types'

/**
 * List files and folders from meta
 * Folders are derived from file paths in meta
 */
export async function handleList(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const requestedPath = searchParams.get('path') || 'public'

  try {
    const meta = await loadMeta()
    const fileEntries = getFileEntries(meta)
    const cdnUrls = getCdnUrls(meta)
    
    // If meta is empty, return empty with a flag
    if (fileEntries.length === 0) {
      return NextResponse.json({ items: [], isEmpty: true })
    }

    // Normalize the requested path to match meta keys
    // requestedPath is like "public" or "public/photos"
    // meta keys are like "/photos/image.jpg"
    const relativePath = requestedPath.replace(/^public\/?/, '')
    const pathPrefix = relativePath ? `/${relativePath}/` : '/'

    const items: FileItem[] = []
    const seenFolders = new Set<string>()
    const metaKeys = fileEntries.map(([key]) => key)

    for (const [key, entry] of fileEntries) {
      // Check if this file is under the current path
      if (!key.startsWith(pathPrefix) && pathPrefix !== '/') continue
      if (pathPrefix === '/' && !key.startsWith('/')) continue

      // Get the part after the current path
      const remaining = pathPrefix === '/' ? key.slice(1) : key.slice(pathPrefix.length)
      
      // Skip if empty (shouldn't happen)
      if (!remaining) continue

      // Check if there's a subfolder
      const slashIndex = remaining.indexOf('/')
      
      if (slashIndex !== -1) {
        // This is in a subfolder - show the folder
        const folderName = remaining.slice(0, slashIndex)
        
        if (!seenFolders.has(folderName)) {
          seenFolders.add(folderName)
          
          // Count files in this folder from meta
          const folderPrefix = pathPrefix === '/' ? `/${folderName}/` : `${pathPrefix}${folderName}/`
          let fileCount = 0
          for (const k of metaKeys) {
            if (k.startsWith(folderPrefix)) fileCount++
          }
          
          items.push({
            name: folderName,
            path: relativePath ? `public/${relativePath}/${folderName}` : `public/${folderName}`,
            type: 'folder',
            fileCount,
          })
        }
      } else {
        // This is a file in the current folder
        const fileName = remaining
        const isImage = isImageFile(fileName)
        const isPushedToCloud = entry.c !== undefined
        
        let thumbnail: string | undefined
        let hasThumbnail = false
        let fileSize: number | undefined
        
        if (isImage && (entry.w || entry.b)) {
          // Has been processed - use thumbnail
          const thumbPath = getThumbnailPath(key, 'sm')
          
          if (isPushedToCloud && entry.c !== undefined) {
            // CDN thumbnail - get URL from _cdns array
            const cdnUrl = cdnUrls[entry.c]
            if (cdnUrl) {
              thumbnail = `${cdnUrl}${thumbPath}`
              hasThumbnail = true
            }
          } else {
            // Local thumbnail - check if exists
            const localThumbPath = path.join(process.cwd(), 'public', thumbPath)
            try {
              await fs.access(localThumbPath)
              thumbnail = thumbPath
              hasThumbnail = true
            } catch {
              // Thumbnail doesn't exist yet
              thumbnail = key
              hasThumbnail = false
            }
          }
        } else if (isImage) {
          // Not processed yet - use original
          thumbnail = key
          hasThumbnail = false
        }
        
        // Try to get file size if file exists locally
        if (!isPushedToCloud) {
          try {
            const filePath = path.join(process.cwd(), 'public', key)
            const stats = await fs.stat(filePath)
            fileSize = stats.size
          } catch {
            // File might not exist locally (synced)
          }
        }
        
        items.push({
          name: fileName,
          path: relativePath ? `public/${relativePath}/${fileName}` : `public/${fileName}`,
          type: 'file',
          size: fileSize,
          thumbnail,
          hasThumbnail,
          isProcessed: entry.p === 1,
          cdnPushed: isPushedToCloud,
          dimensions: entry.w && entry.h ? { width: entry.w, height: entry.h } : undefined,
        })
      }
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to list directory:', error)
    return NextResponse.json({ error: 'Failed to list directory' }, { status: 500 })
  }
}

export async function handleSearch(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')?.toLowerCase() || ''
  
  if (query.length < 2) {
    return NextResponse.json({ items: [] })
  }

  try {
    const meta = await loadMeta()
    const fileEntries = getFileEntries(meta)
    const cdnUrls = getCdnUrls(meta)
    const items: FileItem[] = []

    for (const [key, entry] of fileEntries) {
      // Check if the path matches the query
      if (!key.toLowerCase().includes(query)) continue
      
      const fileName = path.basename(key)
      const relativePath = key.slice(1) // Remove leading /
      const isImage = isImageFile(fileName)
      const isPushedToCloud = entry.c !== undefined
      
      let thumbnail: string | undefined
      let hasThumbnail = false
      
      if (isImage && (entry.w || entry.b)) {
        const thumbPath = getThumbnailPath(key, 'sm')
        
        if (isPushedToCloud && entry.c !== undefined) {
          const cdnUrl = cdnUrls[entry.c]
          if (cdnUrl) {
            thumbnail = `${cdnUrl}${thumbPath}`
            hasThumbnail = true
          }
        } else {
          const localThumbPath = path.join(process.cwd(), 'public', thumbPath)
          try {
            await fs.access(localThumbPath)
            thumbnail = thumbPath
            hasThumbnail = true
          } catch {
            thumbnail = key
            hasThumbnail = false
          }
        }
      } else if (isImage) {
        thumbnail = key
        hasThumbnail = false
      }
      
      items.push({
        name: fileName,
        path: `public/${relativePath}`,
        type: 'file',
        thumbnail,
        hasThumbnail,
        isProcessed: entry.p === 1,
        cdnPushed: isPushedToCloud,
        dimensions: entry.w && entry.h ? { width: entry.w, height: entry.h } : undefined,
      })
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to search:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}

export async function handleListFolders() {
  try {
    const meta = await loadMeta()
    const fileEntries = getFileEntries(meta)
    const folderSet = new Set<string>()
    
    // Extract all folder paths from meta keys
    for (const [key] of fileEntries) {
      const parts = key.split('/')
      // Build up folder paths: /photos/2024/image.jpg -> photos, photos/2024
      let current = ''
      for (let i = 1; i < parts.length - 1; i++) {
        current = current ? `${current}/${parts[i]}` : parts[i]
        folderSet.add(current)
      }
    }
    
    const folders: { path: string; name: string; depth: number }[] = []
    folders.push({ path: 'public', name: 'public', depth: 0 })
    
    const sortedFolders = Array.from(folderSet).sort()
    for (const folderPath of sortedFolders) {
      const depth = folderPath.split('/').length
      const name = folderPath.split('/').pop() || folderPath
      folders.push({
        path: `public/${folderPath}`,
        name,
        depth
      })
    }

    return NextResponse.json({ folders })
  } catch (error) {
    console.error('Failed to list folders:', error)
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 })
  }
}

export async function handleCountImages() {
  try {
    const meta = await loadMeta()
    const fileEntries = getFileEntries(meta)
    const allImages: string[] = []

    for (const [key] of fileEntries) {
      const fileName = path.basename(key)
      if (isImageFile(fileName)) {
        allImages.push(key.slice(1)) // Remove leading /
      }
    }

    return NextResponse.json({
      count: allImages.length,
      images: allImages,
    })
  } catch (error) {
    console.error('Failed to count images:', error)
    return NextResponse.json({ error: 'Failed to count images' }, { status: 500 })
  }
}

export async function handleFolderImages(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const foldersParam = searchParams.get('folders')
    
    if (!foldersParam) {
      return NextResponse.json({ error: 'No folders provided' }, { status: 400 })
    }

    const folders = foldersParam.split(',')
    const meta = await loadMeta()
    const fileEntries = getFileEntries(meta)
    const allImages: string[] = []

    // Convert folder paths to prefixes for matching
    const prefixes = folders.map(f => {
      const rel = f.replace(/^public\/?/, '')
      return rel ? `/${rel}/` : '/'
    })

    for (const [key] of fileEntries) {
      const fileName = path.basename(key)
      if (!isImageFile(fileName)) continue
      
      // Check if this image is in one of the requested folders
      for (const prefix of prefixes) {
        if (key.startsWith(prefix) || (prefix === '/' && key.startsWith('/'))) {
          allImages.push(key.slice(1)) // Remove leading /
          break
        }
      }
    }

    return NextResponse.json({
      count: allImages.length,
      images: allImages,
    })
  } catch (error) {
    console.error('Failed to get folder images:', error)
    return NextResponse.json({ error: 'Failed to get folder images' }, { status: 500 })
  }
}
