# @gallop.software/studio

Standalone media manager for Gallop templates. Upload, process, and sync images to Cloudflare R2 CDN. Manage fonts with visual tools. Run headless via CLI.

## Features

### Media & Files

- **Standalone dev server** - runs on its own port, doesn't affect your app
- **Upload any file type** with drag-and-drop support and progress tracking
- **Automatic thumbnail generation** for images (sm, md, lg, full)
- **Browse folders** with grid and list views
- **Multi-select** for batch operations (delete, move, download)
- **Push to CDN** (Cloudflare R2) with automatic local cleanup
- **Cache purge** for custom CDN domains
- **Blurhash** generation for image placeholders
- **Image editing** - crop, resize, rotate, and adjust quality
- **Favicon generation** from any image
- **Featured image** generation with customizable options

### Font Management

- **Visual font browser** - browse and organize font files in `_fonts/` folder
- **Upload TTF fonts** - drag-and-drop with automatic folder organization
- **Compress to WOFF2** - automatic TTF to WOFF2 conversion
- **Assign to config files** - generate `src/fonts/*.ts` configuration files
- **Font weight detection** - automatically detect weights and styles from filenames
- **Folder status badges** - visual indicators for TTF-only, WOFF2-ready, and assigned folders
- **Batch operations** - rename folders, delete files, with streaming progress

### CLI Commands

- **Headless operation** - run scan, process, push, and download without the UI
- **Prefix filtering** - target specific folders (e.g. `studio process portfolio`)
- **Font conversion** - convert TTF/OTF to WOFF2 from the command line
- **Font assignment** - generate font config files without the UI

## Installation

```bash
npm install @gallop.software/studio --save-dev
```

## Quick Start

### 1. Add script to package.json

```json
{
  "scripts": {
    "studio": "studio"
  }
}
```

### 2. Run Studio

```bash
npm run studio
```

Studio opens in your browser on an available port (default 3001).

R2 credentials and other environment variables are loaded from `.env.local` in your project root.

## CLI Commands

All commands accept `--workspace <path>` to target a specific project (defaults to current directory).

### `studio`

Start the web UI server.

```bash
studio                              # Start on default port 3001
studio --port 4000                  # Custom port
studio --open                       # Auto-open browser
studio --workspace ~/my-project     # Target specific project
```

### `studio scan`

Scan the filesystem for new files not yet tracked in `_data/_studio.json`. Detects orphaned thumbnails in `public/images/`.

```bash
studio scan
```

### `studio process [prefix]`

Generate thumbnails (sm, md, lg, full) for unprocessed images. Optionally filter by path prefix.

```bash
studio process                      # Process all unprocessed images
studio process portfolio            # Process only images in /portfolio/
```

### `studio push [prefix]`

Upload local images and thumbnails to Cloudflare R2 CDN. Optionally filter by path prefix.

```bash
studio push                         # Push all local images to CDN
studio push portfolio               # Push only /portfolio/ images
```

### `studio download [prefix]`

Download cloud images from R2 to local storage. Optionally filter by path prefix.

```bash
studio download                     # Download all cloud images
studio download portfolio           # Download only /portfolio/ images
```

### `studio fonts woff2 <folder>`

Convert TTF/OTF fonts in `_fonts/<folder>/` to WOFF2 format.

```bash
studio fonts woff2 inter            # Convert _fonts/inter/ to woff2
```

### `studio fonts assign <folder> --name <name>`

Generate a `src/fonts/<name>.ts` configuration file from a font folder's WOFF2 files.

```bash
studio fonts assign inter --name heading    # Generate src/fonts/heading.ts
```

## Environment Variables

Variables are loaded from `.env.local` in your project root.

