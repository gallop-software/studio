import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { encode } from 'blurhash'
import type { LeanImageEntry } from '../types'
import { getAllThumbnailPaths } from '../types'
import { loadMeta, saveMeta, isImageFile, DEFAULT_SIZES } from './utils'

export async function handleUpload(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const targetPath = formData.get('path') as string || 'public'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileName = file.name
    const baseName = path.basename(fileName, path.extname(fileName))
    const ext = path.extname(fileName).toLowerCase()

    const isImage = isImageFile(fileName)
    const isSvg = ext === '.svg'
    const isProcessableImage = isImage && !isSvg

    const meta = await loadMeta()

    let relativeDir = ''
    if (targetPath === 'public') {
      relativeDir = ''
    } else if (targetPath.startsWith('public/')) {
      relativeDir = targetPath.replace('public/', '')
    }
    
    if (relativeDir === 'images' || relativeDir.startsWith('images/')) {
      return NextResponse.json(
        { error: 'Cannot upload to images/ folder. Upload to public/ instead - thumbnails are generated automatically.' },
        { status: 400 }
      )
    }

    const uploadDir = path.join(process.cwd(), 'public', relativeDir)
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(path.join(uploadDir, fileName), buffer)

    if (!isImage) {
      return NextResponse.json({ 
        success: true, 
        message: 'File uploaded successfully (non-image, no thumbnails generated)',
        path: `public/${relativeDir ? relativeDir + '/' : ''}${fileName}`
      })
    }
    
    const imageKey = '/' + (relativeDir ? `${relativeDir}/${fileName}` : fileName)

    if (meta[imageKey]) {
      return NextResponse.json(
        { error: `File '${imageKey}' already exists in meta` },
        { status: 409 }
      )
    }

    const imagesPath = path.join(process.cwd(), 'public', 'images', relativeDir)
    await fs.mkdir(imagesPath, { recursive: true })

    let originalWidth = 0
    let originalHeight = 0
    let blurhash = ''

    const originalPath = `/${relativeDir ? relativeDir + '/' : ''}${fileName}`

    if (isSvg) {
      const fullPath = path.join(imagesPath, fileName)
      await fs.writeFile(fullPath, buffer)
    } else if (isProcessableImage) {
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()
      originalWidth = metadata.width || 0
      originalHeight = metadata.height || 0

      const outputExt = ext === '.png' ? '.png' : '.jpg'
      const fullFileName = `${baseName}${outputExt}`
      const fullPath = path.join(imagesPath, fullFileName)
      
      if (ext === '.png') {
        await sharp(buffer).png({ quality: 85 }).toFile(fullPath)
      } else {
        await sharp(buffer).jpeg({ quality: 85 }).toFile(fullPath)
      }

      for (const [, sizeConfig] of Object.entries(DEFAULT_SIZES)) {
        const { width: maxWidth, suffix } = sizeConfig
        if (originalWidth <= maxWidth) {
          continue
        }

        const ratio = originalHeight / originalWidth
        const newHeight = Math.round(maxWidth * ratio)
        const sizeFileName = `${baseName}${suffix}${outputExt}`
        const sizePath = path.join(imagesPath, sizeFileName)

        if (ext === '.png') {
          await sharp(buffer).resize(maxWidth, newHeight).png({ quality: 80 }).toFile(sizePath)
        } else {
          await sharp(buffer).resize(maxWidth, newHeight).jpeg({ quality: 80 }).toFile(sizePath)
        }
      }

      const { data, info } = await sharp(buffer)
        .resize(32, 32, { fit: 'inside' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4)
    }

    const entry: LeanImageEntry = {
      w: originalWidth,
      h: originalHeight,
      blur: blurhash,
    }

    meta[originalPath] = entry
    await saveMeta(meta)

    return NextResponse.json({ success: true, imageKey: originalPath, entry })
  } catch (error) {
    console.error('Failed to upload:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to upload file: ${message}` }, { status: 500 })
  }
}

export async function handleDelete(request: NextRequest) {
  try {
    const { paths } = await request.json() as { paths: string[] }

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'No paths provided' }, { status: 400 })
    }

    const meta = await loadMeta()
    const deleted: string[] = []
    const errors: string[] = []

    for (const itemPath of paths) {
      try {
        if (!itemPath.startsWith('public/')) {
          errors.push(`Invalid path: ${itemPath}`)
          continue
        }

        const absolutePath = path.join(process.cwd(), itemPath)
        const stats = await fs.stat(absolutePath)

        if (stats.isDirectory()) {
          await fs.rm(absolutePath, { recursive: true })
          
          const prefix = '/' + itemPath
            .replace(/^public\/images\/?/, '')
            .replace(/^public\/?/, '')
          
          for (const key of Object.keys(meta)) {
            if (key.startsWith(prefix)) {
              delete meta[key]
            }
          }
        } else {
          await fs.unlink(absolutePath)

          const isInImagesFolder = itemPath.startsWith('public/images/')
          
          if (!isInImagesFolder) {
            const imageKey = '/' + itemPath.replace(/^public\//, '')
            if (meta[imageKey]) {
              for (const thumbPath of getAllThumbnailPaths(imageKey)) {
                const absoluteThumbPath = path.join(process.cwd(), 'public', thumbPath)
                try { await fs.unlink(absoluteThumbPath) } catch { /* ignore */ }
              }
              delete meta[imageKey]
            }
          }
        }

        deleted.push(itemPath)
      } catch (error) {
        console.error(`Failed to delete ${itemPath}:`, error)
        errors.push(itemPath)
      }
    }

    await saveMeta(meta)

    return NextResponse.json({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to delete:', error)
    return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 })
  }
}

