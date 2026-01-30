import { NextRequest, NextResponse } from 'next/server'

// List handlers
import { handleList, handleSearch, handleListFolders, handleCountImages, handleFolderImages } from './list'

// File handlers
import { handleUpload, handleDelete, handleCreateFolder, handleRename, handleMove, handleMoveStream } from './files'

// Image handlers
import { handleSync, handleReprocess, handleReprocessStream, handleUnprocessStream, handleProcessAllStream } from './images'

// Scan handler
import { handleScanStream, handleDeleteOrphans } from './scan'

// Import handlers
import { handleImportUrls, handleGetCdns, handleUpdateCdns } from './import'

// Favicon handler
import { handleGenerateFavicon } from './favicon'

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

  // Route: /api/studio/cdns
  if (route === 'cdns') {
    return handleGetCdns()
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

  // Route: /api/studio/reprocess-stream (streaming)
  if (route === 'reprocess-stream') {
    return handleReprocessStream(request)
  }

  // Route: /api/studio/unprocess-stream (streaming) - remove thumbnails
  if (route === 'unprocess-stream') {
    return handleUnprocessStream(request)
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

  // Route: /api/studio/move (streaming)
  if (route === 'move') {
    return handleMoveStream(request)
  }

  // Route: /api/studio/scan (streaming)
  if (route === 'scan') {
    return handleScanStream()
  }

  // Route: /api/studio/delete-orphans
  if (route === 'delete-orphans') {
    return handleDeleteOrphans(request)
  }

  // Route: /api/studio/import (streaming)
  if (route === 'import') {
    return handleImportUrls(request)
  }

  // Route: /api/studio/cdns (update)
  if (route === 'cdns') {
    return handleUpdateCdns(request)
  }

  // Route: /api/studio/generate-favicon
  if (route === 'generate-favicon') {
    return handleGenerateFavicon(request)
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