| Variable | Required | Description |
|----------|----------|-------------|
| `STUDIO_DEV_SITE_URL` | No | URL to your dev site (shown as link in header) |
| `NEXT_PUBLIC_PRODUCTION_URL` | No | Fallback for `STUDIO_DEV_SITE_URL` if not set |
| `CLOUDFLARE_R2_ACCOUNT_ID` | For CDN | Your Cloudflare account ID |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | For CDN | R2 API access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | For CDN | R2 API secret key |
| `CLOUDFLARE_R2_BUCKET_NAME` | For CDN | R2 bucket name |
| `CLOUDFLARE_R2_PUBLIC_URL` | For CDN | Public URL for your R2 bucket or custom domain |

## Setting Up Cloudflare R2

1. Go to Cloudflare Dashboard → R2 → Create bucket
2. Go to R2 → Manage R2 API Tokens → Create API Token
3. Copy the Access Key ID and Secret Access Key
4. Enable public access or set up a custom domain

## Font Management

Studio includes a visual interface for managing web fonts. Access it from the dropdown menu in the header.

### Font Workflow

1. **Upload TTF fonts** - Drag and drop TTF files into a folder (auto-creates folder from filename prefix)
2. **Select folder** - Click to select a font folder
3. **Assign Web Font** - Click to compress TTF→WOFF2 and generate `src/fonts/*.ts` config
4. **Use in layout** - Import the generated font config in your `src/app/layout.tsx`

### Font Folder Structure

```
_fonts/
├── barlow/
│   ├── barlow-regular.ttf
│   ├── barlow-regular.woff2
│   ├── barlow-bold.ttf
│   ├── barlow-bold.woff2
│   └── ...
├── montserrat/
│   └── ...
└── ...
```

### Font Config Files

Generated config files in `src/fonts/`:

```typescript
// src/fonts/body.ts
import localFont from 'next/font/local'

export const body = localFont({
  src: [
    { path: '../../_fonts/barlow/barlow-regular.woff2', weight: '400', style: 'normal' },
    { path: '../../_fonts/barlow/barlow-bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
})
```

## Architecture

### Directory Structure

```
studio/
├── bin/
│   └── studio.mjs              # CLI entry point (parses args, routes to server or CLI)
├── client/
│   └── main.tsx                # React app entry (standalone mode)
├── src/
│   ├── cli/                    # CLI subcommands
│   │   ├── index.ts            # Command dispatcher + progress helpers
│   │   ├── scan.ts             # runScan()
│   │   ├── process.ts          # runProcess()
│   │   ├── push.ts             # runPush()
│   │   ├── download.ts         # runDownload()
│   │   └── fonts.ts            # runFonts() → woff2, assign
│   ├── components/             # React UI
│   │   ├── StudioUI.tsx        # Main container
│   │   ├── StudioContext.tsx   # State provider
│   │   ├── useStudioActions.tsx # Action dispatchers
│   │   ├── useStreamingOperation.ts # SSE consumption hook
│   │   ├── tokens.ts           # Design tokens (colors, fonts, sizes)
│   │   └── ...                 # Toolbar, FileGrid, DetailView, Modals, Fonts
│   ├── config/
│   │   └── workspace.ts        # Path resolution (getPublicPath, getDataPath, etc.)
│   ├── handlers/               # HTTP handlers (Fetch API Request/Response)
│   │   ├── files.ts            # Upload, delete, rename, move, create folder
│   │   ├── images.ts           # Sync, reprocess, unprocess, download, push
│   │   ├── list.ts             # Browse, search, folder listing
│   │   ├── scan.ts             # Filesystem scan, orphan detection
│   │   ├── import.ts           # URL import, CDN management
│   │   ├── fonts.ts            # Font CRUD, woff2 conversion, assignment
│   │   ├── edit-image.ts       # Crop, resize, rotate
│   │   ├── favicon.ts          # Favicon generation
│   │   ├── featured-image.ts   # Featured image generation
│   │   └── utils/              # Shared utilities
│   │       ├── meta.ts         # loadMeta/saveMeta (atomic writes)
│   │       ├── response.ts     # jsonResponse, streamResponse, createSSEStream
│   │       ├── cancellation.ts # cancelOperation, isOperationCancelled
│   │       ├── cdn.ts          # R2 upload/download/delete/copy
│   │       ├── thumbnails.ts   # Image processing with sharp
│   │       ├── files.ts        # Slugify, file type detection
│   │       ├── folders.ts      # Empty folder cleanup
│   │       └── errors.ts       # isFileNotFound helper
│   ├── lib/
│   │   └── api.ts              # Typed API client (used by React components)
│   ├── server/
│   │   └── index.ts            # Express 5 server, route registration
│   └── types.ts                # TypeScript interfaces (MetaEntry, FileItem, etc.)
└── package.json
```

