import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { cacheLife } from "next/cache";
import { METERS_PER_MILE, type BBox } from "@/lib/geo";
import type { HoursRow } from "@/lib/hours";

export type ListingCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  avgRating: number;
  reviewCount: number;
  cityName: string;
  stateCode: string | null;
  categoryName: string | null;
  verified: boolean;
  claimed: boolean;
  featured: boolean;
  createdAt: string;
  /** Listed in the last 14 days (computed in SQL so render stays deterministic). */
  isNew: boolean;
  timezone: string;
  lat: number | null;
  lng: number | null;
  hideAddress: boolean;
  logoUrl: string | null;
  bannerUrl: string | null;
  hours: HoursRow[];
  distanceMiles: number | null;
};

export type SearchInput = {
  q?: string;
  stateId?: string;
  cityId?: string;
  categoryId?: string;
  zip?: string;
  minRating?: number;
  openNow?: boolean;
  verified?: boolean;
  posted?: "24h" | "3d" | "7d" | "30d";
  sort?: "relevance" | "rating" | "reviews" | "newest" | "name" | "distance" | "recent_reviews";
  page?: number;
  perPage?: number;
  /** Visitor location; enables distance output and the distance sort. */
  origin?: { lat: number; lng: number };
  /** Restrict to a radius around origin (miles). */
  radiusMiles?: number;
  bbox?: BBox;
  excludeId?: string;
};

const POSTED_INTERVAL = { "24h": "1 day", "3d": "3 days", "7d": "7 days", "30d": "30 days" } as const;

/** The public filter every listing query starts from (matches the partial index). */
export const PUBLIC_FILTER = sql`b.status = 'approved' and b.deleted_at is null`;

const CARD_COLUMNS = sql`
  b.id, b.slug, b.name, left(b.description, 600) as description, b.phone,
  b.avg_rating::float as "avgRating", b.review_count as "reviewCount",
  b.city_name as "cityName", s.code as "stateCode",
  (select c.name from business_categories bc join categories c on c.id = bc.category_id
     where bc.business_id = b.id order by bc.is_primary desc, c.name limit 1) as "categoryName",
  (b.verification_status = 'verified') as verified, b.claimed, b.featured,
  b.created_at as "createdAt", (b.created_at > now() - interval '14 days') as "isNew", b.timezone, b.lat, b.lng, b.hide_address as "hideAddress",
  (select m.url from media m where m.business_id = b.id and m.type = 'logo' order by m.sort_order limit 1) as "logoUrl",
  (select m.url from media m where m.business_id = b.id and m.type in ('banner', 'gallery')
     order by (m.type = 'banner') desc, m.sort_order limit 1) as "bannerUrl",
  coalesce((select json_agg(json_build_object(
     'day', h.day, 'openTime', h.open_time, 'closeTime', h.close_time,
     'isClosed', h.is_closed, 'is24h', h.is_24h, 'sequence', h.sequence))
     from business_hours h where h.business_id = b.id), '[]'::json) as hours`;

/** Open-now check evaluated in each business's own time zone. */
const OPEN_NOW = sql`exists (
  select 1 from business_hours h,
    lateral (select (now() at time zone b.timezone) as ts) l
  where h.business_id = b.id and not h.is_closed and (
    (h.day = extract(isodow from l.ts)::int - 1 and (
      h.is_24h
      or (h.close_time > h.open_time and l.ts::time >= h.open_time and l.ts::time < h.close_time)
      or (h.close_time <= h.open_time and l.ts::time >= h.open_time)))
    or (h.day = (extract(isodow from l.ts)::int + 5) % 7 and not h.is_24h
      and h.close_time <= h.open_time and l.ts::time < h.close_time)
  ))`;

function buildWhere(input: SearchInput, tsq: SQL | null, qText: string | null) {
  const where: SQL[] = [PUBLIC_FILTER];
  if (tsq && qText) {
    where.push(sql`(b.search_vector @@ ${tsq}
      or ${qText} <% f_unaccent(lower(b.name || ' ' || b.category_names)))`);
  }
  if (input.stateId) where.push(sql`b.state_id = ${input.stateId}`);
  if (input.cityId) where.push(sql`b.city_id = ${input.cityId}`);
  if (input.zip) where.push(sql`b.zip = ${input.zip}`);
  if (input.categoryId) {
    where.push(sql`exists (select 1 from business_categories bc join categories c on c.id = bc.category_id
      where bc.business_id = b.id and (c.id = ${input.categoryId} or c.parent_id = ${input.categoryId}))`);
  }
  if (input.minRating) where.push(sql`b.avg_rating >= ${input.minRating}`);
  if (input.verified) where.push(sql`b.verification_status = 'verified'`);
  if (input.posted) where.push(sql`b.created_at >= now() - ${POSTED_INTERVAL[input.posted]}::interval`);
  if (input.openNow) where.push(OPEN_NOW);
  if (input.excludeId) where.push(sql`b.id <> ${input.excludeId}`);
  if (input.origin && input.radiusMiles) {
    where.push(sql`ST_DWithin(b.location, ST_SetSRID(ST_MakePoint(${input.origin.lng}, ${input.origin.lat}), 4326)::geography, ${input.radiusMiles * METERS_PER_MILE})`);
  }
  if (input.bbox) {
    const { west, south, east, north } = input.bbox;
    where.push(sql`b.location && ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)::geography`);
  }
  return sql.join(where, sql` and `);
}

