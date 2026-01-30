import { NextRequest, NextResponse } from 'next/server'

// List handlers
import { handleList, handleSearch, handleListFolders, handleCountImages, handleFolderImages } from './list'

// File handlers
import { handleUpload, handleDelete, handleCreateFolder, handleRename, handleMove } from './files'

// Image handlers
import { handleSync, handleReprocess, handleProcessAllStream } from './images'

/**
 * Unified GET handler for all Studio API routes
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const pathname = request.nextUrl.pathname
  const route = pathname.replace(/^\/api\/studio\/?/, '')

  // Route: /api/studio/list-folders (must come before 'list' check)
  if (route === 'list-folders') {
    return handleListFolders()
  }

  // Route: /api/studio/list
  if (route === 'list' || route.startsWith('list')) {
    return handleList(request)
  }

  // Route: /api/studio/count-images
  if (route === 'count-images') {
    return handleCountImages()
  }

  // Route: /api/studio/folder-images
  if (route === 'folder-images') {
    return handleFolderImages(request)
  }

  // Route: /api/studio/search
  if (route === 'search') {
    return handleSearch(request)
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Unified POST handler for all Studio API routes
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const pathname = request.nextUrl.pathname
  const route = pathname.replace(/^\/api\/studio\/?/, '')

  // Route: /api/studio/upload
  if (route === 'upload') {
    return handleUpload(request)
  }

  // Route: /api/studio/delete
  if (route === 'delete') {
    return handleDelete(request)
  }

  // Route: /api/studio/sync
  if (route === 'sync') {
    return handleSync(request)
  }

  // Route: /api/studio/reprocess
  if (route === 'reprocess') {
    return handleReprocess(request)
  }

  // Route: /api/studio/process-all (streaming)
  if (route === 'process-all') {
    return handleProcessAllStream()
  }

  // Route: /api/studio/create-folder
  if (route === 'create-folder') {
    return handleCreateFolder(request)
  }

  // Route: /api/studio/rename
  if (route === 'rename') {
    return handleRename(request)
  }

  // Route: /api/studio/move
  if (route === 'move') {
    return handleMove(request)
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Unified DELETE handler
 */
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return handleDelete(request)
}