### Server

Express 5 app (`src/server/index.ts`) that:

1. Sets `STUDIO_WORKSPACE` env var from `--workspace` flag
2. Loads `.env.local` from the workspace
3. Registers API routes at `/api/studio/*`
4. Serves static files from `<workspace>/public/`
5. Serves the React client with injected globals (`__STUDIO_WORKSPACE__`, `__STUDIO_SITE_URL__`)

Handlers use **Web API `Request`/`Response`** (not Express req/res). The server wraps them with `wrapHandler()` which converts between Express and Fetch API conventions.

### Client

React 19 + Emotion (CSS-in-JS via `css` prop). Component hierarchy:

```
StudioUI
├── StudioToolbar (search, view toggle, actions)
├── StudioFileGrid / StudioFileList (browsing)
├── StudioDetailView (file info, thumbnails, CDN status)
├── FontsSection
│   ├── FontsToolbar
│   └── FontsGrid / FontsList
└── Modals (Confirm, Input, Alert, Progress)
```

State is managed via `StudioContext` (React context) with `useStudioActions` for dispatch.

### CLI

`bin/studio.mjs` parses args and either starts the server or dispatches to `src/cli/index.ts`. CLI commands reuse the same utility functions as HTTP handlers — no code duplication.

### Streaming

Batch operations use **Server-Sent Events (SSE)** via `createSSEStream()`. Events follow this protocol:

```json
{ "type": "start", "total": 10 }
{ "type": "progress", "current": 1, "total": 10, "message": "Processing photo.jpg" }
{ "type": "cleanup", "message": "Removing temp files..." }
{ "type": "complete", "processed": 10, "errors": 0 }
{ "type": "error", "message": "Failed to process image" }
```

The client consumes these via `useStreamingOperation` hook, which manages progress UI and cancellation.

### Configuration

Workspace resolution in `src/config/workspace.ts`:

| Function | Returns |
|----------|---------|
| `getWorkspace()` | `STUDIO_WORKSPACE` env var or `cwd()` |
| `getPublicPath(...)` | `<workspace>/public/<segments>` |
| `getDataPath(...)` | `<workspace>/_data/<segments>` |
| `getSrcAppPath(...)` | `<workspace>/src/app/<segments>` |
| `getWorkspacePath(...)` | `<workspace>/<segments>` |

## Metadata Schema

Studio stores image metadata in `_data/_studio.json`:

```json
{
  "_cdns": ["https://your-cdn.example.com"],
  "/hero.jpg": {
    "o": { "w": 2400, "h": 1600 },
    "b": "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
    "sm": { "w": 300, "h": 200 },
    "md": { "w": 700, "h": 467 },
    "lg": { "w": 1400, "h": 934 },
    "f": { "w": 2400, "h": 1600 },
    "c": 0
  }
}
```

### Property Reference

| Property | Type | Description |
|----------|------|-------------|
| `_cdns` | `string[]` | Array of CDN base URLs |
| `o` | `{ w, h }` | Original dimensions |
| `b` | `string` | Blurhash string for placeholder |
| `sm` | `{ w, h }` | Small thumbnail dimensions (300px width) |
| `md` | `{ w, h }` | Medium thumbnail dimensions (700px width) |
| `lg` | `{ w, h }` | Large thumbnail dimensions (1400px width) |
| `f` | `{ w, h }` | Full size dimensions (capped at 2560px width) |
| `c` | `number` | CDN index — references `_cdns` array |
| `u` | `1` | Update pending — local file overrides cloud version |

### File Lifecycle

