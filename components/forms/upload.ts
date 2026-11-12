"use client";
import { requestUpload } from "@/app/actions/uploads";

type Scope = "business" | "claim" | "verification" | "ticket" | "avatar" | "content";

/** Downscales large images in the browser before upload (max 2400px, JPEG/WebP ~0.85). */
export async function compressImage(file: File, maxDim = 2400): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  } catch {
    return file;
  }
}

/**
 * Presigned direct upload to R2. Returns the object key to pass to a save action.
 * Throws an Error with a user-facing message on failure.
 */
export async function uploadFile(file: File, opts: { kind: "image" | "document"; scope: Scope; onProgress?: (pct: number) => void }) {
  const toSend = opts.kind === "image" ? await compressImage(file) : file;
  const res = await requestUpload({ kind: opts.kind, scope: opts.scope, fileName: toSend.name, contentType: toSend.type, size: toSend.size });
  if (!res.ok || !res.data) throw new Error(res.ok ? "Upload failed" : res.message);
  const { url, key } = res.data;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", toSend.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed. Please try again.")));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(toSend);
  });
  return { key, fileName: toSend.name, contentType: toSend.type, size: toSend.size };
}
