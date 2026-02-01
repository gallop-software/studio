/**
 * Handler exports for the Express server
 * These are the individual handler functions used by the server routes
 */

// List handlers
export { 
  handleList, 
  handleSearch, 
  handleListFolders, 
  handleCountImages, 
  handleFolderImages 
} from './list'

// File handlers
export { 
  handleUpload, 
  handleDelete, 
  handleCreateFolder, 
  handleRename,
  handleRenameStream,
  handleMove, 
  handleMoveStream 
} from './files'

// Image handlers
export { 
  handleSync, 
  handleReprocess, 
  handleReprocessStream, 
  handleUnprocessStream, 
  handleProcessAllStream, 
  handleDownloadStream,
  handlePushUpdatesStream,
  handleCancelUpdates
} from './images'

// Scan handler
export { handleScanStream, handleDeleteOrphans } from './scan'

// Import handlers
export { handleImportUrls, handleGetCdns, handleUpdateCdns } from './import'

// Favicon handler
export { handleGenerateFavicon } from './favicon'
