import "server-only";
import sharp from "sharp";
import { getObjectBytes, deleteObject, publicBucket, publicUrl, putObject } from "@/lib/r2";

export const IMAGE_SIZES = { sm: 400, md: 800, lg: 1600 } as const;

export type ProcessedImage = {
  key: string; // key of the "lg" variant (canonical)
  url: string;
  width: number;
  height: number;
  blurDataUrl: string;
  variants: Record<keyof typeof IMAGE_SIZES, string>;
};

/**
 * Converts an uploaded original (already in R2 via presigned PUT) into WebP at 3 sizes,
 * stores the variants next to it, deletes the original, and returns metadata.
 * `crop` forces an aspect ratio (1 = square logo, 16/9 = banner).
 */
export async function processUploadedImage(originalKey: string, opts: { crop?: number } = {}): Promise<ProcessedImage> {
  const bucket = publicBucket();
  const input = await getObjectBytes(bucket, originalKey);
  let base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("Unreadable image");

  if (opts.crop) {
    const target = opts.crop;
    const ratio = meta.width / meta.height;
    const w = ratio > target ? Math.round(meta.height * target) : meta.width;
    const h = ratio > target ? meta.height : Math.round(meta.width / target);
    base = sharp(await base.extract({ left: Math.round((meta.width - w) / 2), top: Math.round((meta.height - h) / 2), width: w, height: h }).toBuffer());
  }

  const stem = originalKey.replace(/\.[^.]+$/, "");
  const variants = {} as Record<keyof typeof IMAGE_SIZES, string>;
  let lgInfo = { width: 0, height: 0 };
  for (const [name, width] of Object.entries(IMAGE_SIZES) as [keyof typeof IMAGE_SIZES, number][]) {
    const { data, info } = await base.clone().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const key = `${stem}-${name}.webp`;
    await putObject(bucket, key, data, "image/webp");
    variants[name] = publicUrl(key);
    if (name === "lg") lgInfo = { width: info.width, height: info.height };
  }
  const blur = await base.clone().resize(16).webp({ quality: 40 }).toBuffer();
  await deleteObject(bucket, originalKey).catch(() => {});

  return {
    key: `${stem}-lg.webp`,
    url: variants.lg,
    width: lgInfo.width,
    height: lgInfo.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    variants,
  };
}

/** Deletes all size variants of a processed image. */
export async function deleteImageVariants(lgKey: string) {
  const stem = lgKey.replace(/-lg\.webp$/, "");
  await Promise.all(Object.keys(IMAGE_SIZES).map((n) => deleteObject(publicBucket(), `${stem}-${n}.webp`).catch(() => {})));
}
