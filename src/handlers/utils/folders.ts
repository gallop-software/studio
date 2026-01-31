import { promises as fs } from 'fs'
import path from 'path'
import { getPublicPath } from '../../config'

/**
 * Check if a file is a hidden/system file that should be ignored
 * - Mac/Linux: files starting with .
 * - Windows: Thumbs.db, desktop.ini, etc.
 */
function isHiddenOrSystemFile(filename: string): boolean {
  // Hidden files on Mac/Linux start with .
  if (filename.startsWith('.')) return true
  
  // Windows system files
  const windowsSystemFiles = ['thumbs.db', 'desktop.ini', 'ehthumbs.db', 'ehthumbs_vista.db']
  if (windowsSystemFiles.includes(filename.toLowerCase())) return true
  
  return false
}

/**
 * Recursively delete empty folders starting from the given path
 * Stops at the public folder boundary
 * Includes the images folder - it can be deleted if empty and will be recreated when needed
 * Ignores hidden and system files (deletes them if they're the only contents)
 */
export async function deleteEmptyFolders(folderPath: string): Promise<void> {
  const publicPath = getPublicPath()
  
  // Normalize paths for comparison
  const normalizedFolder = path.resolve(folderPath)
  const normalizedPublic = path.resolve(publicPath)
  
  // Don't delete the public folder itself
  if (normalizedFolder === normalizedPublic) {
    return
  }
  
  // Check if folder is inside public
  if (!normalizedFolder.startsWith(normalizedPublic)) {
    return
  }
  
  try {
    const entries = await fs.readdir(folderPath)
    
    // Filter out hidden/system files
    const meaningfulEntries = entries.filter(e => !isHiddenOrSystemFile(e))
    
    // If folder only contains hidden/system files (or is empty), delete it
    if (meaningfulEntries.length === 0) {
      // First delete any hidden/system files
      for (const entry of entries) {
        if (isHiddenOrSystemFile(entry)) {
          try {
            await fs.unlink(path.join(folderPath, entry))
          } catch {
            // Ignore deletion errors for system files
          }
        }
      }
      
      // Now delete the folder
      await fs.rmdir(folderPath)
      
      // Recursively check parent folder
      const parentFolder = path.dirname(folderPath)
      await deleteEmptyFolders(parentFolder)
    }
  } catch {
    // Folder doesn't exist or can't be read, ignore
  }
}

/**
 * Ensure a folder exists, creating it if necessary
 */
export async function ensureFolderExists(folderPath: string): Promise<void> {
  try {
    await fs.mkdir(folderPath, { recursive: true })
  } catch {
    // Already exists or can't be created
  }
}
