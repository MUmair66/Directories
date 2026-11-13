import "server-only";
import { and, asc, desc, eq, ilike, isNull, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";

/* Per-user dashboard reads. Never cached across users; pages render them inside <Suspense>. */

export type Completeness = {
  logo: boolean;
  banner: boolean;
  gallery: boolean;
  hours: boolean;
  description: boolean;
  social: boolean;
  seo: boolean;
};
export const COMPLETENESS_LABELS: Record<keyof Completeness, { label: string; tab: string }> = {
  logo: { label: "Add a logo", tab: "media" },
  banner: { label: "Add a banner image", tab: "media" },
  gallery: { label: "Add gallery photos", tab: "gallery" },
  hours: { label: "Set business hours", tab: "hours" },
  description: { label: "Write a 150+ word description", tab: "details" },
  social: { label: "Link a social profile", tab: "seo" },
  seo: { label: "Fill in SEO title and description", tab: "seo" },
};
export function completenessScore(c: Completeness) {
  const vals = Object.values(c);
  return Math.round((vals.filter(Boolean).length / vals.length) * 100);
}

const COMPLETENESS_SQL = sql`json_build_object(
  'logo', exists(select 1 from media m where m.business_id = b.id and m.type = 'logo'),
  'banner', exists(select 1 from media m where m.business_id = b.id and m.type = 'banner'),
  'gallery', exists(select 1 from media m where m.business_id = b.id and m.type = 'gallery'),
  'hours', exists(select 1 from business_hours h where h.business_id = b.id),
  'description', coalesce(array_length(regexp_split_to_array(trim(regexp_replace(coalesce(b.description, ''), '<[^>]*>', ' ', 'g')), '\\s+'), 1), 0) >= 150,
  'social', exists(select 1 from social_links sl where sl.business_id = b.id),
  'seo', exists(select 1 from business_seo bs where bs.business_id = b.id and bs.meta_title is not null and bs.meta_description is not null)
)`;

export type OwnerBusinessRow = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "pending_review" | "approved" | "rejected" | "suspended";
  verificationStatus: "unverified" | "pending" | "verified";
  rejectionReason: string | null;
  createdAt: string;
  deletedAt: string | null;
  cityName: string;
  stateCode: string | null;
  categories: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  wizardStep: number;
  views30: number;
  completeness: Completeness;
};

export async function getOwnerBusinesses(userId: string, opts: { status?: string; q?: string; includeDeleted?: boolean } = {}): Promise<OwnerBusinessRow[]> {
  const where: SQL[] = [sql`b.owner_id = ${userId}`];
  if (!opts.includeDeleted) where.push(sql`b.deleted_at is null`);
  else where.push(sql`(b.deleted_at is null or b.deleted_at > now() - interval '30 days')`);
  if (opts.status && opts.status !== "all") where.push(sql`b.status = ${opts.status}::business_status`);
  if (opts.q) where.push(sql`b.name ilike ${"%" + opts.q + "%"}`);
  const r = await db.execute(sql`
    select b.id, b.name, b.slug, b.status, b.verification_status as "verificationStatus", b.rejection_reason as "rejectionReason",
      b.created_at as "createdAt", b.deleted_at as "deletedAt", b.city_name as "cityName", st.code as "stateCode", b.phone, b.email,
      b.wizard_step as "wizardStep",
      (select string_agg(c.name, ', ' order by bc.is_primary desc) from business_categories bc join categories c on c.id = bc.category_id where bc.business_id = b.id) as categories,
      (select m.url from media m where m.business_id = b.id and m.type = 'logo' limit 1) as "logoUrl",
      coalesce((select sum(views)::int from business_stats_daily d where d.business_id = b.id and d.date > current_date - 30), 0)
        + (select count(*)::int from event_log e where e.business_id = b.id and e.type = 'view' and e.created_at >= current_date) as "views30",
      ${COMPLETENESS_SQL} as completeness
    from businesses b left join states st on st.id = b.state_id
    where ${sql.join(where, sql` and `)}
    order by b.deleted_at nulls first, b.created_at desc`);
  return r.rows as OwnerBusinessRow[];
}

