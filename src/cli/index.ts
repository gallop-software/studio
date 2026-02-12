import { config as loadEnv } from 'dotenv'
import { join } from 'path'
import { existsSync } from 'fs'

export function printProgress(current: number, total: number, message: string) {
  const pct = Math.round((current / total) * 100)
  process.stdout.write(`\r  [${current}/${total}] ${pct}% ${message}`)
}

export function printComplete(message: string) {
  process.stdout.write('\n')
  console.log(`\u2713 ${message}`)
}

export function printError(message: string) {
  process.stderr.write('\n')
  console.error(`\u2717 ${message}`)
}

export async function run(command: string, workspace: string, args: string[]) {
  process.env.STUDIO_WORKSPACE = workspace

  const envPath = join(workspace, '.env.local')
  if (existsSync(envPath)) {
    loadEnv({ path: envPath })
  }

  try {
    switch (command) {
      case 'scan': {
        const { runScan } = await import('./scan')
        await runScan(args)
        break
      }
      case 'process': {
        const { runProcess } = await import('./process')
        await runProcess(args)
        break
      }
      case 'push': {
        const { runPush } = await import('./push')
        await runPush(args)
        break
      }
      case 'download': {
        const { runDownload } = await import('./download')
        await runDownload(args)
        break
      }
      case 'fonts': {
        const { runFonts } = await import('./fonts')
        await runFonts(args)
        break
      }
      default:
        console.error(`Unknown command: ${command}`)
        console.error('Available commands: scan, process, push, download, fonts')
        process.exit(1)
    }
  } catch (error) {
    console.error('Command failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
