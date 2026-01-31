import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { FileItem, MetaEntry } from '../types'
import { loadMeta, isImageFile, getCdnUrls, getFileEntries } from './utils'
import { getThumbnailPath, isProcessed } from '../types'

/**
 * Get all thumbnail file info for a processed meta entry
 * Returns the thumbnail paths that exist based on which dimension properties are present
 */
function getExistingThumbnails(originalPath: string, entry: MetaEntry): Array<{ path: string; size: 'f' | 'lg' | 'md' | 'sm' }> {
  const thumbnails: Array<{ path: string; size: 'f' | 'lg' | 'md' | 'sm' }> = []
  
  if (entry.f) {
    thumbnails.push({ path: getThumbnailPath(originalPath, 'full'), size: 'f' })
  }
  if (entry.lg) {
    thumbnails.push({ path: getThumbnailPath(originalPath, 'lg'), size: 'lg' })
  }
  if (entry.md) {
    thumbnails.push({ path: getThumbnailPath(originalPath, 'md'), size: 'md' })
  }
  if (entry.sm) {
    thumbnails.push({ path: getThumbnailPath(originalPath, 'sm'), size: 'sm' })
  }
  
  return thumbnails
}

/**
 * Count cloud, remote, and local files for a folder prefix
 */
function countFileTypes(
  folderPrefix: string,
  fileEntries: [string, MetaEntry][],
  cdnUrls: string[],
  r2PublicUrl: string
): { cloudCount: number; remoteCount: number; localCount: number } {
  let cloudCount = 0
  let remoteCount = 0
  let localCount = 0
  
  for (const [key, entry] of fileEntries) {
    if (key.startsWith(folderPrefix)) {
      if (entry.c !== undefined) {
        // Check if it's our R2 or a remote URL
        const cdnUrl = cdnUrls[entry.c]
        if (cdnUrl === r2PublicUrl) {
          cloudCount++
        } else {
          remoteCount++
        }
      } else {
        localCount++
      }
    }
  }
  
  return { cloudCount, remoteCount, localCount }
}

/**
 * List files and folders from meta
 * Folders are derived from file paths in meta AND filesystem
 */
