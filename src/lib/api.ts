/**
 * Typed API client for Studio
 * Provides type-safe methods for all Studio API endpoints
 */

import type { FileItem, LeanMeta, LeanImageEntry } from '../types'

// Response types
interface ListResponse {
  items: FileItem[]
  isEmpty?: boolean
}

interface FoldersResponse {
  folders: { path: string; name: string; depth: number }[]
}

interface CountImagesResponse {
  count: number
  images: string[]
}

interface UploadResponse {
  success: boolean
  imageKey?: string
  entry?: LeanImageEntry
  path?: string
  message?: string
  error?: string
}

interface DeleteResponse {
  success: boolean
  deleted: string[]
  errors?: string[]
}

interface PushResponse {
  success: boolean
  pushed: string[]
  errors?: string[]
}

interface ReprocessResponse {
  success: boolean
  processed: string[]
  errors?: string[]
}

interface CreateFolderResponse {
  success: boolean
  path: string
  error?: string
}

interface RenameResponse {
  success: boolean
  newPath: string
  error?: string
}

interface MoveResponse {
  success: boolean
  moved: string[]
  errors?: string[]
}

class StudioApiClient {
  private async get<T>(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `Request failed: ${response.status}`)
    }
    return response.json()
  }

  private async post<T>(url: string, body?: object): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `Request failed: ${response.status}`)
    }
    return response.json()
  }

  // List handlers
  async list(path: string = 'public'): Promise<ListResponse> {
    return this.get(`/api/studio/list?path=${encodeURIComponent(path)}`)
  }

  async search(query: string): Promise<ListResponse> {
    return this.get(`/api/studio/search?q=${encodeURIComponent(query)}`)
  }

  async listFolders(): Promise<FoldersResponse> {
    return this.get('/api/studio/list-folders')
  }

  async countImages(): Promise<CountImagesResponse> {
    return this.get('/api/studio/count-images')
  }

  async folderImages(folders: string[]): Promise<CountImagesResponse> {
    return this.get(`/api/studio/folder-images?folders=${encodeURIComponent(folders.join(','))}`)
  }

  // File handlers
  async upload(file: File, targetPath: string = 'public'): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', targetPath)

    const response = await fetch('/api/studio/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `Upload failed: ${response.status}`)
    }

    return response.json()
  }

  async delete(paths: string[]): Promise<DeleteResponse> {
    return this.post('/api/studio/delete', { paths })
  }

  async createFolder(parentPath: string, name: string): Promise<CreateFolderResponse> {
    return this.post('/api/studio/create-folder', { parentPath, name })
  }

  async rename(oldPath: string, newName: string): Promise<RenameResponse> {
    return this.post('/api/studio/rename', { oldPath, newName })
  }

  async move(paths: string[], destination: string): Promise<MoveResponse> {
    return this.post('/api/studio/move', { paths, destination })
  }

  // Image handlers
  async push(imageKeys: string[]): Promise<PushResponse> {
    return this.post('/api/studio/sync', { imageKeys })
  }

  async reprocess(imageKeys: string[]): Promise<ReprocessResponse> {
    return this.post('/api/studio/reprocess', { imageKeys })
  }

  // Process all returns a stream, handle separately
  processAllStream(): EventSource {
    return new EventSource('/api/studio/process-all')
  }
}

export const studioApi = new StudioApiClient()

// Export types for consumers
export type {
  ListResponse,
  FoldersResponse,
  CountImagesResponse,
  UploadResponse,
  DeleteResponse,
  PushResponse,
  ReprocessResponse,
  CreateFolderResponse,
  RenameResponse,
  MoveResponse,
}