export async function handleCreateFolder(request: NextRequest) {
  try {
    const { parentPath, name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '').trim()
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 })
    }

    const safePath = (parentPath || 'public').replace(/\.\./g, '')
    const folderPath = path.join(process.cwd(), safePath, sanitizedName)

    if (!folderPath.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    try {
      await fs.access(folderPath)
      return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 400 })
    } catch {
      // Good - folder doesn't exist
    }

    await fs.mkdir(folderPath, { recursive: true })

    return NextResponse.json({ success: true, path: path.join(safePath, sanitizedName) })
  } catch (error) {
    console.error('Failed to create folder:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}

export async function handleRename(request: NextRequest) {
  try {
    const { oldPath, newName } = await request.json()

    if (!oldPath || !newName) {
      return NextResponse.json({ error: 'Path and new name are required' }, { status: 400 })
    }

    const sanitizedName = newName.replace(/[<>:"/\\|?*]/g, '').trim()
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    const safePath = oldPath.replace(/\.\./g, '')
    const absoluteOldPath = path.join(process.cwd(), safePath)
    const parentDir = path.dirname(absoluteOldPath)
    const absoluteNewPath = path.join(parentDir, sanitizedName)

    if (!absoluteOldPath.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    try {
      await fs.access(absoluteOldPath)
    } catch {
      return NextResponse.json({ error: 'File or folder not found' }, { status: 404 })
    }

    try {
      await fs.access(absoluteNewPath)
      return NextResponse.json({ error: 'An item with this name already exists' }, { status: 400 })
    } catch {
      // Good - new path doesn't exist
    }

    const stats = await fs.stat(absoluteOldPath)
    const isFile = stats.isFile()
    const isImage = isFile && isImageFile(path.basename(oldPath))

    await fs.rename(absoluteOldPath, absoluteNewPath)

    if (isImage) {
      const meta = await loadMeta()
      const oldRelativePath = safePath.replace(/^public\//, '')
      const newRelativePath = path.join(path.dirname(oldRelativePath), sanitizedName)
      const oldKey = '/' + oldRelativePath
      const newKey = '/' + newRelativePath

      if (meta[oldKey]) {
        const entry = meta[oldKey]

        const oldThumbPaths = getAllThumbnailPaths(oldKey)
        const newThumbPaths = getAllThumbnailPaths(newKey)

        for (let i = 0; i < oldThumbPaths.length; i++) {
          const oldThumbPath = path.join(process.cwd(), 'public', oldThumbPaths[i])
          const newThumbPath = path.join(process.cwd(), 'public', newThumbPaths[i])
          
          await fs.mkdir(path.dirname(newThumbPath), { recursive: true })
          
          try {
            await fs.rename(oldThumbPath, newThumbPath)
          } catch {
            // Thumbnail might not exist
          }
        }

        delete meta[oldKey]
        meta[newKey] = entry
      }

      await saveMeta(meta)
    }

    const newPath = path.join(path.dirname(safePath), sanitizedName)
    return NextResponse.json({ success: true, newPath })
  } catch (error) {
    console.error('Failed to rename:', error)
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 })
  }
}

export async function handleMove(request: NextRequest) {
  try {
    const { paths, destination } = await request.json()

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'Paths are required' }, { status: 400 })
    }

    if (!destination || typeof destination !== 'string') {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 })
    }

    const safeDestination = destination.replace(/\.\./g, '')
    const absoluteDestination = path.join(process.cwd(), safeDestination)

    if (!absoluteDestination.startsWith(path.join(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Invalid destination' }, { status: 400 })
    }

    try {
      const destStats = await fs.stat(absoluteDestination)
      if (!destStats.isDirectory()) {
        return NextResponse.json({ error: 'Destination is not a folder' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Destination folder not found' }, { status: 404 })
    }

    const moved: string[] = []
    const errors: string[] = []
    const meta = await loadMeta()
    let metaChanged = false

    for (const itemPath of paths) {
      const safePath = itemPath.replace(/\.\./g, '')
      const absolutePath = path.join(process.cwd(), safePath)
      const itemName = path.basename(safePath)
      const newAbsolutePath = path.join(absoluteDestination, itemName)

      if (absoluteDestination.startsWith(absolutePath + path.sep)) {
        errors.push(`Cannot move ${itemName} into itself`)
        continue
      }

      try {
        await fs.access(absolutePath)
      } catch {
        errors.push(`${itemName} not found`)
        continue
      }

      try {
        await fs.access(newAbsolutePath)
        errors.push(`${itemName} already exists in destination`)
        continue
      } catch {
        // Good - doesn't exist
      }

      try {
        await fs.rename(absolutePath, newAbsolutePath)

        const stats = await fs.stat(newAbsolutePath)
        if (stats.isFile() && isImageFile(itemName)) {
          const oldRelativePath = safePath.replace(/^public\//, '')
          const newRelativePath = path.join(safeDestination.replace(/^public\//, ''), itemName)
          const oldKey = '/' + oldRelativePath
          const newKey = '/' + newRelativePath

          if (meta[oldKey]) {
            const entry = meta[oldKey]

            const oldThumbPaths = getAllThumbnailPaths(oldKey)
            const newThumbPaths = getAllThumbnailPaths(newKey)

            for (let i = 0; i < oldThumbPaths.length; i++) {
              const oldThumbPath = path.join(process.cwd(), 'public', oldThumbPaths[i])
              const newThumbPath = path.join(process.cwd(), 'public', newThumbPaths[i])
              
              await fs.mkdir(path.dirname(newThumbPath), { recursive: true })

              try {
                await fs.rename(oldThumbPath, newThumbPath)
              } catch {
                // Thumbnail might not exist
              }
            }

            delete meta[oldKey]
            meta[newKey] = entry
            metaChanged = true
          }
        }

        moved.push(itemPath)
      } catch {
        errors.push(`Failed to move ${itemName}`)
      }
    }

    if (metaChanged) {
      await saveMeta(meta)
    }

    return NextResponse.json({
      success: errors.length === 0,
      moved,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Failed to move:', error)
    return NextResponse.json({ error: 'Failed to move items' }, { status: 500 })
  }
}