/** Business with everything the edit form needs. Ownership is checked by the caller. */
export async function getBusinessForEdit(id: string) {
  return db.query.businesses.findFirst({
    where: and(eq(s.businesses.id, id), isNull(s.businesses.deletedAt)),
    columns: { searchVector: false, location: false },
    with: {
      city: true,
      state: true,
      categories: true,
      hours: { orderBy: [asc(s.businessHours.day), asc(s.businessHours.sequence)] },
      media: { orderBy: asc(s.media.sortOrder) },
      socialLinks: true,
      seo: true,
    },
  });
}
export type EditableBusiness = NonNullable<Awaited<ReturnType<typeof getBusinessForEdit>>>;

export async function getBusinessHistory(businessId: string, limit = 30) {
  return db.query.auditLog.findMany({
    where: and(eq(s.auditLog.entityType, "business"), eq(s.auditLog.entityId, businessId)),
    orderBy: desc(s.auditLog.createdAt),
    limit,
  });
}

export async function getActiveVerification(businessId: string) {
  return db.query.businessVerifications.findFirst({
    where: and(eq(s.businessVerifications.businessId, businessId), eq(s.businessVerifications.status, "pending")),
    orderBy: desc(s.businessVerifications.createdAt),
  });
}

/* ── Overview ──────────────────────────────────────────────────── */

export type DailyPoint = { date: string; views: number; calls: number; websiteClicks: number; directions: number; messages: number };

/** 30-day series from business_stats_daily, plus today's live counts from event_log. */
export async function getStatsSeries(userId: string, days = 30): Promise<DailyPoint[]> {
  const r = await db.execute(sql`
    with days as (select generate_series(current_date - ${days - 1}::int, current_date, interval '1 day')::date as d),
    owned as (select id from businesses where owner_id = ${userId} and deleted_at is null),
    rolled as (
      select date as d, sum(views) v, sum(calls) c, sum(website_clicks) w, sum(directions) dir, sum(messages) m
      from business_stats_daily where business_id in (select id from owned) and date > current_date - ${days}::int group by date
    ),
    today as (
      select current_date as d,
        count(*) filter (where type = 'view') v, count(*) filter (where type = 'call_click') c,
        count(*) filter (where type = 'website_click') w, count(*) filter (where type = 'directions_click') dir,
        count(*) filter (where type = 'message') m
      from event_log where business_id in (select id from owned) and created_at >= current_date
    )
    select to_char(days.d, 'YYYY-MM-DD') as date,
      coalesce(r.v, 0)::int + coalesce(t.v, 0)::int as views, coalesce(r.c, 0)::int + coalesce(t.c, 0)::int as calls,
      coalesce(r.w, 0)::int + coalesce(t.w, 0)::int as "websiteClicks", coalesce(r.dir, 0)::int + coalesce(t.dir, 0)::int as directions,
      coalesce(r.m, 0)::int + coalesce(t.m, 0)::int as messages
    from days left join rolled r on r.d = days.d left join today t on t.d = days.d
    order by days.d`);
  return r.rows as DailyPoint[];
}

export async function getOverviewTotals(userId: string) {
  const r = await db.execute(sql`
    select count(*)::int as total,
      count(*) filter (where status = 'approved')::int as approved,
      count(*) filter (where status = 'pending_review')::int as pending,
      count(*) filter (where status = 'draft')::int as drafts,
      coalesce(sum(review_count), 0)::int as reviews,
      coalesce(round(sum(avg_rating * review_count) / nullif(sum(review_count), 0), 2), 0)::float as "avgRating"
    from businesses where owner_id = ${userId} and deleted_at is null`);
  return r.rows[0] as { total: number; approved: number; pending: number; drafts: number; reviews: number; avgRating: number };
}

export async function getRecentActivity(userId: string, limit = 12) {
  return db.query.notifications.findMany({ where: eq(s.notifications.userId, userId), orderBy: desc(s.notifications.createdAt), limit });
}

export async function getUnreadCount(userId: string) {
  const r = await db.execute(sql`select count(*)::int as n from notifications where user_id = ${userId} and read_at is null`);
  return Number((r.rows[0] as { n: number }).n);
}

export async function getAccount(userId: string) {
  return db.query.users.findFirst({ where: eq(s.users.id, userId) });
}

/* ── Reviews / leads / favorites ───────────────────────────────── */

