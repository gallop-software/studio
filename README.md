# @gallop.software/studio

Media manager for Gallop templates. Upload, process, and sync images to Cloudflare R2 CDN.

## Features

- **Floating button** in dev mode opens a full-screen media manager
- **Upload images** with automatic thumbnail generation
- **Browse folders** with grid and list views
- **Multi-select** for batch operations
- **Sync to CDN** (Cloudflare R2) with automatic local cleanup
- **Blurhash** and dominant color extraction
- **Meta file** with full TypeScript types

## Installation

```bash
npm install @gallop.software/studio
```

## Quick Start

### 1. Add StudioProvider to your layout

```tsx
// src/app/layout.tsx
import { StudioProvider } from '@gallop.software/studio'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <StudioProvider />
      </body>
    </html>
  )
}
```

### 2. Create API routes

Create these files in your project:

```ts
// src/app/api/studio/list/route.ts
export { GET } from '@gallop.software/studio/api/list'

// src/app/api/studio/upload/route.ts
export { POST } from '@gallop.software/studio/api/upload'

// src/app/api/studio/delete/route.ts
export { POST } from '@gallop.software/studio/api/delete'

// src/app/api/studio/scan/route.ts
export { GET } from '@gallop.software/studio/api/scan'

// src/app/api/studio/sync/route.ts
export { POST } from '@gallop.software/studio/api/sync'

// src/app/api/studio/reprocess/route.ts
export { POST } from '@gallop.software/studio/api/reprocess'
```

### 3. Configure Cloudflare R2 (optional)

Add to your `.env.local`:

```bash
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket

# Default R2 URL or custom CDN domain
CLOUDFLARE_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### 4. Run your dev server

```bash
npm run dev
```

A floating button appears in the bottom-right corner. Click to open Studio.

## Using Images

```tsx
import { meta, getImageUrl, type ImageSize } from '@gallop.software/studio'

// Get image metadata
const hero = meta.images['hero.jpg']
console.log(hero.sizes.medium.width) // 700
console.log(hero.blurhash)           // "LEHV6nWB..."

// Get resolved URL (handles CDN vs local)
const url = getImageUrl('hero.jpg', 'medium')
// → "/images/hero-700.jpg" or "https://cdn.example.com/images/hero-700.jpg"
```

## Folder Structure

Studio manages these folders:

```
public/
├── originals/       # Source images (uploaded here)
│   └── hero.jpg
└── images/          # Generated thumbnails
    ├── hero.jpg     # Full size (optimized)
    ├── hero-1400.jpg # Large
    ├── hero-700.jpg  # Medium
    └── hero-300.jpg  # Small

_data/
└── _meta.json       # Image metadata
```

## Meta Schema

```json
{
  "$schema": "https://gallop.software/schemas/studio-meta.json",
  "version": 1,
  "generatedAt": "2026-01-24T12:00:00Z",
  "images": {
    "hero.jpg": {
      "original": {
        "path": "/originals/hero.jpg",
        "width": 2400,
        "height": 1600,
        "fileSize": 1245000
      },
      "sizes": {
        "full": { "path": "/images/hero.jpg", "width": 2400, "height": 1600 },
        "large": { "path": "/images/hero-1400.jpg", "width": 1400, "height": 934 },
        "medium": { "path": "/images/hero-700.jpg", "width": 700, "height": 467 },
        "small": { "path": "/images/hero-300.jpg", "width": 300, "height": 200 }
      },
      "blurhash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
      "dominantColor": "#a85c32",
      "cdn": null
    }
  }
}
```

## CDN Workflow

1. Upload image → saves to `originals/`, generates thumbnails
2. Click "Sync CDN" → uploads to R2, deletes local files
3. `meta.images[key].cdn.synced` becomes `true`
4. Image component uses CDN URL automatically

## License

MIT
