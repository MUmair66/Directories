import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const ADMIN_PAGE_SIZE = 25;

/** Staff guard (admin or editor). Repeated in every admin page and action. */
export const requireStaff = () => requireRole("admin", "editor");
export const requireAdmin = () => requireRole("admin");

export type RawSP = Record<string, string | string[] | undefined>;

export function listParams(sp: RawSP) {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const page = Math.max(1, Math.min(1000, Number.parseInt(one("page") ?? "1", 10) || 1));
  return {
    q: one("q")?.slice(0, 100),
    page,
    sort: one("sort"),
    dir: (one("dir") === "asc" ? "asc" : "desc") as "asc" | "desc",
    status: one("status"),
    filter: one("filter"),
    one,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
  };
}
export type ListParams = ReturnType<typeof listParams>;

const like = (q: string) => `%${q.replace(/[%_\\]/g, "\\$&")}%`;

/* ── Overview ─────────────────────────────────────────────────────── */

export async function getOverview() {
  const r = await db.execute(sql`
    select
      (select count(*)::int from businesses where deleted_at is null) as businesses,
      (select count(*)::int from businesses where status = 'approved' and deleted_at is null) as approved,
      (select count(*)::int from businesses where created_at >= date_trunc('day', now()) and deleted_at is null) as new_today,
      (select count(*)::int from businesses where status = 'pending_review' and deleted_at is null) as pending_listings,
      (select count(*)::int from claims where status = 'pending') as pending_claims,
      (select count(*)::int from business_verifications where status = 'pending' and method = 'document') as pending_verifications,
      (select count(distinct review_id)::int from review_reports where status = 'open') as reported_reviews,
      (select count(*)::int from support_tickets where status in ('open', 'awaiting_reply')) as open_tickets,
      (select count(*)::int from contact_submissions where read_at is null) as unread_inbox,
      (select count(*)::int from users) as users,
      (select count(*)::int from reviews where deleted_at is null) as reviews,
      (select count(*)::int from users where created_at >= now() - interval '30 days') as signups_30d,
      (select count(*)::int from landing_pages where status = 'published' and deleted_at is null) as landing_live,
      (select count(*)::int from landing_pages where deleted_at is null) as landing_total,
      (select count(*)::int from leads where created_at >= now() - interval '30 days') as leads_30d`);
  const pending = await db.execute(sql`
    select b.id, b.name, b.slug, b.city_name as "cityName", st.code as "stateCode", coalesce(b.submitted_at, b.created_at) as "submittedAt", u.name as "ownerName"
    from businesses b left join states st on st.id = b.state_id left join users u on u.id = b.owner_id
    where b.status = 'pending_review' and b.deleted_at is null
    order by coalesce(b.submitted_at, b.created_at) asc limit 6`);
  const signups = await db.execute(sql`
    select to_char(d, 'YYYY-MM-DD') as date, coalesce(count(u.id), 0)::int as signups
    from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d
    left join users u on date_trunc('day', u.created_at) = d
    group by d order by d`);
  const topCategories = await db.execute(sql`
    select c.name, c.slug, lc.total::int as total
    from listing_counts lc join categories c on c.id = lc.category_id
    where lc.state_id is null and lc.city_id is null and c.parent_id is null
    order by lc.total desc limit 8`);
  return {
    stats: r.rows[0] as Record<string, number>,
    signups: signups.rows as { date: string; signups: number }[],
    topCategories: topCategories.rows as { name: string; slug: string; total: number }[],
    pending: pending.rows as { id: string; name: string; slug: string; cityName: string; stateCode: string | null; submittedAt: string; ownerName: string | null }[],
  };
}

/** Badge counts for the admin sidebar. */
export async function getQueueCounts() {
  const r = await db.execute(sql`
    select
      (select count(*)::int from businesses where status = 'pending_review' and deleted_at is null) as listings,
      (select count(*)::int from claims where status = 'pending') as claims,
      (select count(*)::int from business_verifications where status = 'pending' and method = 'document') as verifications,
      (select count(distinct review_id)::int from review_reports where status = 'open') as reviews,
      (select count(*)::int from support_tickets where status = 'open') as tickets,
      (select count(*)::int from contact_submissions where read_at is null) as inbox`);
  return r.rows[0] as { listings: number; claims: number; verifications: number; reviews: number; tickets: number; inbox: number };
}

/* ── Businesses ───────────────────────────────────────────────────── */

export const BUSINESS_STATUSES = ["draft", "pending_review", "approved", "rejected", "suspended"] as const;

