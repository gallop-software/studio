import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import type { FileItem, MetaEntry } from "../types";
import { getAllThumbnailPaths } from "../types";
import { loadMeta, saveMeta } from "./utils/meta";
import { getPublicPath, getWorkspacePath } from "../config";
import { jsonResponse } from "./utils/response";
import { isImageFile } from "./utils/files";

interface EditImageRequest {
  imagePath: string;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rotation: number; // 0, 90, 180, 270
  resize: {
    width: number;
    height: number;
  };
}

/**
 * Edit an image: crop, rotate, and resize
 * 
 * Order of operations:
 * 1. Apply EXIF rotation to normalize (matches browser display)
 * 2. Extract the cropped region (crop coords are from client's view)
 * 3. Rotate the cropped result
 * 4. Resize to final dimensions
 * 5. Save and update metadata
 */
export async function handleEditImage(request: Request) {
  try {
    const body = (await request.json()) as EditImageRequest;
    const { imagePath, crop, rotation, resize } = body;

    // Validate input
    if (!imagePath || !imagePath.startsWith("public/")) {
      return jsonResponse({ error: "Invalid image path" }, { status: 400 });
    }

    if (!isImageFile(path.basename(imagePath))) {
      return jsonResponse({ error: "Not an image file" }, { status: 400 });
    }

    // Check that the file exists locally
    const absolutePath = getWorkspacePath(imagePath);
    try {
      await fs.access(absolutePath);
    } catch {
      return jsonResponse(
        { error: "Image file not found locally. Download it first." },
        { status: 404 }
      );
    }

    // Read the original image
    const imageBuffer = await fs.readFile(absolutePath);
    
    // Step 1: Apply EXIF rotation first to normalize the image
    // This matches what the browser displays
    const exifCorrectedBuffer = await sharp(imageBuffer).rotate().toBuffer();
    const exifMeta = await sharp(exifCorrectedBuffer).metadata();
    const exifWidth = exifMeta.width || 0;
    const exifHeight = exifMeta.height || 0;

    // Step 2: Apply crop FIRST (extract region)
    // Crop coordinates are from the client's view (EXIF-corrected, non-rotated)
    const cropX = Math.max(0, Math.min(crop.x, exifWidth - 1));
    const cropY = Math.max(0, Math.min(crop.y, exifHeight - 1));
    const cropWidth = Math.min(crop.width, exifWidth - cropX);
    const cropHeight = Math.min(crop.height, exifHeight - cropY);

    let pipeline = sharp(exifCorrectedBuffer);
    
    // Only extract if crop is different from full image
    if (cropX > 0 || cropY > 0 || cropWidth < exifWidth || cropHeight < exifHeight) {
      pipeline = pipeline.extract({
        left: Math.round(cropX),
        top: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      });
    }

    // Step 3: Apply user rotation if any (90° increments) AFTER cropping
    if (rotation !== 0) {
      pipeline = pipeline.rotate(rotation);
    }

    // Step 4: Apply resize (if different from expected output)
    // Note: After rotation, dimensions may have swapped
    pipeline = pipeline.resize(resize.width, resize.height);

    // Determine output format based on original file extension
    const ext = path.extname(imagePath).toLowerCase();
    let finalBuffer: Buffer;
    
    if (ext === ".png") {
      finalBuffer = await pipeline.png({ quality: 85 }).toBuffer();
    } else if (ext === ".webp") {
      finalBuffer = await pipeline.webp({ quality: 85 }).toBuffer();
    } else if (ext === ".gif") {
      finalBuffer = await pipeline.gif().toBuffer();
    } else {
      // Default to JPEG for jpg/jpeg
      finalBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
    }

    // Get final dimensions
    const finalMeta = await sharp(finalBuffer).metadata();
    const finalWidth = finalMeta.width || resize.width;
    const finalHeight = finalMeta.height || resize.height;

    // 4. Save the edited image (overwrite original)
    await fs.writeFile(absolutePath, finalBuffer);

    // 5. Update metadata
    const meta = await loadMeta();
    const imageKey = "/" + imagePath.replace(/^public\//, "");
    const entry = meta[imageKey] as MetaEntry | undefined;

    // Update dimensions
    const updatedEntry: MetaEntry = {
      ...entry,
      o: { w: finalWidth, h: finalHeight },
    };

    // Clear thumbnail dimensions (they need regeneration)
    delete updatedEntry.sm;
    delete updatedEntry.md;
    delete updatedEntry.lg;
    delete updatedEntry.f;

    meta[imageKey] = updatedEntry;
    await saveMeta(meta);

    // 6. Delete old thumbnails
    const thumbnailPaths = getAllThumbnailPaths(imageKey);
    for (const thumbPath of thumbnailPaths) {
      const absoluteThumbPath = getPublicPath(thumbPath);
      try {
        await fs.unlink(absoluteThumbPath);
      } catch {
        // Thumbnail might not exist
      }
    }

    // 7. Build updated FileItem for response
    const stats = await fs.stat(absolutePath);
    const updatedItem: Partial<FileItem> = {
      name: path.basename(imagePath),
      path: imagePath,
      type: "file",
      size: stats.size,
      dimensions: { width: finalWidth, height: finalHeight },
      hasSm: false,
      hasMd: false,
      hasLg: false,
      hasFull: false,
      hasThumbnail: false,
      // Preserve CDN status from original entry
      cdnPushed: entry?.c !== undefined,
      isRemote: false, // If we're editing, it's local
      hasUpdate: entry?.c !== undefined, // If was on CDN, now has local update
    };

    return jsonResponse({
      success: true,
      updatedItem,
      dimensions: { width: finalWidth, height: finalHeight },
    });
  } catch (error) {
    console.error("Edit image error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(
      { error: `Failed to edit image: ${message}` },
      { status: 500 }
    );
  }
}
