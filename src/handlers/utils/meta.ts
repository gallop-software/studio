import { promises as fs } from 'fs'
import path from 'path'
import type { LeanMeta } from '../../types'

export async function loadMeta(): Promise<LeanMeta> {
  const metaPath = path.join(process.cwd(), '_data', '_meta.json')
  
  try {
    const content = await fs.readFile(metaPath, 'utf-8')
    return JSON.parse(content) as LeanMeta
  } catch {
    return {}
  }
}

export async function saveMeta(meta: LeanMeta): Promise<void> {
  const dataDir = path.join(process.cwd(), '_data')
  await fs.mkdir(dataDir, { recursive: true })
  const metaPath = path.join(dataDir, '_meta.json')
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))
}
