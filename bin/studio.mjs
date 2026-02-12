#!/usr/bin/env node

import { resolve } from 'path'
import { existsSync } from 'fs'

// Parse command line arguments
const args = process.argv.slice(2)
let workspace = process.cwd()
let port = 3001
let shouldOpen = false

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--workspace' && args[i + 1]) {
    workspace = resolve(args[i + 1])
    i++
  } else if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10)
    i++
  } else if (args[i] === '--open' || args[i] === '-o') {
    shouldOpen = true
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Studio - Media Manager

Usage:
  studio [options]
  studio <command> [options]

Commands:
  scan                Scan for new media files and update metadata
  process [prefix]    Generate thumbnails for unprocessed images
  push [prefix]       Upload local images to CDN (R2)
  download [prefix]   Download cloud images to local storage
  fonts woff2 <folder>              Convert TTF/OTF to woff2
  fonts assign <folder> --name <n>  Generate src/fonts/<n>.ts

Options:
  --workspace <path>  Path to the project workspace (default: current directory)
  --port <number>     Port to run the server on (default: 3001)
  --open, -o          Open browser automatically
  --help, -h          Show this help message

Examples:
  studio                              # Start the web UI
  studio --workspace ~/my-project     # Start for specific project
  studio scan                         # Scan for new files
  studio process                      # Process all unprocessed images
  studio process portfolio            # Process images in /portfolio/
  studio push                         # Push all local images to CDN
  studio download                     # Download all cloud images
  studio fonts woff2 inter            # Convert _fonts/inter/ to woff2
  studio fonts assign inter --name heading  # Generate src/fonts/heading.ts
`)
    process.exit(0)
  }
}

// Validate workspace exists
if (!existsSync(workspace)) {
  console.error(`Error: Workspace path does not exist: ${workspace}`)
  process.exit(1)
}

// Check for CLI subcommands
const knownCommands = ['scan', 'process', 'push', 'download', 'fonts']
const command = args.find(a => !a.startsWith('-') && knownCommands.includes(a))

if (command) {
  // Remove command from args, also remove --workspace and its value, --port and its value
  const subArgs = []
  let skipNext = false
  for (const a of args) {
    if (skipNext) {
      skipNext = false
      continue
    }
    if (a === command) continue
    if (a === '--workspace' || a === '--port') {
      skipNext = true
      continue
    }
    if (a === '--open' || a === '-o') continue
    subArgs.push(a)
  }

  import('../dist/cli/index.js').then(mod => {
    mod.run(command, workspace, subArgs)
  }).catch(error => {
    console.error('CLI command failed:', error)
    process.exit(1)
  })
} else {
  // Check for public folder (only needed for server mode)
  const publicPath = resolve(workspace, 'public')
  if (!existsSync(publicPath)) {
    console.error(`Error: No 'public' folder found in workspace: ${workspace}`)
    console.error('Studio requires a public folder to manage media files.')
    process.exit(1)
  }

  // Start the server
  import('../dist/server/index.js').then((mod) => {
    mod.startServer({
      port,
      workspace,
      open: shouldOpen,
    })
  }).catch((error) => {
    console.error('Failed to start Studio server:', error)
    process.exit(1)
  })
}
