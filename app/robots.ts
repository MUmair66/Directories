import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITEMAP_TYPES, sitemapCounts, sitemapIds } from "@/lib/data/sitemap";
import { SITE_URL } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  let ids: string[];
  try {
    ids = sitemapIds(await sitemapCounts());
  } catch {
    ids = SITEMAP_TYPES.map((t) => `${t}-0`);
  }
  const isProd = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;
  return {
    rules: isProd
      ? [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/search", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"] }]
      : [{ userAgent: "*", disallow: "/" }], // never index preview deployments
    sitemap: ids.map((id) => `${SITE_URL}/sitemap/${id}.xml`),
    host: SITE_URL,
  };
}
