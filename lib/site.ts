/** Brand constants. Change NEXT_PUBLIC_BRAND_NAME to rename the product everywhere. */
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "LocalSpecific";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";

export const PAGE_SIZE = 18;
export const SITEMAP_PAGE_SIZE = 45_000;

export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
