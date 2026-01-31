import { promises as fs } from 'fs'
import path from 'path'
import { getPublicPath } from '../../config'

/**
 * Recursively delete empty folders starting from the given path
 * Stops at the public folder boundary
 * Includes the images folder - it can be deleted if empty and will be recreated when needed
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
    
    // If folder is empty, delete it and check parent
    if (entries.length === 0) {
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
