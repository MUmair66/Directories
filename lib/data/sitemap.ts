import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { SITEMAP_PAGE_SIZE } from "@/lib/site";

export const SITEMAP_TYPES = ["static", "categories", "states", "cities", "city-categories", "businesses", "top-pros", "blog", "landing"] as const;
export type SitemapType = (typeof SITEMAP_TYPES)[number];
export type SitemapEntry = { path: string; lastModified?: string | null; priority?: number; changeFrequency?: "daily" | "weekly" | "monthly" };

const PUBLIC = sql`b.status = 'approved' and b.deleted_at is null`;
// City + category pages are indexable only with 3+ listings (thin pages are noindex).
const CITY_CATEGORY_FROM = sql`from listing_counts lc
  join categories cat on cat.id = lc.category_id and cat.parent_id is not null
  join cities c on c.id = lc.city_id join states st on st.id = c.state_id
  where lc.city_id is not null and lc.total >= 3`;

/** URL count per type, used to decide how many 45,000-URL sitemap files each type needs. */
export async function sitemapCounts(): Promise<Record<SitemapType, number>> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.counts, tags.listings);
  const r = await db.execute(sql`select
    (select count(*)::int from businesses b where ${PUBLIC}) as businesses,
    (select count(*)::int from listing_counts lc where lc.category_id is null and lc.city_id is not null) as cities,
    (select count(*)::int ${CITY_CATEGORY_FROM}) as city_categories`);
  const row = r.rows[0] as { businesses: number; cities: number; city_categories: number };
  return {
    static: 1,
    categories: 1,
    states: 1,
    "top-pros": 1,
    blog: 1,
    landing: 1,
    businesses: Number(row.businesses),
    cities: Number(row.cities),
    "city-categories": Number(row.city_categories),
  };
}

export function sitemapIds(counts: Record<SitemapType, number>) {
  return SITEMAP_TYPES.flatMap((type) => {
    const pages = Math.max(1, Math.ceil(counts[type] / SITEMAP_PAGE_SIZE));
    return Array.from({ length: pages }, (_, i) => `${type}-${i}`);
  });
}

export function parseSitemapId(id: string): { type: SitemapType; page: number } | null {
  const m = id.match(/^([a-z-]+)-(\d+)$/);
  if (!m || !(SITEMAP_TYPES as readonly string[]).includes(m[1]!)) return null;
  return { type: m[1] as SitemapType, page: Number(m[2]) };
}

const STATIC_PATHS = ["/", "/categories", "/states", "/top-pros", "/blog", "/pricing", "/contact", "/faqs", "/testimonials", "/terms", "/privacy"];

export async function sitemapEntries(type: SitemapType, page: number): Promise<SitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.listings, tags.counts, tags.categories, tags.locations, tags.content("blog"), tags.content("top-pros"));
  const limit = SITEMAP_PAGE_SIZE;
  const offset = page * SITEMAP_PAGE_SIZE;
  const rows = async (q: ReturnType<typeof sql>) => (await db.execute(q)).rows as { path: string; last: string | null }[];
  const map = (r: { path: string; last: string | null }[], priority: number, changeFrequency: SitemapEntry["changeFrequency"] = "weekly") =>
    r.map((x) => ({ path: x.path, lastModified: x.last, priority, changeFrequency }));

  switch (type) {
    case "static":
      return STATIC_PATHS.map((path) => ({ path, priority: path === "/" ? 1 : 0.6, changeFrequency: "weekly" as const }));
    case "categories":
      return map(
        await rows(sql`
          select '/categories/' || c.slug as path, c.updated_at::text as last from categories c where c.parent_id is null
          union all
          select '/category/' || p.slug || '/' || c.slug, c.updated_at::text from categories c join categories p on p.id = c.parent_id`),
        0.8,
      );
    case "states":
      return map(await rows(sql`select '/states/' || slug as path, updated_at::text as last from states order by name`), 0.8);
    case "cities":
      return map(
        await rows(sql`select '/states/' || st.slug || '/' || c.slug as path, c.updated_at::text as last
          from listing_counts lc join cities c on c.id = lc.city_id join states st on st.id = c.state_id
          where lc.category_id is null and lc.city_id is not null
          order by lc.total desc, c.id limit ${limit} offset ${offset}`),
        0.7,
      );
    case "city-categories":
      return map(
        await rows(sql`select '/states/' || st.slug || '/' || c.slug || '/' || cat.slug as path, null as last
          ${CITY_CATEGORY_FROM}
          order by lc.total desc, c.id, cat.id limit ${limit} offset ${offset}`),
        0.6,
      );
    case "businesses":
      return map(
        await rows(sql`select '/biz/' || b.slug as path, b.updated_at::text as last from businesses b
          where ${PUBLIC} order by b.id limit ${limit} offset ${offset}`),
        0.7,
        "weekly",
      );
    case "top-pros":
      return map(
        await rows(sql`
          select '/top-pros/' || p.slug as path, p.updated_at::text as last from top_pros_pages p where p.status = 'published'
          union all
          select distinct '/top-pros/' || st.slug, null from top_pros_pages p join states st on st.id = p.state_id where p.status = 'published'
          union all
          select distinct '/top-pros/' || st.slug || '/' || c.slug, null from top_pros_pages p
            join cities c on c.id = p.city_id join states st on st.id = c.state_id where p.status = 'published'`),
        0.6,
      );
    case "landing":
      return map(
        await rows(sql`select '/' || lp.slug as path, lp.updated_at::text as last from landing_pages lp
          join businesses b on b.id = lp.business_id
          where lp.status = 'published' and lp.deleted_at is null and ${PUBLIC}`),
        0.7,
      );
    case "blog":
      return map(
        await rows(sql`
          select '/blog/' || slug as path, updated_at::text as last from blog_posts where status = 'published'
          union all
          select '/blog/category/' || slug, null from blog_categories`),
        0.5,
        "monthly",
      );
  }
}