/**
 * Listing search: full-text (websearch_to_tsquery + ts_rank) blended with trigram word similarity
 * for typos ("plumer" -> "plumber"), PostGIS distance, and filters. One query returns the page
 * plus the total count (window function), so listing pages never run N+1 queries.
 */
export async function searchBusinesses(input: SearchInput): Promise<{ items: ListingCard[]; total: number }> {
  const perPage = input.perPage ?? 18;
  const page = Math.max(1, input.page ?? 1);
  const qText = input.q?.trim() ? input.q.trim().toLowerCase() : null;
  const tsq = qText ? sql`websearch_to_tsquery('english', f_unaccent(${qText}))` : null;
  const origin = input.origin;

  const distance = origin
    ? sql`(ST_Distance(b.location, ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography) / ${METERS_PER_MILE})`
    : sql`null::float`;
  const rank = tsq
    ? sql`(ts_rank(b.search_vector, ${tsq}) + word_similarity(${qText}, f_unaccent(lower(b.name || ' ' || b.category_names))) * 0.6)`
    : sql`0`;

  const sort = input.sort === "distance" && !origin ? "relevance" : (input.sort ?? "relevance");
  const orderBy = {
    relevance: tsq
      ? sql`rank desc, b.featured desc, b.avg_rating desc, b.review_count desc`
      : sql`b.featured desc, b.avg_rating desc, b.review_count desc, b.id`,
    rating: sql`b.avg_rating desc, b.review_count desc, b.id`,
    reviews: sql`b.review_count desc, b.avg_rating desc, b.id`,
    newest: sql`b.created_at desc, b.id`,
    name: sql`lower(b.name) asc, b.id`,
    distance: sql`distance_miles asc nulls last, b.id`,
    recent_reviews: sql`b.last_review_at desc nulls last, b.id`,
  }[sort];

  const result = await db.execute(sql`
    select ${CARD_COLUMNS}, ${distance} as "distanceMiles", ${rank} as rank,
      ${distance} as distance_miles, count(*) over() as total
    from businesses b
    left join states s on s.id = b.state_id
    where ${buildWhere(input, tsq, qText)}
    order by ${orderBy}
    limit ${perPage} offset ${(page - 1) * perPage}`);

  const rows = result.rows as (ListingCard & { total: string | number })[];
  return {
    items: rows.map(({ total: _t, ...r }) => ({ ...r, avgRating: Number(r.avgRating) })),
    total: rows.length ? Number(rows[0]!.total) : page > 1 ? await countOnly(input, tsq, qText) : 0,
  };
}

async function countOnly(input: SearchInput, tsq: SQL | null, qText: string | null) {
  const r = await db.execute(sql`select count(*)::int as n from businesses b where ${buildWhere(input, tsq, qText)}`);
  return Number((r.rows[0] as { n: number }).n);
}

export type MapMarker = { id: string; slug: string; name: string; lat: number; lng: number; avgRating: number; reviewCount: number };

/** Map view: markers inside the visible bounding box (max 200). */
export async function mapMarkers(input: SearchInput & { bbox: BBox }): Promise<MapMarker[]> {
  const qText = input.q?.trim() ? input.q.trim().toLowerCase() : null;
  const tsq = qText ? sql`websearch_to_tsquery('english', f_unaccent(${qText}))` : null;
  const r = await db.execute(sql`
    select b.id, b.slug, b.name, b.lat, b.lng, b.avg_rating::float as "avgRating", b.review_count as "reviewCount"
    from businesses b
    where ${buildWhere(input, tsq, qText)} and b.lat is not null and not b.hide_address
    order by b.featured desc, b.avg_rating desc
    limit 200`);
  return r.rows as MapMarker[];
}

export type Suggestion = {
  type: "category" | "business" | "city" | "state" | "zip";
  label: string;
  sublabel?: string;
  href: string;
  value: string;
};

