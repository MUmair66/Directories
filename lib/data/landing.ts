import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { sanitizeCustomCode, sanitizeHtml } from "@/lib/sanitize";
import { ADMIN_PAGE_SIZE, type ListParams } from "@/lib/data/admin";
import type { LandingContent } from "@/lib/landing";

/** Business fields a landing page shows (contact block, reviews, header). */
async function landingBusiness(businessId: string) {
  const b = await db.query.businesses.findFirst({
    where: eq(s.businesses.id, businessId),
    columns: { id: true, name: true, slug: true, phone: true, website: true, address: true, zip: true, hideAddress: true, lat: true, lng: true, avgRating: true, reviewCount: true, status: true, cityName: true, stateName: true },
    with: { state: { columns: { code: true } }, media: { columns: { type: true, url: true }, orderBy: asc(s.media.sortOrder) } },
  });
  if (!b) return null;
  const reviews = await db.query.reviews.findMany({
    where: and(eq(s.reviews.businessId, businessId), eq(s.reviews.status, "published"), isNull(s.reviews.deletedAt)),
    orderBy: [desc(s.reviews.rating), desc(s.reviews.createdAt)],
    limit: 6,
    columns: { id: true, rating: true, body: true, createdAt: true },
    with: { user: { columns: { name: true } } },
  });
  return { ...b, logoUrl: b.media.find((m) => m.type === "logo")?.url ?? null, reviews };
}

export type LandingBusiness = NonNullable<Awaited<ReturnType<typeof landingBusiness>>>;

/** Sanitizes rich text inside the cache scope (DOMPurify can't run during render). */
function cleanContent(c: LandingContent): LandingContent {
  return { ...c, sections: c.sections.map((sec) => ({
      ...sec,
      body: sanitizeHtml(sec.body),
      // Inline code loses scripts/handlers; sandbox code runs untouched inside an isolated iframe.
      code: sec.type === "code" && sec.codeMode !== "sandbox" ? sanitizeCustomCode(sec.code) : sec.code,
    })),
  };
}

/** Published landing page for /[slug]; null if missing, unpublished, or its business isn't live. */
export async function getPublishedLanding(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.landingPage(slug));
  const page = await db.query.landingPages.findFirst({
    where: and(eq(s.landingPages.slug, slug), eq(s.landingPages.status, "published"), isNull(s.landingPages.deletedAt)),
  });
  if (!page) return null;
  cacheTag(tags.business(page.businessId), tags.reviews(page.businessId));
  const business = await landingBusiness(page.businessId);
  if (!business || business.status !== "approved") return null;
  return { ...page, content: cleanContent(page.content), business };
}

/** Any landing page by id, drafts included (admin preview). Not cached. */
export async function getLandingForPreview(id: string) {
  const page = await db.query.landingPages.findFirst({ where: and(eq(s.landingPages.id, id), isNull(s.landingPages.deletedAt)) });
  if (!page) return null;
  const business = await landingBusiness(page.businessId);
  if (!business) return null;
  return { ...page, content: cleanContent(page.content), business };
}

export type LandingPageData = NonNullable<Awaited<ReturnType<typeof getLandingForPreview>>>;

export async function getPublishedLandingSlugs(limit = 200) {
  const r = await db.select({ slug: s.landingPages.slug }).from(s.landingPages).where(and(eq(s.landingPages.status, "published"), isNull(s.landingPages.deletedAt))).limit(limit);
  return r.map((x) => x.slug);
}

const leadsCount = sql<number>`(select count(*)::int from leads l where l.landing_page_id = ${s.landingPages.id})`;

/* ── Admin ────────────────────────────────────────────────────────── */

export async function listLandingPagesAdmin(p: ListParams) {
  const like = p.q ? `%${p.q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const where = and(
    isNull(s.landingPages.deletedAt),
    p.status === "draft" || p.status === "published" ? eq(s.landingPages.status, p.status) : undefined,
    like ? or(ilike(s.landingPages.title, like), ilike(s.landingPages.slug, like), ilike(s.businesses.name, like)) : undefined,
  );
  const rows = await db
    .select({
      id: s.landingPages.id,
      title: s.landingPages.title,
      slug: s.landingPages.slug,
      status: s.landingPages.status,
      views: s.landingPages.views,
      updatedAt: s.landingPages.updatedAt,
      businessId: s.businesses.id,
      businessName: s.businesses.name,
      businessCity: s.businesses.cityName,
      leads: leadsCount,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(s.landingPages)
    .innerJoin(s.businesses, eq(s.businesses.id, s.landingPages.businessId))
    .where(where)
    .orderBy(desc(s.landingPages.updatedAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function getLandingForEdit(id: string) {
  const page = await db.query.landingPages.findFirst({ where: and(eq(s.landingPages.id, id), isNull(s.landingPages.deletedAt)) });
  if (!page) return null;
  const business = await db.query.businesses.findFirst({ where: eq(s.businesses.id, page.businessId), columns: { id: true, name: true, cityName: true, status: true } });
  return { ...page, business };
}

/** Seed data for a new page: business name, primary category, place and photos. */
export async function landingSeedForBusiness(businessId: string) {
  const b = await db.query.businesses.findFirst({
    where: and(eq(s.businesses.id, businessId), isNull(s.businesses.deletedAt)),
    columns: { id: true, name: true, description: true, phone: true, cityName: true },
    with: {
      state: { columns: { code: true } },
      categories: { with: { category: { columns: { name: true } } } },
      media: { columns: { type: true, url: true }, orderBy: asc(s.media.sortOrder) },
    },
  });
  if (!b) return null;
  const cat = b.categories.find((c) => c.isPrimary) ?? b.categories[0];
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    phone: b.phone,
    categoryName: cat?.category.name ?? null,
    cityName: b.cityName || null,
    stateCode: b.state?.code ?? null,
    bannerUrl: b.media.find((m) => m.type === "banner")?.url ?? null,
    photoUrls: b.media.filter((m) => m.type === "gallery").map((m) => m.url),
  };
}

/* ── Owner dashboard ──────────────────────────────────────────────── */

/** Landing pages admins created for businesses this user owns (read-only for owners). */
export async function listOwnerLandingPages(userId: string) {
  return db
    .select({
      id: s.landingPages.id,
      title: s.landingPages.title,
      slug: s.landingPages.slug,
      status: s.landingPages.status,
      views: s.landingPages.views,
      updatedAt: s.landingPages.updatedAt,
      businessName: s.businesses.name,
      businessSlug: s.businesses.slug,
      leads: leadsCount,
    })
    .from(s.landingPages)
    .innerJoin(s.businesses, eq(s.businesses.id, s.landingPages.businessId))
    .where(and(eq(s.businesses.ownerId, userId), isNull(s.landingPages.deletedAt), isNull(s.businesses.deletedAt)))
    .orderBy(desc(s.landingPages.updatedAt));
}
