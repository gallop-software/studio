import sharp from "sharp";
import {
  loadMeta,
  saveMeta,
  getOrAddCdnIndex,
  getMetaEntry,
  setMetaEntry,
} from "./utils";
import { isOperationCancelled, clearCancelledOperation } from "./images";
import type { Dimensions } from "../types";

/**
 * Parse an image URL into base URL and path
 */
function parseImageUrl(url: string): { base: string; path: string } {
  const parsed = new URL(url);
  // Base is protocol + host
  const base = `${parsed.protocol}//${parsed.host}`;
  // Path is everything after
  const path = parsed.pathname;
  return { base, path };
}

/**
 * Fetch remote image and get dimensions
 */
async function processRemoteImage(
  url: string
): Promise<{ o: Dimensions; b?: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Apply EXIF rotation to get correct dimensions
  const rotatedBuffer = await sharp(buffer).rotate().toBuffer();
  const metadata = await sharp(rotatedBuffer).metadata();

  return {
    o: { w: metadata.width || 0, h: metadata.height || 0 },
    // b: blur hash would be generated here if needed
  };
}

/**
 * Streaming endpoint to import images from URLs
 */
export async function handleImportUrls(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Controller may be closed
        }
      };

      try {
        const { urls, operationId } = (await request.json()) as {
          urls: string[];
          operationId?: string;
        };

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          sendEvent({ type: "error", message: "No URLs provided" });
          controller.close();
          return;
        }

        // Helper to check if operation was cancelled
        const isCancelled = () =>
          operationId ? isOperationCancelled(operationId) : false;

        const meta = await loadMeta();
        const added: string[] = [];
        const skipped: string[] = [];
        const errors: string[] = [];

        const total = urls.length;
        sendEvent({ type: "start", total });

        for (let i = 0; i < urls.length; i++) {
          // Check for cancellation before each URL
          if (isCancelled()) {
            await saveMeta(meta);
            if (operationId) clearCancelledOperation(operationId);
            sendEvent({
              type: "complete",
              added: added.length,
              skipped: skipped.length,
              errors: errors.length,
              message: `Stopped. Imported ${added.length} URL${
                added.length !== 1 ? "s" : ""
              }.`,
              cancelled: true,
            });
            controller.close();
            return;
          }

          const url = urls[i].trim();
          if (!url) continue;

          try {
            // Parse URL to get base and path
            const { base, path } = parseImageUrl(url);

            // Check if this path already exists in meta
            const existingEntry = getMetaEntry(meta, path);
            if (existingEntry) {
              skipped.push(path);
              sendEvent({
                type: "progress",
                current: i + 1,
                total,
                imported: added.length,
                percent: Math.round(((i + 1) / total) * 100),
                currentFile: url,
              });
              continue;
            }

            // Get or add CDN URL to _cdns array
            const cdnIndex = getOrAddCdnIndex(meta, base);

            // Fetch and process the image
            const imageData = await processRemoteImage(url);

            // Add entry to meta
            // Note: No thumbnail dims since this is an external image, not processed locally
            setMetaEntry(meta, path, {
              o: imageData.o,
              b: imageData.b,
              c: cdnIndex,
            });

            // Save meta incrementally after each successful import
            await saveMeta(meta);

            added.push(path);
            sendEvent({
              type: "progress",
              current: i + 1,
              total,
              imported: added.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: url,
            });
          } catch (error) {
            console.error(`Failed to import ${url}:`, error);
            errors.push(url);
            sendEvent({
              type: "progress",
              current: i + 1,
              total,
              imported: added.length,
              percent: Math.round(((i + 1) / total) * 100),
              currentFile: url,
            });
          }
        }

        await saveMeta(meta);
        if (operationId) clearCancelledOperation(operationId);

        sendEvent({
          type: "complete",
          added: added.length,
          skipped: skipped.length,
          errors: errors.length,
        });
      } catch (error) {
        console.error("Import failed:", error);
        sendEvent({ type: "error", message: "Import failed" });
      } finally {
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
 * Get CDN URLs for settings
 */
export async function handleGetCdns() {
  try {
    const meta = await loadMeta();
    const cdns = meta._cdns || [];

    return Response.json({ cdns });
  } catch (error) {
    console.error("Failed to get CDNs:", error);
    return Response.json({ error: "Failed to get CDNs" }, { status: 500 });
  }
}

/**
 * Update CDN URLs from settings
 */
export async function handleUpdateCdns(request: Request) {
  try {
    const { cdns } = (await request.json()) as { cdns: string[] };

    if (!Array.isArray(cdns)) {
      return Response.json({ error: "Invalid CDN array" }, { status: 400 });
    }

    const meta = await loadMeta();

    // Normalize URLs (remove trailing slashes)
    meta._cdns = cdns.map((url) => url.replace(/\/$/, ""));

    await saveMeta(meta);

    return Response.json({ success: true, cdns: meta._cdns });
  } catch (error) {
    console.error("Failed to update CDNs:", error);
    return Response.json({ error: "Failed to update CDNs" }, { status: 500 });
  }
}
