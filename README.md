# @gallop.software/studio

Standalone media manager for Gallop templates. Upload, process, and sync images to Cloudflare R2 CDN. Manage fonts with visual tools.

## Features

### Media & Files

- **Standalone dev server** - runs on its own port, doesn't affect your app
- **Upload any file type** with drag-and-drop support and progress tracking
- **Automatic thumbnail generation** for images
- **Browse folders** with grid and list views
- **Multi-select** for batch operations (delete, move, download)
- **Push to CDN** (Cloudflare R2) with automatic local cleanup
- **Cache purge** for custom CDN domains
- **Blurhash** generation for image placeholders
- **Image editing** - crop, resize, rotate, and adjust quality

### Font Management

- **Visual font browser** - browse and organize font files in `_fonts/` folder
- **Upload TTF fonts** - drag-and-drop with automatic folder organization
- **Compress to WOFF2** - automatic TTF to WOFF2 conversion
- **Assign to config files** - generate `src/fonts/*.ts` configuration files
- **Font weight detection** - automatically detect weights and styles from filenames
- **Folder status badges** - visual indicators for TTF-only, WOFF2-ready, and assigned folders
- **Batch operations** - rename folders, delete files, with streaming progress

## Installation

```bash
npm install @gallop.software/studio --save-dev
```

## Quick Start

### 1. Create `.env.studio`

Create a `.env.studio` file in your project root:

```bash
# Dev site link (opens in new tab from Studio header)
STUDIO_DEV_SITE_URL=http://localhost:3000

# Cloudflare R2 Storage
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket
CLOUDFLARE_R2_PUBLIC_URL=https://your-cdn.example.com
```

Add `.env.studio` to your `.gitignore`.

### 2. Add script to package.json

```json
{
  "scripts": {
    "studio": "studio"
  }
}
```

### 3. Run Studio

```bash
npm run studio
```

Studio opens in your browser on an available port (default 3001).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STUDIO_DEV_SITE_URL` | No | URL to your dev site (shown as link in header) |
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

## Metadata

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

| Property | Description |
|----------|-------------|
| `o` | Original dimensions `{ w, h }` |
| `b` | Blurhash string |
| `sm/md/lg/f` | Thumbnail dimensions (small/medium/large/full) |
| `c` | CDN index (references `_cdns` array) |
| `u` | Update pending flag (local file overrides cloud) |

## License

MIT
