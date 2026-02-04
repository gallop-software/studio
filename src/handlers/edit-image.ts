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
 * 1. Rotate the image
 * 2. Extract the cropped region
 * 3. Resize to final dimensions
 * 4. Save and update metadata
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
    
    // Start with the image, applying EXIF rotation first
    let pipeline = sharp(imageBuffer).rotate();

    // 1. Apply rotation (if any)
    if (rotation !== 0) {
      pipeline = pipeline.rotate(rotation);
    }

    // Get metadata after rotation to understand dimensions
    const rotatedBuffer = await pipeline.toBuffer();
    const rotatedMeta = await sharp(rotatedBuffer).metadata();
    const rotatedWidth = rotatedMeta.width || 0;
    const rotatedHeight = rotatedMeta.height || 0;

    // 2. Apply crop (extract region)
    // Clamp crop values to valid range
    const cropX = Math.max(0, Math.min(crop.x, rotatedWidth - 1));
    const cropY = Math.max(0, Math.min(crop.y, rotatedHeight - 1));
    const cropWidth = Math.min(crop.width, rotatedWidth - cropX);
    const cropHeight = Math.min(crop.height, rotatedHeight - cropY);

    let croppedPipeline = sharp(rotatedBuffer);
    
    // Only extract if crop is different from full image
    if (cropX > 0 || cropY > 0 || cropWidth < rotatedWidth || cropHeight < rotatedHeight) {
      croppedPipeline = croppedPipeline.extract({
        left: Math.round(cropX),
        top: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      });
    }

    // 3. Apply resize (if different from crop dimensions)
    if (resize.width !== cropWidth || resize.height !== cropHeight) {
      croppedPipeline = croppedPipeline.resize(resize.width, resize.height);
    }

    // Determine output format based on original file extension
    const ext = path.extname(imagePath).toLowerCase();
    let finalBuffer: Buffer;
    
    if (ext === ".png") {
      finalBuffer = await croppedPipeline.png({ quality: 85 }).toBuffer();
    } else if (ext === ".webp") {
      finalBuffer = await croppedPipeline.webp({ quality: 85 }).toBuffer();
    } else if (ext === ".gif") {
      finalBuffer = await croppedPipeline.gif().toBuffer();
    } else {
      // Default to JPEG for jpg/jpeg
      finalBuffer = await croppedPipeline.jpeg({ quality: 85 }).toBuffer();
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