export async function listBusinesses(p: ListParams) {
  const where: SQL[] = [isNull(s.businesses.deletedAt)];
  if (p.status && (BUSINESS_STATUSES as readonly string[]).includes(p.status)) where.push(eq(s.businesses.status, p.status as (typeof BUSINESS_STATUSES)[number]));
  if (p.filter === "featured") where.push(eq(s.businesses.featured, true));
  if (p.filter === "unclaimed") where.push(eq(s.businesses.claimed, false));
  if (p.q) where.push(or(ilike(s.businesses.name, like(p.q)), ilike(s.businesses.slug, like(p.q)), ilike(s.businesses.phone, like(p.q)))!);
  const sorts = {
    name: s.businesses.name,
    created: s.businesses.createdAt,
    rating: s.businesses.avgRating,
    reviews: s.businesses.reviewCount,
    status: s.businesses.status,
  } as const;
  const col = sorts[(p.sort as keyof typeof sorts) ?? "created"] ?? s.businesses.createdAt;
  const rows = await db
    .select({
      id: s.businesses.id,
      name: s.businesses.name,
      slug: s.businesses.slug,
      status: s.businesses.status,
      rejectionReason: s.businesses.rejectionReason,
      verificationStatus: s.businesses.verificationStatus,
      featured: s.businesses.featured,
      claimed: s.businesses.claimed,
      cityName: s.businesses.cityName,
      stateCode: s.states.code,
      avgRating: s.businesses.avgRating,
      reviewCount: s.businesses.reviewCount,
      ownerEmail: s.users.email,
      createdAt: s.businesses.createdAt,
      submittedAt: s.businesses.submittedAt,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(s.businesses)
    .leftJoin(s.states, eq(s.states.id, s.businesses.stateId))
    .leftJoin(s.users, eq(s.users.id, s.businesses.ownerId))
    .where(and(...where))
    .orderBy(p.dir === "asc" ? asc(col) : desc(col), desc(s.businesses.id))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  const statusCounts = await db
    .select({ status: s.businesses.status, n: count() })
    .from(s.businesses)
    .where(isNull(s.businesses.deletedAt))
    .groupBy(s.businesses.status);
  return { rows, total: rows[0]?.total ?? 0, statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status, r.n])) as Record<string, number> };
}

/* ── Claims & verifications ───────────────────────────────────────── */

export async function listClaims(p: ListParams) {
  const status = (["pending", "approved", "rejected"] as const).find((x) => x === p.status) ?? "pending";
  const rows = await db.query.claims.findMany({
    where: eq(s.claims.status, status),
    orderBy: status === "pending" ? asc(s.claims.createdAt) : desc(s.claims.createdAt),
    limit: ADMIN_PAGE_SIZE,
    offset: p.offset,
    with: {
      business: { columns: { id: true, name: true, slug: true, claimed: true, ownerId: true } },
      user: { columns: { id: true, name: true, email: true } },
      documents: true,
    },
  });
  const [{ n }] = await db.select({ n: count() }).from(s.claims).where(eq(s.claims.status, status));
  return { rows, total: n, status };
}

