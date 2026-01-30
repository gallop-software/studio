import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

/**
 * Generate favicon variants from a source image
 * 
 * Takes a favicon.png or favicon.jpg and generates:
 * - favicon.ico (48x48) - Classic ICO format
 * - icon.png (32x32) - Standard favicon
 * - apple-icon.png (180x180) - Apple touch icon
 * 
 * All outputs are saved to src/app/ for Next.js metadata
 */

const FAVICON_CONFIGS = [
  { name: 'favicon.ico', size: 48 },
  { name: 'icon.png', size: 32 },
  { name: 'apple-icon.png', size: 180 },
]

export async function handleGenerateFavicon(request: NextRequest) {
  try {
    const body = await request.json() as { imagePath: string }
    const { imagePath } = body

    if (!imagePath) {
      return NextResponse.json({ error: 'No image path provided' }, { status: 400 })
    }

    // Validate filename is favicon.png or favicon.jpg
    const fileName = path.basename(imagePath).toLowerCase()
    if (fileName !== 'favicon.png' && fileName !== 'favicon.jpg') {
      return NextResponse.json({ 
        error: 'Source file must be named favicon.png or favicon.jpg' 
      }, { status: 400 })
    }

    // Build full path to source file
    const sourcePath = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''))
    
    // Check if source file exists
    try {
      await fs.access(sourcePath)
    } catch {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 })
    }

    // Verify the source is a valid image
    let metadata
    try {
      metadata = await sharp(sourcePath).metadata()
    } catch {
      return NextResponse.json({ error: 'Source file is not a valid image' }, { status: 400 })
    }

    // Output directory is src/app/
    const outputDir = path.join(process.cwd(), 'src', 'app')
    
    // Check output directory exists
    try {
      await fs.access(outputDir)
    } catch {
      return NextResponse.json({ 
        error: 'Output directory src/app/ not found' 
      }, { status: 500 })
    }

    const results: { name: string; size: number; success: boolean; error?: string }[] = []

    for (const config of FAVICON_CONFIGS) {
      try {
        const outputPath = path.join(outputDir, config.name)
        
        await sharp(sourcePath)
          .resize(config.size, config.size, {
            fit: 'cover',
            position: 'center',
          })
          .png({ quality: 100 })
          .toFile(outputPath)

        results.push({
          name: config.name,
          size: config.size,
          success: true,
        })
      } catch (error) {
        results.push({
          name: config.name,
          size: config.size,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failCount === 0,
      message: `Generated ${successCount} favicon${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      sourceSize: `${metadata.width}x${metadata.height}`,
      results,
    })
  } catch (error) {
    console.error('Favicon generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate favicons' 
    }, { status: 500 })
  }
}
