import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITEMAP_TYPES, parseSitemapId, sitemapCounts, sitemapEntries, sitemapIds } from "@/lib/data/sitemap";
import { absoluteUrl } from "@/lib/site";

/**
 * XML sitemaps split by type and paged at 45,000 URLs: /sitemap/businesses-0.xml,
 * /sitemap/cities-0.xml, ... Each file renders at request time from cached queries
 * (cacheLife "hours"), so new listings appear automatically.
 */
export async function generateSitemaps() {
  try {
    return sitemapIds(await sitemapCounts()).map((id) => ({ id }));
  } catch {
    // No database at build time: one file per type; extra pages appear on the next build.
    return SITEMAP_TYPES.map((type) => ({ id: `${type}-0` }));
  }
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  await connection();
  const parsed = parseSitemapId(String(await props.id));
  if (!parsed) return [];
  try {
    const entries = await sitemapEntries(parsed.type, parsed.page);
    return entries.map((e) => ({
      url: absoluteUrl(e.path),
      lastModified: e.lastModified ? new Date(e.lastModified) : undefined,
      changeFrequency: e.changeFrequency,
      priority: e.priority,
    }));
  } catch (e) {
    console.error("[sitemap]", e);
    return [];
  }
}
