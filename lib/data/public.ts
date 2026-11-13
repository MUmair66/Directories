import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { LISTINGS_LIFE, tags } from "@/lib/cache-tags";
import { sanitizeHtml } from "@/lib/sanitize";
import { PUBLIC_FILTER, searchBusinesses, type ListingCard, type SearchInput } from "@/lib/search";

/* ── Counts (materialized view listing_counts) ───────────────────── */

type CountRow = { category_id: string | null; state_id: string | null; city_id: string | null; total: number };

async function counts(where: ReturnType<typeof sql>): Promise<CountRow[]> {
  const r = await db.execute(sql`select category_id, state_id, city_id, total from listing_counts where ${where}`);
  return r.rows as CountRow[];
}

export async function getSiteStats() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.counts);
  const r = await db.execute(sql`
    select
      (select coalesce(sum(total), 0)::int from listing_counts where category_id is null and state_id is null and city_id is null) as listings,
      (select count(*)::int from categories) as categories,
      (select count(*)::int from listing_counts where category_id is null and city_id is not null) as cities,
      (select coalesce(sum(review_count), 0)::int from businesses b where ${PUBLIC_FILTER}) as reviews`);
  const row = r.rows[0] as { listings: number; categories: number; cities: number; reviews: number } | undefined;
  return row ?? { listings: 0, categories: 0, cities: 0, reviews: 0 };
}

/* ── Categories ──────────────────────────────────────────────────── */

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  intro: string | null;
  count: number;
  children: { id: string; name: string; slug: string; count: number }[];
};

/** Full tree with listing counts (optionally scoped to a state or city). */
export async function getCategoryTree(scope?: { stateId?: string; cityId?: string }): Promise<CategoryNode[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.categories, tags.counts);
  const [cats, rows] = await Promise.all([
    db.select().from(s.categories).orderBy(asc(s.categories.sortOrder), asc(s.categories.name)),
    counts(
      scope?.cityId
        ? sql`category_id is not null and city_id = ${scope.cityId}`
        : scope?.stateId
          ? sql`category_id is not null and state_id = ${scope.stateId} and city_id is null`
          : sql`category_id is not null and state_id is null and city_id is null`,
    ),
  ]);
  const countOf = new Map(rows.map((r) => [r.category_id!, r.total]));
  const parents = cats.filter((c) => !c.parentId);
  return parents.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    icon: p.icon,
    imageUrl: p.imageUrl,
    intro: p.intro,
    count: countOf.get(p.id) ?? 0,
    children: cats
      .filter((c) => c.parentId === p.id)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: countOf.get(c.id) ?? 0 })),
  }));
}

export async function getCategory(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.categories, tags.category(slug));
  const cat = await db.query.categories.findFirst({
    where: eq(s.categories.slug, slug),
    with: { parent: true, children: { orderBy: asc(s.categories.sortOrder) } },
  });
  return cat ?? null;
}

/* ── Locations ───────────────────────────────────────────────────── */

export async function getStates() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.locations, tags.counts);
  const [states, rows] = await Promise.all([
    db.select().from(s.states).orderBy(asc(s.states.name)),
    counts(sql`category_id is null and state_id is not null and city_id is null`),
  ]);
  const countOf = new Map(rows.map((r) => [r.state_id!, r.total]));
  return states.map((st) => ({ ...st, count: countOf.get(st.id) ?? 0 }));
}

export async function getState(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.locations, tags.state(slug));
  return (await db.query.states.findFirst({ where: eq(s.states.slug, slug) })) ?? null;
}

export async function getCity(stateSlug: string, citySlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.locations, tags.city(`${stateSlug}/${citySlug}`));
  const r = await db
    .select({ city: s.cities, state: s.states })
    .from(s.cities)
    .innerJoin(s.states, eq(s.states.id, s.cities.stateId))
    .where(and(eq(s.states.slug, stateSlug), eq(s.cities.slug, citySlug)))
    .limit(1);
  return r[0] ?? null;
}

/** Cities in a state that have listings, by listing count. */
export async function getTopCities(stateId: string, limit = 48) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.locations, tags.counts);
  const r = await db.execute(sql`
    select c.id, c.name, c.slug, lc.total as count
    from listing_counts lc join cities c on c.id = lc.city_id
    where lc.category_id is null and lc.state_id = ${stateId} and lc.city_id is not null
    order by lc.total desc, c.population desc nulls last
    limit ${limit}`);
  return r.rows as { id: string; name: string; slug: string; count: number }[];
}

