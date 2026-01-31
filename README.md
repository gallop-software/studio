# @gallop.software/studio

Standalone media manager for Gallop templates. Upload, process, and sync images to Cloudflare R2 CDN.

## Features

- **Standalone dev server** - runs on its own port, doesn't affect your app
- **Upload images** with automatic thumbnail generation
- **Browse folders** with grid and list views
- **Multi-select** for batch operations
- **Push to CDN** (Cloudflare R2) with automatic local cleanup
- **Cache purge** for custom CDN domains
- **Blurhash** generation for image placeholders

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

# Cloudflare Cache Purge (optional, for custom domains)
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
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
| `CLOUDFLARE_ZONE_ID` | For cache purge | Cloudflare zone ID for cache purge |
| `CLOUDFLARE_API_TOKEN` | For cache purge | API token with Cache Purge permission |

## Setting Up Cloudflare R2

1. Go to Cloudflare Dashboard → R2 → Create bucket
2. Go to R2 → Manage R2 API Tokens → Create API Token
3. Copy the Access Key ID and Secret Access Key
4. Enable public access or set up a custom domain

## Setting Up Cache Purge (Custom Domains)

If using a custom domain for your CDN:

1. Go to Cloudflare Dashboard → select your domain → copy Zone ID from sidebar
2. Go to Account → API Tokens → Create Token
3. Add permission: Zone → Cache Purge → Edit
4. Copy the token value

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