export async function listDocumentVerifications(p: ListParams) {
  const status = (["pending", "verified", "rejected"] as const).find((x) => x === p.status) ?? "pending";
  const rows = await db
    .select({
      id: s.businessVerifications.id,
      status: s.businessVerifications.status,
      documentKey: s.businessVerifications.documentKey,
      documentName: s.businessVerifications.documentName,
      rejectionReason: s.businessVerifications.rejectionReason,
      createdAt: s.businessVerifications.createdAt,
      businessId: s.businesses.id,
      businessName: s.businesses.name,
      businessSlug: s.businesses.slug,
      businessPhone: s.businesses.phone,
      userName: s.users.name,
      userEmail: s.users.email,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(s.businessVerifications)
    .innerJoin(s.businesses, eq(s.businesses.id, s.businessVerifications.businessId))
    .innerJoin(s.users, eq(s.users.id, s.businessVerifications.userId))
    .where(and(eq(s.businessVerifications.method, "document"), eq(s.businessVerifications.status, status)))
    .orderBy(status === "pending" ? asc(s.businessVerifications.createdAt) : desc(s.businessVerifications.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows, total: rows[0]?.total ?? 0, status };
}

/* ── Reviews ──────────────────────────────────────────────────────── */

export async function listReviews(p: ListParams) {
  const view = (["reported", "all", "hidden", "spam"] as const).find((x) => x === p.filter) ?? "reported";
  const where: SQL[] = [isNull(s.reviews.deletedAt)];
  if (view === "reported") where.push(sql`exists (select 1 from review_reports rr where rr.review_id = ${s.reviews.id} and rr.status = 'open')`);
  if (view === "hidden") where.push(eq(s.reviews.status, "hidden"));
  if (view === "spam") where.push(eq(s.reviews.status, "spam"));
  if (p.q) where.push(or(ilike(s.reviews.body, like(p.q)), ilike(s.businesses.name, like(p.q)))!);
  const rows = await db
    .select({
      id: s.reviews.id,
      rating: s.reviews.rating,
      body: s.reviews.body,
      status: s.reviews.status,
      createdAt: s.reviews.createdAt,
      businessId: s.businesses.id,
      businessName: s.businesses.name,
      businessSlug: s.businesses.slug,
      userName: s.users.name,
      userEmail: s.users.email,
      reports: sql<{ reason: string; createdAt: string }[]>`coalesce((select json_agg(json_build_object('reason', rr.reason, 'createdAt', rr.created_at) order by rr.created_at)
        from review_reports rr where rr.review_id = ${s.reviews.id} and rr.status = 'open'), '[]'::json)`,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(s.reviews)
    .innerJoin(s.businesses, eq(s.businesses.id, s.reviews.businessId))
    .innerJoin(s.users, eq(s.users.id, s.reviews.userId))
    .where(and(...where))
    .orderBy(desc(s.reviews.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows, total: rows[0]?.total ?? 0, view };
}

/* ── Users ────────────────────────────────────────────────────────── */

export async function listUsers(p: ListParams) {
  const where: SQL[] = [];
  if (p.q) where.push(or(ilike(s.users.email, like(p.q)), ilike(s.users.name, like(p.q)), ilike(s.users.username, like(p.q)))!);
  if (p.filter && ["admin", "editor", "owner", "user"].includes(p.filter)) where.push(eq(s.users.role, p.filter));
  if (p.filter === "banned") where.push(eq(s.users.banned, true));
  const rows = await db
    .select({
      id: s.users.id,
      name: s.users.name,
      email: s.users.email,
      username: s.users.username,
      role: s.users.role,
      banned: s.users.banned,
      banReason: s.users.banReason,
      emailVerified: s.users.emailVerified,
      createdAt: s.users.createdAt,
      lastLoginAt: s.users.lastLoginAt,
      businesses: sql<number>`(select count(*)::int from businesses b where b.owner_id = ${s.users.id} and b.deleted_at is null)`,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(s.users)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(s.users.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows, total: rows[0]?.total ?? 0 };
}

/* ── Taxonomy & locations ─────────────────────────────────────────── */

export async function listCategoriesAdmin() {
  const rows = await db.execute(sql`
    select c.id, c.parent_id as "parentId", c.name, c.slug, c.icon, c.image_url as "imageUrl", c.intro,
      c.meta_title as "metaTitle", c.meta_description as "metaDescription", c.sort_order as "sortOrder", c.featured,
      (select count(*)::int from business_categories bc where bc.category_id = c.id) as businesses
    from categories c order by c.sort_order, c.name`);
  type Row = {
    id: string; parentId: string | null; name: string; slug: string; icon: string | null; imageUrl: string | null; intro: string | null;
    metaTitle: string | null; metaDescription: string | null; sortOrder: number; featured: boolean; businesses: number;
  };
  const all = rows.rows as Row[];
  return all.filter((c) => !c.parentId).map((p) => ({ ...p, children: all.filter((c) => c.parentId === p.id) }));
}
export type AdminCategory = Awaited<ReturnType<typeof listCategoriesAdmin>>[number];

export async function listStatesAdmin() {
  return db
    .select({
      id: s.states.id, name: s.states.name, code: s.states.code, slug: s.states.slug, lat: s.states.lat, lng: s.states.lng,
      intro: s.states.intro, metaTitle: s.states.metaTitle, metaDescription: s.states.metaDescription, featured: s.states.featured,
      cities: sql<number>`(select count(*)::int from cities c where c.state_id = ${s.states.id})`,
    })
    .from(s.states)
    .orderBy(asc(s.states.name));
}

export async function listCitiesAdmin(p: ListParams) {
  const where: SQL[] = [];
  const stateId = p.one("state");
  if (stateId && /^[0-9a-f-]{36}$/i.test(stateId)) where.push(eq(s.cities.stateId, stateId));
  if (p.q) where.push(ilike(s.cities.name, like(p.q)));
  const rows = await db
    .select({
      id: s.cities.id, stateId: s.cities.stateId, name: s.cities.name, slug: s.cities.slug, lat: s.cities.lat, lng: s.cities.lng,
      population: s.cities.population, intro: s.cities.intro, metaTitle: s.cities.metaTitle, metaDescription: s.cities.metaDescription,
      stateCode: s.states.code,
      businesses: sql<number>`(select count(*)::int from businesses b where b.city_id = ${s.cities.id} and b.deleted_at is null)`,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(s.cities)
    .innerJoin(s.states, eq(s.states.id, s.cities.stateId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(sql`${s.cities.population} desc nulls last`, asc(s.cities.name))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows, total: rows[0]?.total ?? 0 };
}

/* ── Content ──────────────────────────────────────────────────────── */

export async function listTopPros(p: ListParams) {
  const rows = await db
    .select({ id: s.topProsPages.id, title: s.topProsPages.title, slug: s.topProsPages.slug, status: s.topProsPages.status, updatedAt: s.topProsPages.updatedAt,
      items: sql<number>`(select count(*)::int from top_pros_items i where i.page_id = ${s.topProsPages.id})`, total: sql<number>`count(*) over()`.mapWith(Number) })
    .from(s.topProsPages)
    .where(p.q ? ilike(s.topProsPages.title, like(p.q)) : undefined)
    .orderBy(desc(s.topProsPages.updatedAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function getTopProsPage(id: string) {
  const page = await db.query.topProsPages.findFirst({ where: eq(s.topProsPages.id, id) });
  if (!page) return null;
  const items = await db
    .select({ businessId: s.topProsItems.businessId, rank: s.topProsItems.rank, blurb: s.topProsItems.blurb, name: s.businesses.name, cityName: s.businesses.cityName })
    .from(s.topProsItems)
    .innerJoin(s.businesses, eq(s.businesses.id, s.topProsItems.businessId))
    .where(eq(s.topProsItems.pageId, id))
    .orderBy(asc(s.topProsItems.rank));
  return { ...page, items };
}

export async function listBlogPosts(p: ListParams) {
  const rows = await db
    .select({ id: s.blogPosts.id, title: s.blogPosts.title, slug: s.blogPosts.slug, status: s.blogPosts.status, publishedAt: s.blogPosts.publishedAt,
      updatedAt: s.blogPosts.updatedAt, category: s.blogCategories.name, total: sql<number>`count(*) over()`.mapWith(Number) })
    .from(s.blogPosts)
    .leftJoin(s.blogCategories, eq(s.blogCategories.id, s.blogPosts.categoryId))
    .where(p.q ? ilike(s.blogPosts.title, like(p.q)) : undefined)
    .orderBy(desc(s.blogPosts.updatedAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows, total: rows[0]?.total ?? 0 };
}

export const listBlogCategories = () => db.select().from(s.blogCategories).orderBy(asc(s.blogCategories.name));
export const getBlogPost = (id: string) => db.query.blogPosts.findFirst({ where: eq(s.blogPosts.id, id) });
export const listTestimonials = () => db.select().from(s.testimonials).orderBy(asc(s.testimonials.sortOrder), desc(s.testimonials.createdAt));
export const listFaqs = () => db.select().from(s.faqs).orderBy(asc(s.faqs.group), asc(s.faqs.sortOrder));
export const listPages = () => db.select().from(s.pages).orderBy(asc(s.pages.slug));
export const getPage = (id: string) => db.query.pages.findFirst({ where: eq(s.pages.id, id) });
export const listPricingPlans = () => db.select().from(s.pricingPlans).orderBy(asc(s.pricingPlans.sortOrder));

export async function locationOptions() {
  const [states, categories] = await Promise.all([
    db.select({ id: s.states.id, name: s.states.name, code: s.states.code, slug: s.states.slug }).from(s.states).orderBy(asc(s.states.name)),
    db.select({ id: s.categories.id, name: s.categories.name, slug: s.categories.slug, parentId: s.categories.parentId }).from(s.categories).orderBy(asc(s.categories.name)),
  ]);
  return { states, categories };
}

export async function citiesForState(stateId: string) {
  return db.select({ id: s.cities.id, name: s.cities.name }).from(s.cities).where(eq(s.cities.stateId, stateId)).orderBy(sql`${s.cities.population} desc nulls last`).limit(500);
}

/* ── Tickets & inbox ──────────────────────────────────────────────── */

export async function listTickets(p: ListParams) {
  const where: SQL[] = [];
  const statuses = ["open", "awaiting_reply", "resolved", "closed"] as const;
  const st = statuses.find((x) => x === p.status);
  if (st) where.push(eq(s.supportTickets.status, st));
  else if (p.status !== "all") where.push(inArray(s.supportTickets.status, ["open", "awaiting_reply"]));
  if (p.filter === "mine") where.push(sql`${s.supportTickets.assignedTo} is not null`);
  if (p.q) {
    const n = Number(p.q.replace("#", ""));
    where.push(Number.isInteger(n) && n > 0 ? eq(s.supportTickets.number, n) : ilike(s.supportTickets.subject, like(p.q)));
  }
  const rows = await db
    .select({
      id: s.supportTickets.id, number: s.supportTickets.number, subject: s.supportTickets.subject, category: s.supportTickets.category,
      priority: s.supportTickets.priority, status: s.supportTickets.status, createdAt: s.supportTickets.createdAt, lastReplyAt: s.supportTickets.lastReplyAt,
      userName: s.users.name, userEmail: s.users.email, assignedTo: s.supportTickets.assignedTo,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(s.supportTickets)
    .innerJoin(s.users, eq(s.users.id, s.supportTickets.userId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(sql`case ${s.supportTickets.priority} when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`, desc(s.supportTickets.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function getTicketAdmin(id: string) {
  return db.query.supportTickets.findFirst({
    where: eq(s.supportTickets.id, id),
    with: {
      user: { columns: { id: true, name: true, email: true } },
      business: { columns: { id: true, name: true, slug: true } },
      messages: { orderBy: asc(s.ticketMessages.createdAt), with: { author: { columns: { name: true } }, attachments: true } },
    },
  });
}

export async function listStaff() {
  return db.select({ id: s.users.id, name: s.users.name, email: s.users.email }).from(s.users).where(inArray(s.users.role, ["admin", "editor"])).orderBy(asc(s.users.name));
}

export async function listContactSubmissions(p: ListParams) {
  const where: SQL[] = [];
  if (p.filter === "unread") where.push(isNull(s.contactSubmissions.readAt));
  if (p.q) where.push(or(ilike(s.contactSubmissions.email, like(p.q)), ilike(s.contactSubmissions.message, like(p.q)), ilike(s.contactSubmissions.lastName, like(p.q)))!);
  const rows = await db
    .select({ row: s.contactSubmissions, total: sql<number>`count(*) over()`.mapWith(Number) })
    .from(s.contactSubmissions)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(s.contactSubmissions.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows: rows.map((r) => r.row), total: rows[0]?.total ?? 0 };
}

export async function listPricingLeads(p: ListParams) {
  const rows = await db
    .select({ row: s.leads, total: sql<number>`count(*) over()`.mapWith(Number) })
    .from(s.leads)
    .where(and(eq(s.leads.source, "pricing"), p.q ? or(ilike(s.leads.email, like(p.q)), ilike(s.leads.name, like(p.q))) : undefined))
    .orderBy(desc(s.leads.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  return { rows: rows.map((r) => r.row), total: rows[0]?.total ?? 0 };
}

/* ── Audit log ────────────────────────────────────────────────────── */

export async function listAudit(p: ListParams) {
  const where: SQL[] = [];
  const entity = p.one("entity");
  if (entity) where.push(eq(s.auditLog.entityType, entity));
  if (p.q) where.push(or(ilike(s.auditLog.action, like(p.q)), ilike(s.auditLog.entityId, like(p.q)), ilike(s.users.email, like(p.q)))!);
  const rows = await db
    .select({
      id: s.auditLog.id, action: s.auditLog.action, entityType: s.auditLog.entityType, entityId: s.auditLog.entityId, diff: s.auditLog.diff,
      ip: s.auditLog.ip, createdAt: s.auditLog.createdAt, actorName: s.users.name, actorEmail: s.users.email,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(s.auditLog)
    .leftJoin(s.users, eq(s.users.id, s.auditLog.actorId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(s.auditLog.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(p.offset);
  const entities = await db.selectDistinct({ e: s.auditLog.entityType }).from(s.auditLog).orderBy(asc(s.auditLog.entityType));
  return { rows, total: rows[0]?.total ?? 0, entities: entities.map((e) => e.e) };
}

export async function getSettingsRaw() {
  const rows = await db.select().from(s.settings).where(inArray(s.settings.key, ["site", "homepage"]));
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, Record<string, unknown>>;
}
