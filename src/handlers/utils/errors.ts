/**
 * Check if an error is an ENOENT (file/directory not found) error
 */
export function isFileNotFound(err: unknown): boolean {
  return err !== null && typeof err === 'object' && 'code' in err && err.code === 'ENOENT'
}