/** Nearby cities (by center point) with listings, for internal links and empty states. */
export async function getNearbyCities(lat: number, lng: number, excludeId?: string, limit = 8) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.locations, tags.counts);
  const r = await db.execute(sql`
    select c.id, c.name, c.slug, st.slug as state_slug, st.code, lc.total as count
    from cities c
    join states st on st.id = c.state_id
    join listing_counts lc on lc.city_id = c.id and lc.category_id is null
    where c.id <> coalesce(${excludeId ?? null}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      and ST_DWithin(c.center, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 160934)
    order by c.center <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    limit ${limit}`);
  return r.rows as { id: string; name: string; slug: string; state_slug: string; code: string; count: number }[];
}

/** Listing count for a category within a city (thin-page noindex check). */
export async function getCount(scope: { categoryId?: string; stateId?: string; cityId?: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.counts);
  // City rows also carry their state_id, so a city lookup matches on city_id alone.
  const location = scope.cityId
    ? sql`city_id = ${scope.cityId}`
    : scope.stateId
      ? sql`state_id = ${scope.stateId} and city_id is null`
      : sql`state_id is null and city_id is null`;
  const r = await db.execute(sql`
    select total from listing_counts
    where ${location} and category_id is not distinct from ${scope.categoryId ?? null}::uuid
    limit 1`);
  return Number((r.rows[0] as { total: number } | undefined)?.total ?? 0);
}

/* ── Listings ────────────────────────────────────────────────────── */

/** Cached listing query for category/state/city pages (search page calls searchBusinesses directly). */
export async function getListings(input: SearchInput): Promise<{ items: ListingCard[]; total: number }> {
  "use cache";
  cacheLife(LISTINGS_LIFE);
  cacheTag(tags.listings, tags.counts);
  return searchBusinesses(input);
}

export async function getRecentlyReviewed(limit = 8) {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.listings);
  return (await searchBusinesses({ sort: "recent_reviews", perPage: limit, minRating: 1 })).items;
}

/* ── Business profile ────────────────────────────────────────────── */

export async function getBusinessBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.businessSlug(slug));
  const b = await db.query.businesses.findFirst({
    where: and(eq(s.businesses.slug, slug), eq(s.businesses.status, "approved"), isNull(s.businesses.deletedAt)),
    with: {
      state: true,
      city: true,
      categories: { with: { category: { with: { parent: true } } } },
      hours: { orderBy: [asc(s.businessHours.day), asc(s.businessHours.sequence)] },
      media: { orderBy: asc(s.media.sortOrder) },
      socialLinks: true,
      seo: true,
    },
  });
  if (!b) return null;
  cacheTag(tags.business(b.id));
  const { email: _email, ...rest } = b; // never expose the raw email publicly
  // Sanitized here (inside the cache scope): DOMPurify's jsdom reads the clock, which isn't allowed during render.
  return { ...rest, description: sanitizeHtml(rest.description), hasEmail: !!_email };
}

export type PublicBusiness = NonNullable<Awaited<ReturnType<typeof getBusinessBySlug>>>;

export async function getRatingDistribution(businessId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.reviews(businessId));
  const r = await db.execute(sql`
    select rating, count(*)::int as n from reviews
    where business_id = ${businessId} and status = 'published' and deleted_at is null
    group by rating`);
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, n: Number((r.rows as { rating: number; n: number }[]).find((x) => x.rating === star)?.n ?? 0) }));
  return dist;
}

export async function getReviews(businessId: string, sort: "newest" | "highest" | "lowest" = "newest", limit = 10, offset = 0) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.reviews(businessId));
  const order = sort === "highest" ? [desc(s.reviews.rating), desc(s.reviews.createdAt)] : sort === "lowest" ? [asc(s.reviews.rating), desc(s.reviews.createdAt)] : [desc(s.reviews.createdAt)];
  return db.query.reviews.findMany({
    where: and(eq(s.reviews.businessId, businessId), eq(s.reviews.status, "published"), isNull(s.reviews.deletedAt)),
    orderBy: order,
    limit,
    offset,
    columns: { id: true, rating: true, body: true, createdAt: true },
    with: {
      user: { columns: { name: true, image: true, photoUrl: true } },
      reply: { columns: { body: true, createdAt: true } },
    },
  });
}

