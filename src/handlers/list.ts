import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import type { FileItem } from '../types'
import { isImageFile, isMediaFile, getFolderStats } from './utils'

export async function handleList(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const requestedPath = searchParams.get('path') || 'public'

  try {
    const safePath = requestedPath.replace(/\.\./g, '')
    const absolutePath = path.join(process.cwd(), safePath)

    if (!absolutePath.startsWith(process.cwd())) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const items: FileItem[] = []
    const entries = await fs.readdir(absolutePath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue

      const itemPath = path.join(safePath, entry.name)

      if (entry.isDirectory()) {
        const folderStats = await getFolderStats(path.join(absolutePath, entry.name))
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'folder',
          fileCount: folderStats.fileCount,
          totalSize: folderStats.totalSize,
        })
      } else if (isMediaFile(entry.name)) {
        const filePath = path.join(absolutePath, entry.name)
        const stats = await fs.stat(filePath)
        const isImage = isImageFile(entry.name)
        
        let thumbnail: string | undefined
        let hasThumbnail = false
        let dimensions: { width: number; height: number } | undefined
        
        if (isImage) {
          const relativePath = safePath.replace(/^public\/?/, '')
          
          if (relativePath === 'images' || relativePath.startsWith('images/')) {
            thumbnail = itemPath.replace('public', '')
            hasThumbnail = true
          } else {
            const ext = path.extname(entry.name).toLowerCase()
            const baseName = path.basename(entry.name, ext)
            const thumbnailDir = relativePath ? `images/${relativePath}` : 'images'
            const thumbnailName = `${baseName}-sm${ext === '.png' ? '.png' : '.jpg'}`
            const thumbnailPath = path.join(process.cwd(), 'public', thumbnailDir, thumbnailName)
            
            try {
              await fs.access(thumbnailPath)
              thumbnail = `/${thumbnailDir}/${thumbnailName}`
              hasThumbnail = true
            } catch {
              thumbnail = itemPath.replace('public', '')
              hasThumbnail = false
            }
          }
          
          if (!entry.name.toLowerCase().endsWith('.svg')) {
            try {
              const metadata = await sharp(filePath).metadata()
              if (metadata.width && metadata.height) {
                dimensions = { width: metadata.width, height: metadata.height }
              }
            } catch {
              // Ignore dimension errors
            }
          }
        }
        
        items.push({
          name: entry.name,
          path: itemPath,
          type: 'file',
          size: stats.size,
          thumbnail,
          hasThumbnail,
          dimensions,
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
    const items: FileItem[] = []
    const publicDir = path.join(process.cwd(), 'public')

    async function searchDir(dir: string, relativePath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue

          const fullPath = path.join(dir, entry.name)
          const itemPath = relativePath ? `public/${relativePath}/${entry.name}` : `public/${entry.name}`
          const itemRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isDirectory()) {
            await searchDir(fullPath, itemRelPath)
          } else if (isImageFile(entry.name)) {
            if (itemPath.toLowerCase().includes(query)) {
              const stats = await fs.stat(fullPath)
              
              let thumbnail: string | undefined
              let hasThumbnail = false
              let dimensions: { width: number; height: number } | undefined

              const ext = path.extname(entry.name).toLowerCase()
              const baseName = path.basename(entry.name, ext)
              const thumbnailDir = relativePath ? `images/${relativePath}` : 'images'
              const thumbnailName = `${baseName}-sm${ext === '.png' ? '.png' : '.jpg'}`
              const thumbnailPath = path.join(process.cwd(), 'public', thumbnailDir, thumbnailName)

              try {
                await fs.access(thumbnailPath)
                thumbnail = `/${thumbnailDir}/${thumbnailName}`
                hasThumbnail = true
              } catch {
                thumbnail = `/${itemRelPath}`
                hasThumbnail = false
              }

              if (!entry.name.toLowerCase().endsWith('.svg')) {
                try {
                  const metadata = await sharp(fullPath).metadata()
                  if (metadata.width && metadata.height) {
                    dimensions = { width: metadata.width, height: metadata.height }
                  }
                } catch {
                  // Ignore dimension errors
                }
              }

              items.push({
                name: entry.name,
                path: itemPath,
                type: 'file',
                size: stats.size,
                thumbnail,
                hasThumbnail,
                dimensions,
              })
            }
          }
        }
      } catch {
        // Ignore directory access errors
      }
    }

    await searchDir(publicDir, '')

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to search:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}

export async function handleListFolders() {
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const folders: { path: string; name: string; depth: number }[] = []

    async function scanDir(dir: string, relativePath: string, depth: number): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (!entry.isDirectory()) continue
          if (entry.name.startsWith('.')) continue

          const folderRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name
          folders.push({
            path: `public/${folderRelativePath}`,
            name: entry.name,
            depth
          })

          await scanDir(path.join(dir, entry.name), folderRelativePath, depth + 1)
        }
      } catch {
        // Ignore errors
      }
    }

    folders.push({ path: 'public', name: 'public', depth: 0 })
    await scanDir(publicDir, '', 1)

    return NextResponse.json({ folders })
  } catch (error) {
    console.error('Failed to list folders:', error)
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 })
  }
}

export async function handleCountImages() {
  try {
    const allImages: string[] = []

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
            allImages.push(relPath)
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    const publicDir = path.join(process.cwd(), 'public')
    await scanPublicFolder(publicDir)

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
    const allImages: string[] = []

    async function scanFolder(dir: string, relativePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          
          const fullPath = path.join(dir, entry.name)
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

          if (entry.isDirectory()) {
            await scanFolder(fullPath, relPath)
          } else if (isImageFile(entry.name)) {
            allImages.push(relPath)
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    for (const folder of folders) {
      const relativePath = folder.replace(/^public\/?/, '')
      
      if (relativePath === 'images' || relativePath.startsWith('images/')) continue
      
      const folderPath = path.join(process.cwd(), folder)
      await scanFolder(folderPath, relativePath)
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
