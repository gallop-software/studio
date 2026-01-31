import path from 'path'

let workspacePath: string | null = null

/**
 * Get the workspace root path.
 * In standalone mode, this comes from STUDIO_WORKSPACE env var.
 * In embedded mode, this defaults to process.cwd().
 */
export function getWorkspace(): string {
  if (workspacePath === null) {
    workspacePath = process.env.STUDIO_WORKSPACE || process.cwd()
  }
  return workspacePath
}

/**
 * Get an absolute path within the public folder.
 */
export function getPublicPath(...segments: string[]): string {
  return path.join(getWorkspace(), 'public', ...segments)
}

/**
 * Get an absolute path within the _data folder.
 */
export function getDataPath(...segments: string[]): string {
  return path.join(getWorkspace(), '_data', ...segments)
}

/**
 * Get an absolute path within the src/app folder.
 */
export function getSrcAppPath(...segments: string[]): string {
  return path.join(getWorkspace(), 'src', 'app', ...segments)
}

/**
 * Get an absolute path within the workspace root.
 */
export function getWorkspacePath(...segments: string[]): string {
  return path.join(getWorkspace(), ...segments)
}
