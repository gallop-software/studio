# CLAUDE.md — Studio Package

## Build Commands

| Command | Purpose |
|---|---|
| `npm run build` | Full build (server + client) |
| `npm run build:server` | Server only (tsup) |
| `npm run build:client` | Client only (vite) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint check |
| `npm run dev` | Watch mode (server only) |

## Architecture Overview

- **Server**: Express 5 at `src/server/index.ts` — wraps Fetch API handlers for Express
- **Client**: React 19 + Emotion at `client/main.tsx` — standalone media manager UI
- **CLI**: Subcommands at `src/cli/` — headless operations (scan, process, push, download, fonts)
- **Handlers**: `src/handlers/` — each exports async functions taking `Request`, returning `Response`
- **Utilities**: `src/handlers/utils/` — shared helpers (meta I/O, CDN, thumbnails, SSE, cancellation)
- **Types**: `src/types.ts` — `MetaEntry`, `FileItem`, `FullMeta`, `LeanMeta`, etc.
- **Config**: `src/config/workspace.ts` — path resolution (`getPublicPath`, `getDataPath`, etc.)

## Key Patterns

### Handlers use Web API Request/Response

Handlers accept `Request` and return `Response` (Fetch API, not Express). The server wraps them:

```typescript
// Handler signature
export async function handleSomething(request: Request): Promise<Response>

// Server wraps with wrapHandler() to adapt Express ↔ Fetch API
```

### Streaming uses SSE

Batch operations return `ReadableStream` responses with JSON events:

```json
{ "type": "start", "total": 10 }
{ "type": "progress", "current": 1, "total": 10, "message": "Processing photo.jpg" }
{ "type": "cleanup", "message": "Removing temp files..." }
{ "type": "complete", "processed": 10, "errors": 0 }
{ "type": "error", "message": "Failed to process image" }
```

Use `createSSEStream()` from `src/handlers/utils/response.ts` to create streams. The `type` field is always one of: `start`, `progress`, `cleanup`, `complete`, `error`.

### Cancellation

Operations support cancellation via `operationId`:

```typescript
import { isOperationCancelled, cancelOperation } from './utils/cancellation'

// In handler loop:
if (isOperationCancelled(operationId)) break

// From cancel endpoint:
cancelOperation(operationId)
```

### Meta I/O

All metadata goes through `loadMeta()` / `saveMeta()` from `src/handlers/utils/meta.ts`:

- `saveMeta()` uses atomic writes (write to temp file, then rename)
- File paths in meta are relative to `public/` with leading slash: `/portfolio/hero.jpg`
- Special keys start with `_` (e.g. `_cdns`) — use `getFileEntries()` to iterate only file entries

### Workspace Resolution

`src/config/workspace.ts` provides path helpers:

| Function | Returns |
|----------|---------|
| `getWorkspace()` | `STUDIO_WORKSPACE` env var or `cwd()` |
| `getPublicPath(...)` | `<workspace>/public/<segments>` |
| `getDataPath(...)` | `<workspace>/_data/<segments>` |
| `getSrcAppPath(...)` | `<workspace>/src/app/<segments>` |
| `getWorkspacePath(...)` | `<workspace>/<segments>` |

### Image Processing

Thumbnails are generated via sharp (`src/handlers/utils/thumbnails.ts`):

- Sizes: sm (300px), md (700px), lg (1400px), full (2560px cap)
- JPEG quality: 85, PNG preserved as PNG
- Output path: `public/images/{original-path}-{size}.{ext}` (full has no suffix)
- EXIF rotation applied automatically

## Component Patterns

- CSS-in-JS via `@emotion/react` (`css` prop, not styled components)
- All component files use `/** @jsxImportSource @emotion/react */` pragma
- Design tokens in `src/components/tokens.ts` (colors, fonts, sizes)
- Modals: `ConfirmModal`, `InputModal`, `AlertModal`, `ProgressModal`
- Client consumes SSE via `useStreamingOperation` hook

### Component Hierarchy

```
StudioUI
├── StudioToolbar
├── StudioFileGrid / StudioFileList
├── StudioDetailView
├── FontsSection
│   ├── FontsToolbar
│   └── FontsGrid / FontsList
└── Modals
```

## Metadata (`_data/_studio.json`)

```json
{
  "_cdns": ["https://cdn.example.com"],
  "/photo.jpg": {
    "o": { "w": 2400, "h": 1600 },
    "sm": { "w": 300, "h": 200 },
    "md": { "w": 700, "h": 467 },
    "lg": { "w": 1400, "h": 934 },
    "f": { "w": 2400, "h": 1600 },
    "c": 0,
    "u": 1,
    "b": "LEHV6nWB2yk8pyo0adR*.7kCMdnj"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `_cdns` | `string[]` | CDN base URLs |
| `o` | `{ w, h }` | Original dimensions |
| `sm/md/lg/f` | `{ w, h }` | Thumbnail dimensions (presence = processed) |
| `c` | `number` | CDN index into `_cdns` array |
| `u` | `1` | Update pending (local overrides cloud) |
| `b` | `string` | Blurhash placeholder |

## CLI Commands

Entry: `bin/studio.mjs` → `dist/cli/index.ts`

Each command in `src/cli/{name}.ts` exports `run{Name}(args)`. CLI commands call the same utility functions as HTTP handlers (no code duplication).

| Command | Function | File |
|---------|----------|------|
| `scan` | `runScan(args)` | `src/cli/scan.ts` |
| `process` | `runProcess(args)` | `src/cli/process.ts` |
| `push` | `runPush(args)` | `src/cli/push.ts` |
| `download` | `runDownload(args)` | `src/cli/download.ts` |
| `fonts` | `runFonts(args)` | `src/cli/fonts.ts` |

## CDN (Cloudflare R2)

R2 operations in `src/handlers/utils/cdn.ts`:

- S3-compatible client (region: `auto`, endpoint: `https://{accountId}.r2.cloudflarestorage.com`)
- Upload retries: 3 attempts with exponential backoff
- `uploadToCdn()` uploads all thumbnail sizes for an image
- `deleteFromCdn()` / `deleteThumbnailsFromCdn()` for cleanup

## Do NOT

- Modify `_data/_studio.json` manually — always use `loadMeta()` / `saveMeta()`
- Use sync fs APIs in handlers — use async (promises) everywhere
- Add bare `catch {}` blocks — use `isFileNotFound()` from `utils/errors.ts` for ENOENT, log others
- Use `status` field in SSE events — always use `type` field
- Use styled components — use Emotion `css` prop

## Testing

No test suite currently. Verify with:

```bash
npm run build && npm run typecheck
```

Manual testing:

```bash
studio --workspace /path/to/project --open    # Web UI
studio scan --workspace /path/to/project      # CLI scan
```

## Publish Workflow

```bash
npm version patch|minor|major
git push
npm publish    # prepublishOnly runs build automatically
```
