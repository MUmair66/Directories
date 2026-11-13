import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";

/** Content queries (Top Pros, blog, pricing, FAQs, testimonials, legal pages). All cached and tagged. */

const BLOG_PAGE_SIZE = 12;

/* ── Top Pros ───────────────────────────────────────────────────── */

export async function getTopProsStates() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"), tags.locations);
  const r = await db.execute(sql`
    select st.id, st.name, st.slug, st.code, count(p.id)::int as count
    from states st
    left join top_pros_pages p on p.state_id = st.id and p.status = 'published'
    group by st.id order by st.name`);
  return r.rows as { id: string; name: string; slug: string; code: string; count: number }[];
}

export async function getTopProsState(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"), tags.locations);
  return (await db.query.states.findFirst({ where: eq(s.states.slug, slug) })) ?? null;
}

export async function getTopProsCities(stateId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"), tags.locations);
  const r = await db.execute(sql`
    select c.id, c.name, c.slug, count(p.id)::int as count
    from top_pros_pages p join cities c on c.id = p.city_id
    where p.state_id = ${stateId} and p.status = 'published'
    group by c.id order by c.name`);
  return r.rows as { id: string; name: string; slug: string; count: number }[];
}

export async function getTopProsCity(stateSlug: string, citySlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"), tags.locations);
  const r = await db
    .select({ city: s.cities, state: s.states })
    .from(s.cities)
    .innerJoin(s.states, eq(s.states.id, s.cities.stateId))
    .where(and(eq(s.states.slug, stateSlug), eq(s.cities.slug, citySlug)))
    .limit(1);
  return r[0] ?? null;
}

export type TopProsSummary = { id: string; title: string; slug: string; categoryName: string | null; cityName: string | null; stateCode: string | null };

const SUMMARY_COLUMNS = sql`p.id, p.title, p.slug, c.name as "categoryName", ci.name as "cityName", st.code as "stateCode"`;
const SUMMARY_JOINS = sql`left join categories c on c.id = p.category_id left join cities ci on ci.id = p.city_id left join states st on st.id = p.state_id`;

export async function getTopProsForCity(cityId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"));
  const r = await db.execute(sql`select ${SUMMARY_COLUMNS} from top_pros_pages p ${SUMMARY_JOINS}
    where p.city_id = ${cityId} and p.status = 'published' order by c.name, p.title`);
  return r.rows as TopProsSummary[];
}

export async function getLatestTopPros(limit = 12) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"));
  const r = await db.execute(sql`select ${SUMMARY_COLUMNS} from top_pros_pages p ${SUMMARY_JOINS}
    where p.status = 'published' order by p.published_at desc nulls last limit ${limit}`);
  return r.rows as TopProsSummary[];
}

export type TopProsBusiness = {
  rank: number;
  blurb: string | null;
  id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  avgRating: number;
  reviewCount: number;
  cityName: string;
  stateCode: string | null;
  verified: boolean;
  logoUrl: string | null;
};

export async function getTopProsArticle(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"), tags.listings);
  const page = await db.query.topProsPages.findFirst({
    where: and(eq(s.topProsPages.slug, slug), eq(s.topProsPages.status, "published")),
    with: { state: true, city: true, category: true },
  });
  if (!page) return null;
  // Ranked businesses pulled live from the directory (only public listings).
  const r = await db.execute(sql`
    select i.rank, i.blurb, b.id, b.slug, b.name, left(b.description, 400) as description, b.phone,
      b.avg_rating::float as "avgRating", b.review_count as "reviewCount", b.city_name as "cityName",
      st.code as "stateCode", (b.verification_status = 'verified') as verified,
      (select m.url from media m where m.business_id = b.id and m.type = 'logo' order by m.sort_order limit 1) as "logoUrl"
    from top_pros_items i
    join businesses b on b.id = i.business_id
    left join states st on st.id = b.state_id
    where i.page_id = ${page.id} and b.status = 'approved' and b.deleted_at is null
    order by i.rank`);
  return { page, items: (r.rows as TopProsBusiness[]).map((x) => ({ ...x, avgRating: Number(x.avgRating) })) };
}

export async function getRelatedTopPros(page: { id: string; cityId: string | null; categoryId: string | null }, limit = 6) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"));
  const r = await db.execute(sql`select ${SUMMARY_COLUMNS} from top_pros_pages p ${SUMMARY_JOINS}
    where p.status = 'published' and p.id <> ${page.id}
      and (p.city_id = ${page.cityId ?? null}::uuid or p.category_id = ${page.categoryId ?? null}::uuid)
    order by (p.city_id = ${page.cityId ?? null}::uuid) desc nulls last, p.published_at desc nulls last
    limit ${limit}`);
  return r.rows as TopProsSummary[];
}

