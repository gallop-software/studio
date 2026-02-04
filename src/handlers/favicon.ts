import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { jsonResponse } from "./utils/response";
import { getPublicPath, getSrcAppPath } from "../config";

/**
 * Generate favicon variants from a source image (streaming)
 *
 * Takes a favicon.png or favicon.jpg and generates:
 * - favicon.ico (48x48) - Classic ICO format
 * - icon.png (32x32) - Standard favicon
 * - apple-icon.png (180x180) - Apple touch icon
 *
 * All outputs are saved to src/app/ for Next.js metadata
 */

const FAVICON_CONFIGS = [
  { name: "favicon.ico", size: 48 },
  { name: "icon.png", size: 32 },
  { name: "apple-icon.png", size: 180 },
];

export async function handleGenerateFavicon(request: Request) {
  const encoder = new TextEncoder();

  let imagePath: string;
  try {
    const body = (await request.json()) as { imagePath: string };
    imagePath = body.imagePath;

    if (!imagePath) {
      return jsonResponse({ error: "No image path provided" }, { status: 400 });
    }
  } catch {
    return jsonResponse({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate filename is favicon.png or favicon.jpg
  const fileName = path.basename(imagePath).toLowerCase();
  if (fileName !== "favicon.png" && fileName !== "favicon.jpg") {
    return jsonResponse(
      {
        error: "Source file must be named favicon.png or favicon.jpg",
      },
      { status: 400 }
    );
  }

  // Build full path to source file
  const sourcePath = getPublicPath(imagePath.replace(/^\//, ""));

  // Check if source file exists
  try {
    await fs.access(sourcePath);
  } catch {
    return jsonResponse({ error: "Source file not found" }, { status: 404 });
  }

  // Verify the source is a valid image (apply EXIF rotation for accurate dimensions)
  let metadata;
  try {
    const rotatedBuffer = await sharp(sourcePath).rotate().toBuffer();
    metadata = await sharp(rotatedBuffer).metadata();
  } catch {
    return jsonResponse(
      { error: "Source file is not a valid image" },
      { status: 400 }
    );
  }

  // Output directory is src/app/
  const outputDir = getSrcAppPath();

  // Check output directory exists
  try {
    await fs.access(outputDir);
  } catch {
    return jsonResponse(
      {
        error: "Output directory src/app/ not found",
      },
      { status: 500 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const total = FAVICON_CONFIGS.length;
        const generated: string[] = [];
        const errors: string[] = [];

        sendEvent({
          type: "start",
          total,
          sourceSize: `${metadata.width}x${metadata.height}`,
        });

        for (let i = 0; i < FAVICON_CONFIGS.length; i++) {
          const config = FAVICON_CONFIGS[i];

          try {
            const outputPath = path.join(outputDir, config.name);

            await sharp(sourcePath)
              .rotate() // Apply EXIF rotation
              .resize(config.size, config.size, {
                fit: "cover",
                position: "center",
              })
              .png({ quality: 100 })
              .toFile(outputPath);

            generated.push(config.name);
            sendEvent({
              type: "progress",
              current: i + 1,
              total,
              processed: generated.length,
              percent: Math.round(((i + 1) / total) * 100),
              message: `Generated ${config.name}`,
            });
          } catch (error) {
            console.error(`Failed to generate ${config.name}:`, error);
            errors.push(config.name);
            sendEvent({
              type: "progress",
              current: i + 1,
              total,
              processed: generated.length,
              percent: Math.round(((i + 1) / total) * 100),
              message: `Failed: ${config.name}`,
            });
          }
        }

        // Build completion message
        let message = `Generated ${generated.length} favicon${
          generated.length !== 1 ? "s" : ""
        } to src/app/.`;
        if (errors.length > 0) {
          message += ` ${errors.length} failed.`;
        }

        sendEvent({
          type: "complete",
          processed: generated.length,
          errors: errors.length,
          message,
        });

        controller.close();
      } catch (error) {
        console.error("Favicon generation error:", error);
        sendEvent({ type: "error", message: "Failed to generate favicons" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