/** "What" autocomplete: categories + business names. Popular prefixes cached in Redis for 10 minutes. */
export async function suggestWhat(prefix: string): Promise<Suggestion[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
  const q = prefix.trim().toLowerCase().slice(0, 60);
  if (q.length < 2) return [];
  const r = await db.execute(sql`
    (select 'category' as type, c.name as label, p.name as sublabel, c.slug as slug, null as extra,
        greatest(similarity(f_unaccent(lower(c.name)), f_unaccent(${q})), case when lower(c.name) like ${q + "%"} then 1 else 0 end) as score
      from categories c left join categories p on p.id = c.parent_id
      where f_unaccent(lower(c.name)) % f_unaccent(${q}) or f_unaccent(lower(c.name)) like f_unaccent(${"%" + q + "%"})
      order by score desc limit 4)
    union all
    (select 'business', b.name, b.city_name || coalesce(', ' || s.code, ''), b.slug, null,
        greatest(similarity(f_unaccent(lower(b.name)), f_unaccent(${q})), case when lower(b.name) like ${q + "%"} then 1 else 0 end)
      from businesses b left join states s on s.id = b.state_id
      where ${PUBLIC_FILTER} and (f_unaccent(lower(b.name)) % f_unaccent(${q}) or f_unaccent(lower(b.name)) like f_unaccent(${"%" + q + "%"}))
      order by 6 desc, b.review_count desc limit 4)`);
  return (r.rows as { type: "category" | "business"; label: string; sublabel: string | null; slug: string }[])
    .slice(0, 8)
    .map((row) =>
      row.type === "category"
        ? { type: "category", label: row.label, sublabel: row.sublabel ?? "Category", href: `/search?category=${row.slug}`, value: row.label }
        : { type: "business", label: row.label, sublabel: row.sublabel ?? undefined, href: `/biz/${row.slug}`, value: row.label },
    );
}

/** "Where" autocomplete: cities, states and ZIP codes. */
export async function suggestWhere(prefix: string): Promise<Suggestion[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
  const q = prefix.trim().toLowerCase().slice(0, 60);
  if (q.length < 2) return [];
  if (/^\d{3,5}$/.test(q)) {
    const r = await db.execute(sql`
      select distinct b.zip, b.city_name, s.code from businesses b left join states s on s.id = b.state_id
      where ${PUBLIC_FILTER} and b.zip like ${q + "%"} limit 8`);
    return (r.rows as { zip: string; city_name: string; code: string }[]).map((z) => ({
      type: "zip" as const,
      label: z.zip,
      sublabel: `${z.city_name}, ${z.code}`,
      href: `/search?location=${z.zip}`,
      value: z.zip,
    }));
  }
  const cityPart = q.split(",")[0]!.trim();
  const r = await db.execute(sql`
    (select 'state' as type, s.name as label, s.code as code, s.slug as slug, null as state_slug, 2.0 as score
      from states s where lower(s.name) like ${cityPart + "%"} or lower(s.code) = ${cityPart} limit 2)
    union all
    (select 'city', c.name, s.code, c.slug, s.slug,
        greatest(similarity(f_unaccent(lower(c.name)), f_unaccent(${cityPart})), case when lower(c.name) like ${cityPart + "%"} then 1 else 0 end)
          + coalesce(log(greatest(c.population, 1)) / 20, 0)
      from cities c join states s on s.id = c.state_id
      where f_unaccent(lower(c.name)) % f_unaccent(${cityPart}) or lower(c.name) like ${cityPart + "%"}
      order by 6 desc limit 6)`);
  return (r.rows as { type: "state" | "city"; label: string; code: string; slug: string; state_slug: string | null }[]).map((row) =>
    row.type === "state"
      ? { type: "state", label: row.label, sublabel: "State", href: `/states/${row.slug}`, value: row.label }
      : { type: "city", label: `${row.label}, ${row.code}`, sublabel: "City", href: `/states/${row.state_slug}/${row.slug}`, value: `${row.label}, ${row.code}` },
  );
}

export type ResolvedLocation = { stateId?: string; cityId?: string; zip?: string; label: string; lat?: number; lng?: number };

/** Turns free text like "Chicago, IL", "Texas" or "60601" into filter IDs. */
export async function resolveLocation(text: string): Promise<ResolvedLocation | null> {
  const t = text.trim();
  if (!t) return null;
  if (/^\d{5}$/.test(t)) return { zip: t, label: t };
  const [cityRaw, stateRaw] = t.split(",").map((p) => p.trim().toLowerCase());
  if (!stateRaw) {
    const st = await db.execute(sql`select id, name, lat, lng from states where lower(name) = ${cityRaw} or lower(code) = ${cityRaw} limit 1`);
    const s = st.rows[0] as { id: string; name: string; lat: number; lng: number } | undefined;
    if (s) return { stateId: s.id, label: s.name, lat: s.lat, lng: s.lng };
  }
  const r = await db.execute(sql`
    select c.id, c.name, c.lat, c.lng, s.id as state_id, s.code from cities c join states s on s.id = c.state_id
    where f_unaccent(lower(c.name)) = f_unaccent(${cityRaw})
      ${stateRaw ? sql`and (lower(s.code) = ${stateRaw} or lower(s.name) = ${stateRaw})` : sql``}
    order by c.population desc nulls last limit 1`);
  const c = r.rows[0] as { id: string; name: string; lat: number; lng: number; state_id: string; code: string } | undefined;
  return c ? { cityId: c.id, stateId: c.state_id, label: `${c.name}, ${c.code}`, lat: c.lat, lng: c.lng } : null;
}

