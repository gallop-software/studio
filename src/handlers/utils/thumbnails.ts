import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import type { MetaEntry, Dimensions } from "../../types";
import { getPublicPath } from "../../config";

export const FULL_MAX_WIDTH = 2560;

export const DEFAULT_SIZES: Record<
  string,
  { width: number; suffix: string; key: "sm" | "md" | "lg" }
> = {
  small: { width: 300, suffix: "-sm", key: "sm" },
  medium: { width: 700, suffix: "-md", key: "md" },
  large: { width: 1400, suffix: "-lg", key: "lg" },
};

export async function processImage(
  buffer: Buffer,
  imageKey: string
): Promise<MetaEntry> {
  // Apply EXIF rotation first to get correct dimensions
  // Many cameras store images rotated with EXIF metadata to display correctly
  const rotatedBuffer = await sharp(buffer).rotate().toBuffer();
  const metadata = await sharp(rotatedBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;
  const ratio = originalHeight / originalWidth;

  // Remove leading slash for path operations
  const keyWithoutSlash = imageKey.startsWith("/")
    ? imageKey.slice(1)
    : imageKey;
  const baseName = path.basename(
    keyWithoutSlash,
    path.extname(keyWithoutSlash)
  );
  const ext = path.extname(keyWithoutSlash).toLowerCase();
  const imageDir = path.dirname(keyWithoutSlash);

  const imagesPath = getPublicPath("images", imageDir === "." ? "" : imageDir);
  await fs.mkdir(imagesPath, { recursive: true });

  const isPng = ext === ".png";
  const outputExt = isPng ? ".png" : ".jpg";

  // Build the result entry
  const entry: MetaEntry = {
    o: { w: originalWidth, h: originalHeight },
  };

  // Generate full size (capped at FULL_MAX_WIDTH)
  const fullFileName =
    imageDir === "."
      ? `${baseName}${outputExt}`
      : `${imageDir}/${baseName}${outputExt}`;
  const fullPath = getPublicPath("images", fullFileName);

  let fullWidth = originalWidth;
  let fullHeight = originalHeight;

  if (originalWidth > FULL_MAX_WIDTH) {
    fullWidth = FULL_MAX_WIDTH;
    fullHeight = Math.round(FULL_MAX_WIDTH * ratio);
    if (isPng) {
      await sharp(rotatedBuffer)
        .resize(fullWidth, fullHeight)
        .png({ quality: 85 })
        .toFile(fullPath);
    } else {
      await sharp(rotatedBuffer)
        .resize(fullWidth, fullHeight)
        .jpeg({ quality: 85 })
        .toFile(fullPath);
    }
  } else {
    if (isPng) {
      await sharp(rotatedBuffer).png({ quality: 85 }).toFile(fullPath);
    } else {
      await sharp(rotatedBuffer).jpeg({ quality: 85 }).toFile(fullPath);
    }
  }
  entry.f = { w: fullWidth, h: fullHeight };

  // Generate thumbnail sizes
  for (const [, sizeConfig] of Object.entries(DEFAULT_SIZES)) {
    const { width: maxWidth, suffix, key } = sizeConfig;
    if (originalWidth <= maxWidth) {
      continue; // Skip if original is smaller than this size
    }

    const newHeight = Math.round(maxWidth * ratio);
    const sizeFileName = `${baseName}${suffix}${outputExt}`;
    const sizeFilePath =
      imageDir === "." ? sizeFileName : `${imageDir}/${sizeFileName}`;
    const sizePath = getPublicPath("images", sizeFilePath);

    if (isPng) {
      await sharp(rotatedBuffer)
        .resize(maxWidth, newHeight)
        .png({ quality: 80 })
        .toFile(sizePath);
    } else {
      await sharp(rotatedBuffer)
        .resize(maxWidth, newHeight)
        .jpeg({ quality: 80 })
        .toFile(sizePath);
    }

    entry[key] = { w: maxWidth, h: newHeight };
  }

  return entry;
}