1. **Upload** — file added to `public/`, entry created with `o` (dimensions)
2. **Process** — thumbnails generated in `public/images/`, entry gains `sm`/`md`/`lg`/`f`
3. **Push** — thumbnails uploaded to R2, entry gains `c` (CDN index)
4. **Cloud** — local thumbnails can be removed; CDN serves the images

Files with `u: 1` have local changes that haven't been pushed to CDN yet.

## Thumbnail Sizes

| Size | Max Width | Suffix | Path Convention |
|------|-----------|--------|-----------------|
| sm | 300px | `-sm` | `/images/{path}-sm.{ext}` |
| md | 700px | `-md` | `/images/{path}-md.{ext}` |
| lg | 1400px | `-lg` | `/images/{path}-lg.{ext}` |
| full | 2560px | *(none)* | `/images/{path}.{ext}` |

- PNG inputs produce PNG thumbnails; all others produce JPEG (quality 85)
- Thumbnails are stored in `public/images/` mirroring the original path structure

## API Reference

All endpoints are prefixed with `/api/studio/`.

### Browsing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/list` | List files/folders at a path |
| GET | `/search` | Search files by query |
| GET | `/list-folders` | List all folders |
| GET | `/count-images` | Count images by status |
| GET | `/folder-images` | Count images per folder |

### File Operations

| Method | Path | Streaming | Description |
|--------|------|-----------|-------------|
| POST | `/upload` | | Upload file (FormData) |
| POST | `/create-folder` | | Create new folder |
| POST | `/rename` | | Rename file/folder |
| POST | `/rename-stream` | SSE | Rename with progress |
| POST | `/delete` | | Delete files |
| POST | `/delete-stream` | SSE | Delete with progress |
| POST | `/move` | SSE | Move files to folder |

### Image Processing

| Method | Path | Streaming | Description |
|--------|------|-----------|-------------|
| POST | `/sync` | | Process single image |
| POST | `/sync-stream` | SSE | Process with progress |
| POST | `/reprocess-stream` | SSE | Regenerate thumbnails |
| POST | `/unprocess-stream` | SSE | Remove local thumbnails |
| POST | `/edit-image` | | Crop/resize/rotate |
| POST | `/scan` | SSE | Scan filesystem for changes |
| POST | `/delete-orphans` | | Remove orphaned thumbnails |

### CDN Operations

| Method | Path | Streaming | Description |
|--------|------|-----------|-------------|
| POST | `/push-updates-stream` | SSE | Push to R2 CDN |
| POST | `/download-stream` | SSE | Download from R2 |
| POST | `/cancel-stream` | | Cancel running operation |
| POST | `/cancel-updates` | | Cancel pending updates |
| GET | `/cdns` | | Get CDN URLs |
| POST | `/cdns` | | Update CDN URLs |
| POST | `/import` | SSE | Import from external URLs |

### Fonts

| Method | Path | Streaming | Description |
|--------|------|-----------|-------------|
| GET | `/fonts/list` | | List font folders |
| POST | `/fonts/upload` | | Upload font file (FormData) |
| POST | `/fonts/create-folder` | | Create font folder |
| POST | `/fonts/delete` | | Delete font file |
| POST | `/fonts/delete-stream` | SSE | Delete with progress |
| POST | `/fonts/rename` | | Rename font file/folder |
| POST | `/fonts/rename-stream` | SSE | Rename with progress |
| POST | `/fonts/scan` | | Scan font folders |
| GET | `/fonts/assignments` | | List font assignments |
| POST | `/fonts/assign-stream` | SSE | Generate font config |
| POST | `/fonts/delete-assignment` | | Delete font assignment |

### Other

| Method | Path | Streaming | Description |
|--------|------|-----------|-------------|
| POST | `/generate-favicon` | SSE | Generate favicon from image |
| POST | `/generate-featured-image` | SSE | Generate featured image |
| GET | `/check-featured-image` | | Check featured image status |
| GET | `/featured-image-options` | | Get featured image options |

## License

MIT