export async function getOwnerReviews(userId: string, f: { businessId?: string; rating?: number; replied?: "yes" | "no" }) {
  const where: SQL[] = [sql`b.owner_id = ${userId}`, sql`r.deleted_at is null`];
  if (f.businessId) where.push(sql`r.business_id = ${f.businessId}`);
  if (f.rating) where.push(sql`r.rating = ${f.rating}`);
  if (f.replied === "yes") where.push(sql`rr.review_id is not null`);
  if (f.replied === "no") where.push(sql`rr.review_id is null`);
  const r = await db.execute(sql`
    select r.id, r.rating, r.body, r.status, r.created_at as "createdAt", b.id as "businessId", b.name as "businessName", b.slug as "businessSlug",
      u.name as "authorName", rr.body as "replyBody", rr.updated_at as "replyAt"
    from reviews r join businesses b on b.id = r.business_id join users u on u.id = r.user_id
    left join review_replies rr on rr.review_id = r.id
    where ${sql.join(where, sql` and `)}
    order by r.created_at desc limit 200`);
  return r.rows as {
    id: string; rating: number; body: string; status: string; createdAt: string; businessId: string; businessName: string; businessSlug: string;
    authorName: string; replyBody: string | null; replyAt: string | null;
  }[];
}

export async function getRatingTrend(userId: string) {
  const r = await db.execute(sql`
    select to_char(date_trunc('month', r.created_at), 'Mon YY') as month, round(avg(r.rating)::numeric, 2)::float as avg, count(*)::int as count
    from reviews r join businesses b on b.id = r.business_id
    where b.owner_id = ${userId} and r.deleted_at is null and r.created_at > now() - interval '12 months'
    group by date_trunc('month', r.created_at) order by date_trunc('month', r.created_at)`);
  return r.rows as { month: string; avg: number; count: number }[];
}

export async function getLeads(userId: string, f: { businessId?: string; status?: string; source?: string; q?: string } = {}) {
  const where: SQL[] = [sql`b.owner_id = ${userId}`];
  if (f.businessId) where.push(sql`l.business_id = ${f.businessId}`);
  if (f.status && f.status !== "all") where.push(sql`l.status = ${f.status}::lead_status`);
  if (f.source && f.source !== "all") where.push(sql`l.source = ${f.source}::lead_source`);
  if (f.q) where.push(sql`(l.name ilike ${"%" + f.q + "%"} or l.email ilike ${"%" + f.q + "%"} or l.message ilike ${"%" + f.q + "%"})`);
  const r = await db.execute(sql`
    select l.id, l.name, l.email, l.phone, l.message, l.source, l.status, l.created_at as "createdAt", b.id as "businessId", b.name as "businessName"
    from leads l join businesses b on b.id = l.business_id
    where ${sql.join(where, sql` and `)}
    order by l.created_at desc limit 500`);
  return r.rows as {
    id: string; name: string; email: string | null; phone: string | null; message: string | null; source: "message" | "landing_page" | "pricing" | "api";
    status: "new" | "contacted" | "closed"; createdAt: string; businessId: string; businessName: string;
  }[];
}

export async function getFavorites(userId: string) {
  const r = await db.execute(sql`
    select b.id, b.name, b.slug, b.city_name as "cityName", st.code as "stateCode", b.avg_rating::float as "avgRating", b.review_count as "reviewCount",
      (select m.url from media m where m.business_id = b.id and m.type = 'logo' limit 1) as "logoUrl",
      (select c.name from business_categories bc join categories c on c.id = bc.category_id where bc.business_id = b.id order by bc.is_primary desc limit 1) as "categoryName"
    from favorites f join businesses b on b.id = f.business_id left join states st on st.id = b.state_id
    where f.user_id = ${userId} and b.deleted_at is null and b.status = 'approved'
    order by f.created_at desc`);
  return r.rows as { id: string; name: string; slug: string; cityName: string; stateCode: string | null; avgRating: number; reviewCount: number; logoUrl: string | null; categoryName: string | null }[];
}

/* ── Tickets ───────────────────────────────────────────────────── */

export async function getTickets(userId: string, f: { status?: string; q?: string } = {}) {
  const conds: SQL[] = [eq(s.supportTickets.userId, userId)];
  if (f.status && f.status !== "all") conds.push(sql`${s.supportTickets.status} = ${f.status}::ticket_status`);
  if (f.q) {
    const n = Number(f.q.replace("#", ""));
    conds.push(or(ilike(s.supportTickets.subject, `%${f.q}%`), Number.isFinite(n) ? eq(s.supportTickets.number, n) : sql`false`)!);
  }
  return db.query.supportTickets.findMany({ where: and(...conds), orderBy: desc(s.supportTickets.updatedAt), limit: 200 });
}