/* ── Blog ───────────────────────────────────────────────────────── */

export type BlogCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverUrl: string | null;
  readMinutes: number;
  publishedAt: Date | string | null;
  categoryName: string | null;
  categorySlug: string | null;
};

export async function getBlogPosts(opts: { q?: string; categorySlug?: string; page?: number }) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("blog"));
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim().slice(0, 100);
  const tsq = q ? sql`websearch_to_tsquery('english', f_unaccent(${q}))` : null;
  const where = [sql`p.status = 'published'`];
  if (tsq) where.push(sql`p.search_vector @@ ${tsq}`);
  if (opts.categorySlug) where.push(sql`c.slug = ${opts.categorySlug}`);
  const r = await db.execute(sql`
    select p.id, p.title, p.slug, p.excerpt, p.cover_url as "coverUrl", p.read_minutes as "readMinutes",
      p.published_at as "publishedAt", c.name as "categoryName", c.slug as "categorySlug", count(*) over() as total
    from blog_posts p left join blog_categories c on c.id = p.category_id
    where ${sql.join(where, sql` and `)}
    order by ${tsq ? sql`ts_rank(p.search_vector, ${tsq}) desc,` : sql``} p.published_at desc nulls last
    limit ${BLOG_PAGE_SIZE} offset ${(page - 1) * BLOG_PAGE_SIZE}`);
  const rows = r.rows as (BlogCard & { total: number | string })[];
  const total = rows.length ? Number(rows[0]!.total) : 0;
  return { items: rows.map(({ total: _t, ...x }) => x), total, totalPages: Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE)), page };
}

export async function getBlogCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("blog"));
  return db.select().from(s.blogCategories).orderBy(asc(s.blogCategories.name));
}

export async function getBlogCategory(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("blog"));
  return (await db.query.blogCategories.findFirst({ where: eq(s.blogCategories.slug, slug) })) ?? null;
}

export async function getBlogPost(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("blog"));
  const post = await db.query.blogPosts.findFirst({
    where: and(eq(s.blogPosts.slug, slug), eq(s.blogPosts.status, "published")),
    columns: { searchVector: false },
    with: { category: true, author: { columns: { name: true, image: true, photoUrl: true } } },
  });
  return post ?? null;
}

export async function getRelatedPosts(post: { id: string; categoryId: string | null }, limit = 3) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("blog"));
  const r = await db.execute(sql`
    select p.id, p.title, p.slug, p.excerpt, p.cover_url as "coverUrl", p.read_minutes as "readMinutes",
      p.published_at as "publishedAt", c.name as "categoryName", c.slug as "categorySlug"
    from blog_posts p left join blog_categories c on c.id = p.category_id
    where p.status = 'published' and p.id <> ${post.id}
    order by (p.category_id = ${post.categoryId ?? null}::uuid) desc nulls last, p.published_at desc nulls last
    limit ${limit}`);
  return r.rows as BlogCard[];
}

/* ── Pricing, FAQs, testimonials, pages ─────────────────────────── */

export async function getPricingPlans() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("pricing"));
  return db.select().from(s.pricingPlans).orderBy(asc(s.pricingPlans.sortOrder));
}

export async function getFaqs() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("faqs"));
  return db.select().from(s.faqs).orderBy(asc(s.faqs.group), asc(s.faqs.sortOrder));
}

export async function getTestimonials() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("testimonials"));
  return db.select().from(s.testimonials).where(eq(s.testimonials.published, true)).orderBy(asc(s.testimonials.sortOrder), desc(s.testimonials.createdAt));
}

export async function getCmsPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("pages"));
  return (await db.query.pages.findFirst({ where: eq(s.pages.slug, slug) })) ?? null;
}

/** Slugs to prerender at build time (not cached; build-time only). */
export async function getLatestPostSlugs(limit: number) {
  const rows = await db.select({ slug: s.blogPosts.slug }).from(s.blogPosts).where(eq(s.blogPosts.status, "published")).orderBy(desc(s.blogPosts.publishedAt)).limit(limit);
  return rows.map((r) => r.slug);
}

export async function getTopProsSlugs(limit: number) {
  const rows = await db.select({ slug: s.topProsPages.slug }).from(s.topProsPages).where(eq(s.topProsPages.status, "published")).orderBy(desc(s.topProsPages.publishedAt)).limit(limit);
  return rows.map((r) => r.slug);
}
