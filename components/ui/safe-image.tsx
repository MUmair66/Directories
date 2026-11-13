"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * next/image that swaps to `fallback` if the image fails to load (missing file, slow origin,
 * optimizer timeout), so users never see a broken-image icon or alt text in an empty box.
 */
export function SafeImage({ fallback, ...props }: ImageProps & { fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return <Image {...props} onError={() => setFailed(true)} />;
}