export async function getTicket(id: string, userId: string) {
  return db.query.supportTickets.findFirst({
    where: and(eq(s.supportTickets.id, id), eq(s.supportTickets.userId, userId)),
    with: {
      business: { columns: { name: true, slug: true } },
      messages: { orderBy: asc(s.ticketMessages.createdAt), with: { author: { columns: { name: true } }, attachments: true } },
    },
  });
}

/* ── API keys / notifications ──────────────────────────────────── */

export async function getActiveApiKey(userId: string) {
  return db.query.apiKeys.findFirst({ where: and(eq(s.apiKeys.userId, userId), isNull(s.apiKeys.revokedAt)), orderBy: desc(s.apiKeys.createdAt) });
}

export async function getNotifications(userId: string) {
  return db.query.notifications.findMany({ where: eq(s.notifications.userId, userId), orderBy: desc(s.notifications.createdAt), limit: 100 });
}

export async function getNotifyPrefs(userId: string) {
  const p = await db.query.userPreferences.findFirst({ where: eq(s.userPreferences.userId, userId) });
  return p?.notify ?? { review: true, lead: true, ticket: true, listingStatus: true };
}

export async function getOwnerBusinessOptions(userId: string) {
  return db
    .select({ id: s.businesses.id, name: s.businesses.name })
    .from(s.businesses)
    .where(and(eq(s.businesses.ownerId, userId), isNull(s.businesses.deletedAt)))
    .orderBy(asc(s.businesses.name));
}

export async function getApprovedOwnerBusinesses(userId: string) {
  return db
    .select({ id: s.businesses.id, name: s.businesses.name, slug: s.businesses.slug })
    .from(s.businesses)
    .where(and(eq(s.businesses.ownerId, userId), isNull(s.businesses.deletedAt), isNotNull(s.businesses.id)))
    .orderBy(asc(s.businesses.name));
}

/** Serializable shape for the client business forms. */
export function toFormBusiness(b: EditableBusiness): import("@/components/dashboard/business/defaults").FormBusiness {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    status: b.status,
    verificationStatus: b.verificationStatus,
    description: b.description,
    email: b.email,
    website: b.website,
    phone: b.phone,
    phone2: b.phone2,
    countryCode: b.countryCode,
    stateId: b.stateId,
    cityName: b.city?.name ?? b.cityName ?? "",
    address: b.address,
    zip: b.zip,
    lat: b.lat,
    lng: b.lng,
    hideAddress: b.hideAddress,
    timezone: b.timezone,
    videoUrl: b.videoUrl,
    wizardStep: b.wizardStep,
    categoryIds: [...b.categories].sort((x, y) => Number(y.isPrimary) - Number(x.isPrimary)).map((c) => c.categoryId),
    hours: b.hours.map((h) => ({ day: h.day, sequence: h.sequence, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed, is24h: h.is24h })),
    media: b.media.map((m) => ({ id: m.id, type: m.type, url: m.url, width: m.width, height: m.height, sortOrder: m.sortOrder })),
    social: Object.fromEntries(b.socialLinks.map((l) => [l.platform, l.url])),
    seo: b.seo ? { metaTitle: b.seo.metaTitle, metaKeywords: b.seo.metaKeywords, metaDescription: b.seo.metaDescription, tags: b.seo.tags } : null,
  };
}

/** Loads a business the user may edit (owner, or admin/editor for any business). */
export async function getEditableForUser(id: string, user: { id: string; role?: string | null }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const b = await getBusinessForEdit(id);
  if (!b) return null;
  if (b.ownerId !== user.id && user.role !== "admin" && user.role !== "editor") return null;
  return b;
}

/** Category options and states for the business forms. */
export async function getFormOptions() {
  const { getCategoryTree, getStates } = await import("@/lib/data/public");
  const [tree, states] = await Promise.all([getCategoryTree(), getStates()]);
  return {
    categories: tree.map((p) => ({ id: p.id, name: p.name, children: p.children.map((c) => ({ id: c.id, name: c.name })) })),
    states: states.map((s) => ({ id: s.id, name: s.name, code: s.code, lat: s.lat, lng: s.lng })),
  };
}
