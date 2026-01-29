// API route handlers for Next.js
// 
// Usage in your project:
// Create files in src/app/api/studio/[action]/route.ts and re-export handlers
//
// Example: src/app/api/studio/list/route.ts
// export { GET } from '@gallop.software/studio/api/list'

export { GET as listHandler } from './list'
export { POST as uploadHandler } from './upload'
export { POST as deleteHandler } from './delete'
export { GET as scanHandler } from './scan'
export { POST as syncHandler } from './sync'
export { POST as reprocessHandler } from './reprocess'
