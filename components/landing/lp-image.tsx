"use client";
import { useState } from "react";

/** Plain <img> for admin-chosen URLs (any host); hides itself if the image fails to load. */
export function LpImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