export async function handleList(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const requestedPath = searchParams.get('path') || 'public'

  try {
    const meta = await loadMeta()
    const fileEntries = getFileEntries(meta)
    const cdnUrls = getCdnUrls(meta)
    const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '') || ''
    
    // Normalize the requested path to match meta keys
    // requestedPath is like "public" or "public/photos"
    // meta keys are like "/photos/image.jpg"
    const relativePath = requestedPath.replace(/^public\/?/, '')
    const pathPrefix = relativePath ? `/${relativePath}/` : '/'

    const items: FileItem[] = []
    const seenFolders = new Set<string>()
    const metaKeys = fileEntries.map(([key]) => key)
    
    // Check if we're inside the images folder (protected area)
    const isInsideImagesFolder = relativePath === 'images' || relativePath.startsWith('images/')
    
    // For the images folder, derive contents from meta entries with thumbnails
    if (isInsideImagesFolder) {
      // Get the path within images folder (e.g., "images/subfolder" -> "subfolder")
      const imagesSubPath = relativePath.replace(/^images\/?/, '')
      const imagesPrefix = imagesSubPath ? `/${imagesSubPath}/` : '/'
      
      // Collect all thumbnails from processed entries
      const allThumbnails: Array<{ path: string; size: 'f' | 'lg' | 'md' | 'sm'; originalKey: string }> = []
      
      for (const [key, entry] of fileEntries) {
        if (isProcessed(entry)) {
          const thumbnails = getExistingThumbnails(key, entry)
          for (const thumb of thumbnails) {
            allThumbnails.push({ ...thumb, originalKey: key })
          }
        }
      }
      
      // Filter thumbnails that are in the current images subfolder
      for (const thumb of allThumbnails) {
        // thumb.path is like "/images/photos/image.jpg" or "/images/photos/image-lg.jpg"
        // We need to check if it's under the current images path
        const thumbRelative = thumb.path.replace(/^\/images\/?/, '')
        
        // Get the original entry to check if it's on CDN
        const originalEntry = fileEntries.find(([k]) => k === thumb.originalKey)?.[1]
        const cdnIndex = originalEntry?.c
        const cdnBaseUrl = cdnIndex !== undefined ? cdnUrls[cdnIndex] : undefined
        // Build the full thumbnail URL (with CDN base if applicable)
        const thumbnailUrl = cdnBaseUrl ? `${cdnBaseUrl}${thumb.path}` : thumb.path
        // Determine if it's pushed to CDN and if it's remote (not our R2)
        const isPushedToCloud = cdnIndex !== undefined
        const isRemote = isPushedToCloud && cdnBaseUrl !== r2PublicUrl
        
        // Get dimensions for this thumbnail size
        const thumbDims = originalEntry?.[thumb.size]
        const dimensions = thumbDims ? { width: thumbDims.w, height: thumbDims.h } : undefined
        
        // Check if this is directly in the current folder or in a subfolder
        if (imagesSubPath === '') {
          // We're at /images root
          const slashIndex = thumbRelative.indexOf('/')
          if (slashIndex === -1) {
            // Direct file in images root
            const fileName = thumbRelative
            items.push({
              name: fileName,
              path: `public/images/${fileName}`,
              type: 'file',
              thumbnail: thumbnailUrl,
              hasThumbnail: false,
              isProtected: true,
              cdnPushed: isPushedToCloud,
              cdnBaseUrl,
              isRemote,
              dimensions,
            })
          } else {
            // In a subfolder - add the folder
            const folderName = thumbRelative.slice(0, slashIndex)
            if (!seenFolders.has(folderName)) {
              seenFolders.add(folderName)
              // Count thumbnails in this folder
              const folderPrefix = `/${folderName}/`
              const fileCount = allThumbnails.filter(t => 
                t.path.replace(/^\/images/, '').startsWith(folderPrefix)
              ).length
              items.push({
                name: folderName,
                path: `public/images/${folderName}`,
                type: 'folder',
                fileCount,
                isProtected: true,
              })
            }
          }
        } else {
          // We're in a subfolder of images
          if (!thumbRelative.startsWith(imagesSubPath + '/') && thumbRelative !== imagesSubPath) continue
          
          const remaining = thumbRelative.slice(imagesSubPath.length + 1)
          if (!remaining) continue
          
          const slashIndex = remaining.indexOf('/')
          if (slashIndex === -1) {
            // Direct file
            items.push({
              name: remaining,
              path: `public/images/${imagesSubPath}/${remaining}`,
              type: 'file',
              thumbnail: thumbnailUrl,
              hasThumbnail: false,
              isProtected: true,
              cdnPushed: isPushedToCloud,
              cdnBaseUrl,
              isRemote,
              dimensions,
            })
          } else {
            // Subfolder
            const folderName = remaining.slice(0, slashIndex)
            if (!seenFolders.has(folderName)) {
              seenFolders.add(folderName)
              const folderPrefix = `${imagesSubPath}/${folderName}/`
              const fileCount = allThumbnails.filter(t => 
                t.path.replace(/^\/images\//, '').startsWith(folderPrefix)
              ).length
              items.push({
                name: folderName,
                path: `public/images/${imagesSubPath}/${folderName}`,
                type: 'folder',
                fileCount,
                isProtected: true,
              })
            }
          }
        }
      }
      
      return NextResponse.json({ items })
    }
    
    // Not in images folder - check filesystem for folders (including empty ones)
    const absoluteDir = path.join(process.cwd(), requestedPath)
    try {
      const dirEntries = await fs.readdir(absoluteDir, { withFileTypes: true })
      for (const entry of dirEntries) {
        if (entry.name.startsWith('.')) continue
        
        if (entry.isDirectory()) {
          if (!seenFolders.has(entry.name)) {
            seenFolders.add(entry.name)
            
            // Check if this folder is the images folder
            const isImagesFolder = entry.name === 'images' && !relativePath
            const folderPath = relativePath ? `public/${relativePath}/${entry.name}` : `public/${entry.name}`
            
            // Count files in this folder
            let fileCount = 0
            let cloudCount = 0
            let remoteCount = 0
            let localCount = 0
            
            if (isImagesFolder) {
              // Count thumbnails from meta for images folder
              for (const [key, metaEntry] of fileEntries) {
                if (isProcessed(metaEntry)) {
                  fileCount += getExistingThumbnails(key, metaEntry).length
                }
              }
            } else {
              // Count files from meta for regular folders
              const folderPrefix = pathPrefix === '/' ? `/${entry.name}/` : `${pathPrefix}${entry.name}/`
              for (const k of metaKeys) {
                if (k.startsWith(folderPrefix)) fileCount++
              }
              // Count cloud vs remote vs local
              const counts = countFileTypes(folderPrefix, fileEntries, cdnUrls, r2PublicUrl)
              cloudCount = counts.cloudCount
              remoteCount = counts.remoteCount
              localCount = counts.localCount
            }
            
            items.push({
              name: entry.name,
              path: folderPath,
              type: 'folder',
              fileCount,
              cloudCount,
              remoteCount,
              localCount,
              isProtected: isImagesFolder,
            })
          }
        }
      }
    } catch {
      // Directory might not exist (all files in cloud)
    }
    
    // Always show images folder at root level if any processed images exist
    if (!relativePath && !seenFolders.has('images')) {
      let thumbnailCount = 0
      for (const [key, entry] of fileEntries) {
        if (isProcessed(entry)) {
          thumbnailCount += getExistingThumbnails(key, entry).length
        }
      }
      if (thumbnailCount > 0) {
        items.push({
          name: 'images',
          path: 'public/images',
          type: 'folder',
          fileCount: thumbnailCount,
          isProtected: true,
        })
      }
    }
    
    // If meta is empty and no folders found, return empty with a flag
    if (fileEntries.length === 0 && items.length === 0) {
      return NextResponse.json({ items: [], isEmpty: true })
    }

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
          
          // Count cloud vs remote vs local
          const counts = countFileTypes(folderPrefix, fileEntries, cdnUrls, r2PublicUrl)
          
          items.push({
            name: folderName,
            path: relativePath ? `public/${relativePath}/${folderName}` : `public/${folderName}`,
            type: 'folder',
            fileCount,
            cloudCount: counts.cloudCount,
            remoteCount: counts.remoteCount,
            localCount: counts.localCount,
            isProtected: isInsideImagesFolder,
          })
        }
      } else {
        // This is a file in the current folder
        const fileName = remaining
        const isImage = isImageFile(fileName)
        const isPushedToCloud = entry.c !== undefined
        
        // Determine if this is a remote import vs pushed to our R2
        const fileCdnUrl = isPushedToCloud && entry.c !== undefined ? cdnUrls[entry.c] : undefined
        const isRemote = isPushedToCloud && (!r2PublicUrl || fileCdnUrl !== r2PublicUrl)
        
        let thumbnail: string | undefined
        let hasThumbnail = false
        let fileSize: number | undefined
        
        const entryIsProcessed = isProcessed(entry)
        
        if (isImage && entryIsProcessed) {
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
          // Not processed yet - use original (from CDN if available)
          if (isPushedToCloud && entry.c !== undefined) {
            const cdnUrl = cdnUrls[entry.c]
            thumbnail = cdnUrl ? `${cdnUrl}${key}` : key
          } else {
            thumbnail = key
          }
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
          isProcessed: entryIsProcessed,
          cdnPushed: isPushedToCloud,
          cdnBaseUrl: fileCdnUrl,
          isRemote,
          isProtected: isInsideImagesFolder,
          dimensions: entry.o ? { width: entry.o.w, height: entry.o.h } : undefined,
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
    const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '') || ''
    const items: FileItem[] = []

    for (const [key, entry] of fileEntries) {
      // Check if the path matches the query
      if (!key.toLowerCase().includes(query)) continue
      
      const fileName = path.basename(key)
      const relativePath = key.slice(1) // Remove leading /
      const isImage = isImageFile(fileName)
      const isPushedToCloud = entry.c !== undefined
      
      // Determine if this is a remote import vs pushed to our R2
      const fileCdnUrl = isPushedToCloud && entry.c !== undefined ? cdnUrls[entry.c] : undefined
      const isRemote = isPushedToCloud && (!r2PublicUrl || fileCdnUrl !== r2PublicUrl)
      
      let thumbnail: string | undefined
      let hasThumbnail = false
      const entryIsProcessed = isProcessed(entry)
      
      if (isImage && entryIsProcessed) {
        // Has been processed - use thumbnail
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
        // Not processed yet - use original (from CDN if available)
        if (isPushedToCloud && entry.c !== undefined) {
          const cdnUrl = cdnUrls[entry.c]
          thumbnail = cdnUrl ? `${cdnUrl}${key}` : key
        } else {
          thumbnail = key
        }
        hasThumbnail = false
      }
      
      items.push({
        name: fileName,
        path: `public/${relativePath}`,
        type: 'file',
        thumbnail,
        hasThumbnail,
        isProcessed: entryIsProcessed,
        cdnPushed: isPushedToCloud,
        cdnBaseUrl: fileCdnUrl,
        isRemote,
        dimensions: entry.o ? { width: entry.o.w, height: entry.o.h } : undefined,
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
    
    // Also scan filesystem recursively for folders (including empty ones)
    async function scanDir(dir: string, relativePath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'images') {
            const folderRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
            folderSet.add(folderRelPath)
            // Recurse into subdirectory
            await scanDir(path.join(dir, entry.name), folderRelPath)
          }
        }
      } catch {
        // Directory might not exist
      }
    }
    
    const publicDir = path.join(process.cwd(), 'public')
    await scanDir(publicDir, '')
    
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
    const allFiles: string[] = []

    // Convert folder paths to prefixes for matching
    const prefixes = folders.map(f => {
      const rel = f.replace(/^public\/?/, '')
      return rel ? `/${rel}/` : '/'
    })

    for (const [key] of fileEntries) {
      // Check if this file is in one of the requested folders
      for (const prefix of prefixes) {
        if (key.startsWith(prefix) || (prefix === '/' && key.startsWith('/'))) {
          allFiles.push(key.slice(1)) // Remove leading /
          break
        }
      }
    }

    return NextResponse.json({
      count: allFiles.length,
      images: allFiles, // Keep as 'images' for backwards compatibility
    })
  } catch (error) {
    console.error('Failed to get folder files:', error)
    return NextResponse.json({ error: 'Failed to get folder files' }, { status: 500 })
  }
}
