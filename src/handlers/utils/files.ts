import { promises as fs } from 'fs'
import path from 'path'

export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.tif'].includes(ext)
}

export function isMediaFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  // Images
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.tif'].includes(ext)) return true
  // Videos
  if (['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'].includes(ext)) return true
  // Audio
  if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'].includes(ext)) return true
  // Documents
  if (['.pdf', '.json'].includes(ext)) return true
  return false
}

export function getContentType(filePath: string): string {
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

export async function getFolderStats(folderPath: string): Promise<{ fileCount: number; totalSize: number }> {
  let fileCount = 0
  let totalSize = 0

  async function scanFolder(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await scanFolder(fullPath)
        } else if (isMediaFile(entry.name)) {
          fileCount++
          const stats = await fs.stat(fullPath)
          totalSize += stats.size
        }
      }
    } catch { /* ignore errors */ }
  }

  await scanFolder(folderPath)
  return { fileCount, totalSize }
}
