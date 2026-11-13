import type { Metadata } from "next";
import { BRAND_NAME, absoluteUrl } from "@/lib/site";

/** Unique title, description, canonical, Open Graph and Twitter tags for a page. */
export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string;
  /** Use the title as-is (skip the "| Brand" template). */
  absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const images = opts.image ? [{ url: opts.image }] : undefined;
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: BRAND_NAME,
      type: opts.type ?? "website",
      images,
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: opts.image ? [opts.image] : undefined },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
