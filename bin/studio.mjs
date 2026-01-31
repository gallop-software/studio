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

Options:
  --workspace <path>  Path to the project workspace (default: current directory)
  --port <number>     Port to run the server on (default: 3001)
  --open, -o          Open browser automatically
  --help, -h          Show this help message

Examples:
  studio                          # Run in current directory
  studio --workspace ~/my-project # Run for specific project
  studio --port 3002 --open       # Use custom port and open browser
`)
    process.exit(0)
  }
}

// Validate workspace exists
if (!existsSync(workspace)) {
  console.error(`Error: Workspace path does not exist: ${workspace}`)
  process.exit(1)
}

// Check for public folder
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