export async function getSimilarNearby(b: { id: string; lat: number | null; lng: number | null; categoryId?: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.listings);
  if (b.lat == null || b.lng == null) return [];
  const { items } = await searchBusinesses({
    categoryId: b.categoryId,
    origin: { lat: b.lat, lng: b.lng },
    radiusMiles: 50,
    sort: "distance",
    perPage: 4,
    excludeId: b.id,
  });
  return items;
}

/** Top slugs for generateStaticParams. */
export async function getTopBusinessSlugs(limit = 200) {
  const r = await db.execute(sql`select slug from businesses b where ${PUBLIC_FILTER} order by review_count desc, avg_rating desc limit ${limit}`);
  return (r.rows as { slug: string }[]).map((x) => x.slug);
}

export async function getSlugRedirect(path: string) {
  const r = await db.select({ newPath: s.slugRedirects.newPath }).from(s.slugRedirects).where(eq(s.slugRedirects.oldPath, path)).limit(1);
  return r[0]?.newPath ?? null;
}

/* ── Yelp-model extras (read-only) ───────────────────────────────── */

export type ReviewSnippet = { rating: number; body: string; userName: string | null };

/**
 * One short review quote per business for search result rows: the newest 4+ star review,
 * falling back to the newest review of any rating.
 */
export async function getReviewSnippets(businessIds: string[]): Promise<Record<string, ReviewSnippet>> {
  "use cache";
  cacheLife("hours");
  if (!businessIds.length) return {};
  cacheTag(tags.listings, ...businessIds.slice(0, 60).map((id) => tags.reviews(id)));
  const ids = sql.join(
    businessIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const r = await db.execute(sql`
    select distinct on (r.business_id) r.business_id as "businessId", r.rating, left(r.body, 280) as body, u.name as "userName"
    from reviews r
    left join users u on u.id = r.user_id
    where r.business_id in (${ids}) and r.status = 'published' and r.deleted_at is null
    order by r.business_id, (r.rating >= 4) desc, r.created_at desc`);
  const out: Record<string, ReviewSnippet> = {};
  for (const row of r.rows as (ReviewSnippet & { businessId: string })[]) {
    out[row.businessId] = { rating: Number(row.rating), body: row.body, userName: row.userName };
  }
  return out;
}

export type ActivityItem = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  userName: string | null;
  userImage: string | null;
  slug: string;
  businessName: string;
  cityName: string;
  stateCode: string | null;
  categoryName: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
};

/** Home "Recent activity" feed: the newest published review per business, newest first. */
export async function getRecentActivity(limit = 9): Promise<ActivityItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.listings);
  try {
    const r = await db.execute(sql`
      with latest as (
        select distinct on (r.business_id) r.id, r.business_id, r.user_id, r.rating, r.body, r.created_at
        from reviews r
        where r.status = 'published' and r.deleted_at is null
        order by r.business_id, r.created_at desc
      )
      select l.id, l.rating, left(l.body, 360) as body, l.created_at as "createdAt",
        u.name as "userName", coalesce(u.photo_url, u.image) as "userImage",
        b.slug, b.name as "businessName", b.city_name as "cityName", s.code as "stateCode",
        (select c.name from business_categories bc join categories c on c.id = bc.category_id
           where bc.business_id = b.id order by bc.is_primary desc, c.name limit 1) as "categoryName",
        (select m.url from media m where m.business_id = b.id and m.type = 'logo' order by m.sort_order limit 1) as "logoUrl",
        (select m.url from media m where m.business_id = b.id and m.type in ('banner', 'gallery')
           order by (m.type = 'banner') desc, m.sort_order limit 1) as "bannerUrl"
      from latest l
      join businesses b on b.id = l.business_id
      left join states s on s.id = b.state_id
      left join users u on u.id = l.user_id
      where ${PUBLIC_FILTER}
      order by l.created_at desc
      limit ${limit}`);
    return (r.rows as ActivityItem[]).map((row) => ({ ...row, rating: Number(row.rating), createdAt: new Date(row.createdAt).toISOString() }));
  } catch {
    return [];
  }
}

/** "People also viewed": same category in the same city, best rated first. */
export async function getPeopleAlsoViewed(b: { id: string; categoryId?: string; cityId?: string | null }, limit = 6) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.listings);
  if (!b.categoryId || !b.cityId) return [];
  const { items } = await searchBusinesses({ categoryId: b.categoryId, cityId: b.cityId, excludeId: b.id, sort: "rating", perPage: limit });
  return items;
}
