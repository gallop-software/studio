import puppeteer from "puppeteer";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { config as loadEnv } from "dotenv";
import { jsonResponse } from "./utils/response";
import { getPublicPath, getWorkspacePath } from "../config";
import { loadMeta, saveMeta, setMetaEntry } from "./utils/meta";

/**
 * Parse an env file and return key-value pairs
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }
  return result;
}

/**
 * Generate featured image by screenshotting the homepage (streaming)
 *
 * Takes a screenshot of the project homepage and saves it as {project-name}.jpg
 * in the public folder. Useful for social previews, README, etc.
 *
 * The project name comes from package.json "name" field.
 * The homepage URL can be:
 * - Provided in the request body
 * - Read from package.json "homepage" field
 * - Falls back to STUDIO_DEV_SITE_URL env var
 * - Falls back to http://localhost:3000
 */

export async function handleGenerateFeaturedImage(request: Request) {
  const encoder = new TextEncoder();

  // Parse optional URL from request body
  let customUrl: string | undefined;
  try {
    const body = (await request.json()) as { url?: string };
    customUrl = body.url;
  } catch {
    // No body or invalid JSON is fine
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Read package.json to get homepage URL
        const packageJsonPath = getWorkspacePath("package.json");
        let homepageUrl =
          customUrl ||
          process.env.STUDIO_DEV_SITE_URL ||
          "http://localhost:3000";

        try {
          const packageJsonContent = await fs.readFile(packageJsonPath, "utf8");
          const packageJson = JSON.parse(packageJsonContent);
          if (!customUrl && packageJson.homepage) {
            homepageUrl = packageJson.homepage;
          }
        } catch {
          // package.json not found or invalid, use defaults
        }

        const outputPath = getPublicPath(`screenshot.jpg`);
        const relativePath = `public/screenshot.jpg`;

        sendEvent({
          type: "start",
          total: 4,
          url: homepageUrl,
          output: relativePath,
        });

        // Step 1: Launch browser
        sendEvent({
          type: "progress",
          current: 1,
          total: 4,
          percent: 25,
          message: "Launching browser...",
        });

        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        try {
          // Step 2: Navigate to page
          sendEvent({
            type: "progress",
            current: 2,
            total: 4,
            percent: 50,
            message: `Navigating to ${homepageUrl}...`,
          });

          const page = await browser.newPage();

          // Set viewport to 2000x1000 (2:1 aspect ratio for social previews)
          await page.setViewport({
            width: 2000,
            height: 1000,
            deviceScaleFactor: 2, // Retina display quality
          });

          await page.goto(homepageUrl, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          // Wait for animations/fonts to load
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Step 3: Take screenshot
          sendEvent({
            type: "progress",
            current: 3,
            total: 4,
            percent: 75,
            message: "Taking screenshot...",
          });

          await page.screenshot({
            path: outputPath,
            type: "jpeg",
            quality: 90,
          });

          // Step 4: Add to _studio.json
          sendEvent({
            type: "progress",
            current: 4,
            total: 4,
            percent: 95,
            message: "Updating metadata...",
          });

          // Get image dimensions using sharp
          const imageBuffer = await fs.readFile(outputPath);
          const metadata = await sharp(imageBuffer).metadata();
          const width = metadata.width || 0;
          const height = metadata.height || 0;

          // Add to _studio.json
          // Only set 'o' (original dimensions), not 'f' (full thumbnail)
          // because the featured image is stored at root level, not in /images/
          const meta = await loadMeta();
          const metaKey = `/screenshot.jpg`;
          setMetaEntry(meta, metaKey, {
            o: { w: width, h: height },
          });
          await saveMeta(meta);

          sendEvent({
            type: "complete",
            processed: 1,
            errors: 0,
            outputPath: relativePath,
            message: `Screenshot saved to ${relativePath}`,
          });
        } finally {
          await browser.close();
        }

        controller.close();
      } catch (error) {
        console.error("Featured image generation error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        sendEvent({
          type: "error",
          message: `Failed to generate screenshot: ${errorMessage}`,
        });
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

/**
 * Get URL options for featured image generation
 * Returns the dev URL from .env.local and production URL from .env.production
 */
export async function handleGetFeaturedImageOptions() {
  try {
    const packageJsonPath = getWorkspacePath("package.json");
    const envLocalPath = getWorkspacePath(".env.local");
    const envProductionPath = getWorkspacePath(".env.production");

    let projectName = "featured-image";
    let devUrl: string | null = null;
    let productionUrl: string | null = null;

    // Read project name from package.json
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf8");
      const packageJson = JSON.parse(packageJsonContent);
      projectName = packageJson.name || "featured-image";
    } catch {
      // package.json not found or invalid
    }

    // Read dev URL from .env.local
    try {
      const envLocalContent = await fs.readFile(envLocalPath, "utf8");
      const envLocal = parseEnvFile(envLocalContent);
      devUrl = envLocal.NEXT_PUBLIC_PRODUCTION_URL || null;
    } catch {
      // .env.local not found
    }

    // Read production URL from .env.production
    try {
      const envProductionContent = await fs.readFile(envProductionPath, "utf8");
      const envProduction = parseEnvFile(envProductionContent);
      productionUrl = envProduction.NEXT_PUBLIC_PRODUCTION_URL || null;
    } catch {
      // .env.production not found
    }

    return jsonResponse({
      projectName,
      devUrl,
      productionUrl,
    });
  } catch (error) {
    console.error("Get featured image options error:", error);
    return jsonResponse(
      { error: "Failed to get featured image options" },
      { status: 500 }
    );
  }
}

/**
 * Check if the featured image exists in _studio.json
 * Returns the expected filename and whether it exists
 */
export async function handleCheckFeaturedImage() {
  try {
    const expectedFilename = `screenshot.jpg`;
    const metaKey = `/screenshot.jpg`;

    // Check if the image exists in _studio.json
    const meta = await loadMeta();
    const exists = metaKey in meta && !Array.isArray(meta[metaKey]);

    return jsonResponse({
      filename: expectedFilename,
      exists,
    });
  } catch (error) {
    console.error("Check featured image error:", error);
    return jsonResponse(
      { error: "Failed to check featured image" },
      { status: 500 }
    );
  }
}
