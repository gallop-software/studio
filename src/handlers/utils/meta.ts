import { promises as fs } from 'fs'
import path from 'path'
import type { FullMeta, MetaEntry } from '../../types'
import { getDataPath } from '../../config'

export async function loadMeta(): Promise<FullMeta> {
  const metaPath = getDataPath('_studio.json')
  
  try {
    const content = await fs.readFile(metaPath, 'utf-8')
    return JSON.parse(content) as FullMeta
  } catch {
    return {}
  }
}

export async function saveMeta(meta: FullMeta): Promise<void> {
  const dataDir = getDataPath()
  await fs.mkdir(dataDir, { recursive: true })
  const metaPath = getDataPath('_studio.json')
  
  // Ensure _cdns is at the top by creating ordered object
  const ordered: FullMeta = {}
  if (meta._cdns) {
    ordered._cdns = meta._cdns
  }
  // Add all other entries
  for (const [key, value] of Object.entries(meta)) {
    if (key !== '_cdns') {
      ordered[key] = value
    }
  }
  
  await fs.writeFile(metaPath, JSON.stringify(ordered, null, 2))
}

/**
 * Get the CDN URLs array from meta
 */
export function getCdnUrls(meta: FullMeta): string[] {
  return meta._cdns || []
}

/**
 * Set the CDN URLs array in meta
 */
export function setCdnUrls(meta: FullMeta, urls: string[]): void {
  meta._cdns = urls
}

/**
 * Get or add a CDN URL, returning its index
 */
export function getOrAddCdnIndex(meta: FullMeta, cdnUrl: string): number {
  if (!meta._cdns) {
    meta._cdns = []
  }
  
  // Normalize URL (remove trailing slash)
  const normalizedUrl = cdnUrl.replace(/\/$/, '')
  
  const existingIndex = meta._cdns.indexOf(normalizedUrl)
  if (existingIndex >= 0) {
    return existingIndex
  }
  
  // Add new CDN URL
  meta._cdns.push(normalizedUrl)
  return meta._cdns.length - 1
}

/**
 * Get a meta entry (excludes special keys like _cdns)
 */
export function getMetaEntry(meta: FullMeta, key: string): MetaEntry | undefined {
  if (key.startsWith('_')) return undefined
  const value = meta[key]
  if (Array.isArray(value)) return undefined
  return value as MetaEntry | undefined
}

/**
 * Set a meta entry
 */
export function setMetaEntry(meta: FullMeta, key: string, entry: MetaEntry): void {
  meta[key] = entry
}

/**
 * Delete a meta entry
 */
export function deleteMetaEntry(meta: FullMeta, key: string): void {
  delete meta[key]
}

/**
 * Get all file entries (excludes special keys like _cdns)
 */
export function getFileEntries(meta: FullMeta): Array<[string, MetaEntry]> {
  return Object.entries(meta).filter(
    ([key, value]) => !key.startsWith('_') && !Array.isArray(value)
  ) as Array<[string, MetaEntry]>
}
