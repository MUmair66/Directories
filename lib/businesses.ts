import "server-only";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db, schema as s, tx, type Tx } from "@/lib/db";
import { ActionError } from "@/lib/action";
import { audit, notify } from "@/lib/audit";
import { sanitizeHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/text";
import { refreshSearchFields, revalidateBusiness } from "@/lib/revalidate";
import { sendEmail } from "@/lib/email";
import { processUploadedImage, deleteImageVariants } from "@/lib/images";
import {
  detailsSchema,
  hoursSchema,
  locationSchema,
  mediaInfoSchema,
  seoSchema,
  type Section,
  type SocialPlatform,
} from "@/lib/validations/business";
import type { z } from "zod";

export type Actor = { id: string; role?: string | null };
export const isStaffRole = (role?: string | null) => role === "admin" || role === "editor";

/** Loads a business the actor may edit (owner, or admin/editor). Throws otherwise. */
export async function loadEditable(businessId: string, actor: Actor) {
  const b = await db.query.businesses.findFirst({ where: and(eq(s.businesses.id, businessId), isNull(s.businesses.deletedAt)) });
  if (!b) throw new ActionError("Business not found.");
  if (b.ownerId !== actor.id && !isStaffRole(actor.role)) throw new ActionError("You can only edit your own businesses.");
  return b;
}

export async function isSlugAvailable(slug: string, exceptId?: string) {
  const rows = await db
    .select({ id: s.businesses.id })
    .from(s.businesses)
    .where(exceptId ? and(eq(s.businesses.slug, slug), ne(s.businesses.id, exceptId)) : eq(s.businesses.slug, slug))
    .limit(1);
  return rows.length === 0;
}

/** Suggests a free slug based on a name: "joes-plumbing", "joes-plumbing-2", … */
export async function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base) || "business";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    if (await isSlugAvailable(candidate, exceptId)) return candidate;
  }
  return `${root}-${uuidv7().slice(-6)}`;
}

/** Promotes a plain "user" to "owner" when they add their first business. */
async function ensureOwnerRole(actor: Actor) {
  if (actor.role === "user" || !actor.role) {
    await db.update(s.users).set({ role: "owner" }).where(and(eq(s.users.id, actor.id), eq(s.users.role, "user")));
  }
}

async function replaceCategories(t: Tx, businessId: string, categoryIds: string[]) {
  await t.delete(s.businessCategories).where(eq(s.businessCategories.businessId, businessId));
  if (categoryIds.length) {
    await t.insert(s.businessCategories).values(categoryIds.map((categoryId, i) => ({ businessId, categoryId, isPrimary: i === 0 })));
  }
}

/** Finds (or creates) a city row by name within a state. */
async function resolveCity(t: Tx, stateId: string, name: string, lat?: number | null, lng?: number | null) {
  const clean = name.trim();
  const slug = slugify(clean);
  const found = await t.select({ id: s.cities.id, name: s.cities.name }).from(s.cities).where(and(eq(s.cities.stateId, stateId), eq(s.cities.slug, slug))).limit(1);
  if (found[0]) return found[0];
  let cLat = lat;
  let cLng = lng;
  if (cLat == null || cLng == null) {
    const st = await t.select({ lat: s.states.lat, lng: s.states.lng }).from(s.states).where(eq(s.states.id, stateId)).limit(1);
    cLat = st[0]?.lat ?? 0;
    cLng = st[0]?.lng ?? 0;
  }
  const [row] = await t.insert(s.cities).values({ stateId, name: clean, slug, lat: cLat, lng: cLng }).onConflictDoNothing().returning({ id: s.cities.id, name: s.cities.name });
  if (row) return row;
  const again = await t.select({ id: s.cities.id, name: s.cities.name }).from(s.cities).where(and(eq(s.cities.stateId, stateId), eq(s.cities.slug, slug))).limit(1);
  return again[0]!;
}

type Changed = Record<string, { from: unknown; to: unknown }>;

function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>): Changed {
  const out: Changed = {};
  for (const [k, v] of Object.entries(after)) {
    const prev = before[k];
    const a = prev instanceof Date ? prev.toISOString() : prev;
    if (JSON.stringify(a ?? null) !== JSON.stringify(v ?? null)) out[k] = { from: a ?? null, to: v ?? null };
  }
  return out;
}

/** Creates a draft from the wizard's first step. */
export async function createDraft(actor: Actor, input: z.infer<typeof detailsSchema>) {
  if (!(await isSlugAvailable(input.slug))) throw new ActionError("That URL is taken.", { slug: "That URL is already taken" });
  const id = uuidv7();
  await tx(async (t) => {
    await t.insert(s.businesses).values({
      id,
      ownerId: actor.id,
      name: input.name,
      slug: input.slug,
      description: sanitizeHtml(input.description),
      email: input.email || null,
      website: input.website || null,
      phone: input.phone || null,
      phone2: input.phone2 || null,
      status: "draft",
      wizardStep: 2,
    });
    await replaceCategories(t, id, input.categoryIds);
    await audit({ actorId: actor.id, action: "business.create", entityType: "business", entityId: id, diff: { name: input.name } }, t);
  });
  await ensureOwnerRole(actor);
  await refreshSearchFields(id);
  return id;
}

/**
 * Saves one section of a business. Approved listings stay live, except name, category and
 * address changes, which send the listing back to pending_review.
 */
export async function saveSection(actor: Actor, businessId: string, section: Section, raw: unknown, opts: { immediate?: boolean; wizardStep?: number } = { immediate: true }) {
  const b = await loadEditable(businessId, actor);
  const staff = isStaffRole(actor.role) && b.ownerId !== actor.id;
  let needsReview = false;
  let changed: Changed = {};
  const oldSlug = b.slug;

  await tx(async (t) => {
    if (section === "details") {
      const input = detailsSchema.parse(raw);
      if (input.slug !== b.slug && !(await isSlugAvailable(input.slug, b.id))) throw new ActionError("That URL is taken.", { slug: "That URL is already taken" });
      const current = await t.select({ id: s.businessCategories.categoryId }).from(s.businessCategories).where(eq(s.businessCategories.businessId, b.id));
      const catsChanged = JSON.stringify(current.map((c) => c.id).sort()) !== JSON.stringify([...input.categoryIds].sort());
      const values = {
        name: input.name,
        slug: input.slug,
        description: sanitizeHtml(input.description),
        email: input.email || null,
        website: input.website || null,
        phone: input.phone || null,
        phone2: input.phone2 || null,
      };
      changed = diff(b, values);
      if (catsChanged) changed.categories = { from: current.map((c) => c.id), to: input.categoryIds };
      needsReview = !!changed.name || catsChanged;
      await t.update(s.businesses).set(values).where(eq(s.businesses.id, b.id));
      if (catsChanged) await replaceCategories(t, b.id, input.categoryIds);
      if (input.slug !== oldSlug && b.status === "approved") {
        await t
          .insert(s.slugRedirects)
          .values({ entityType: "business", oldPath: `/biz/${oldSlug}`, newPath: `/biz/${input.slug}` })
          .onConflictDoUpdate({ target: s.slugRedirects.oldPath, set: { newPath: `/biz/${input.slug}` } });
        // Point older redirects at the new slug too (no redirect chains).
        await t.update(s.slugRedirects).set({ newPath: `/biz/${input.slug}` }).where(eq(s.slugRedirects.newPath, `/biz/${oldSlug}`));
        await t.delete(s.slugRedirects).where(eq(s.slugRedirects.oldPath, `/biz/${input.slug}`));
      }
    } else if (section === "location") {
      const input = locationSchema.parse(raw);
      const city = await resolveCity(t, input.stateId, input.cityName, input.lat, input.lng);
      const values = {
        countryCode: input.countryCode,
        address: input.address || null,
        cityId: city.id,
        stateId: input.stateId,
        zip: input.zip,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        hideAddress: input.hideAddress,
        timezone: input.timezone,
      };
      changed = diff(b, values);
      needsReview = !!(changed.address || changed.cityId || changed.stateId || changed.zip);
      await t.update(s.businesses).set(values).where(eq(s.businesses.id, b.id));
    } else if (section === "hours") {
      const { hours } = hoursSchema.parse(raw);
      await t.delete(s.businessHours).where(eq(s.businessHours.businessId, b.id));
      if (hours.length) {
        await t.insert(s.businessHours).values(
          hours.map((h) => ({
            businessId: b.id,
            day: h.day,
            sequence: h.sequence,
            isClosed: h.isClosed,
            is24h: h.is24h,
            openTime: h.isClosed || h.is24h ? null : (h.openTime ?? null),
            closeTime: h.isClosed || h.is24h ? null : (h.closeTime ?? null),
          })),
        );
      }
      changed = { hours: { from: "…", to: `${hours.length} rows` } };
    } else if (section === "media") {
      const input = mediaInfoSchema.parse(raw);
      const values = { videoUrl: input.videoUrl || null };
      changed = diff(b, values);
      await t.update(s.businesses).set(values).where(eq(s.businesses.id, b.id));
    } else if (section === "seo") {
      const input = seoSchema.parse(raw);
      const seo = { metaTitle: input.metaTitle || null, metaKeywords: input.metaKeywords || null, metaDescription: input.metaDescription || null, tags: input.tags };
      await t.insert(s.businessSeo).values({ businessId: b.id, ...seo }).onConflictDoUpdate({ target: s.businessSeo.businessId, set: seo });
      await t.delete(s.socialLinks).where(eq(s.socialLinks.businessId, b.id));
      const links = Object.entries(input.social).filter(([, url]) => !!url) as [SocialPlatform, string][];
      if (links.length) await t.insert(s.socialLinks).values(links.map(([platform, url]) => ({ businessId: b.id, platform, url })));
      changed = { seo: { from: "…", to: "updated" } };
    }

    const patch: Partial<typeof s.businesses.$inferInsert> = {};
    if (opts.wizardStep && opts.wizardStep > b.wizardStep) patch.wizardStep = opts.wizardStep;
    if (needsReview && b.status === "approved" && !staff) {
      patch.status = "pending_review";
      patch.submittedAt = new Date();
    }
    if (Object.keys(patch).length) await t.update(s.businesses).set(patch).where(eq(s.businesses.id, b.id));
    if (Object.keys(changed).length) {
      await audit({ actorId: actor.id, action: `business.update.${section}`, entityType: "business", entityId: b.id, diff: changed }, t);
    }
  });

  await refreshSearchFields(b.id);
  await revalidateBusiness(b.id, { immediate: opts.immediate !== false, extraSlugs: [oldSlug] });
  return { backToReview: needsReview && b.status === "approved" && !staff };
}

/** Checks the minimum fields needed to submit a listing. */
export async function submissionProblems(businessId: string) {
  const b = await db.query.businesses.findFirst({
    where: eq(s.businesses.id, businessId),
    with: { categories: true, hours: true },
  });
  if (!b) return ["Business not found"];
  const problems: string[] = [];
  if (!b.categories.length) problems.push("Choose at least one category (Details)");
  if (!b.stateId || !b.cityId || !b.zip) problems.push("Add your city, state and ZIP (Location)");
  if (!b.description) problems.push("Add a description (Details)");
  return problems;
}

export async function submitForReview(actor: Actor, businessId: string, opts: { immediate?: boolean } = { immediate: true }) {
  const b = await loadEditable(businessId, actor);
  const problems = await submissionProblems(b.id);
  if (problems.length) throw new ActionError(`Finish these steps first: ${problems.join("; ")}`);
  if (b.status === "approved") return;
  await db.update(s.businesses).set({ status: "pending_review", submittedAt: new Date(), rejectionReason: null, wizardStep: 6 }).where(eq(s.businesses.id, b.id));
  await audit({ actorId: actor.id, action: "business.submit", entityType: "business", entityId: b.id });
  await revalidateBusiness(b.id, { immediate: opts.immediate !== false });
  const owner = b.ownerId ? await db.query.users.findFirst({ where: eq(s.users.id, b.ownerId), columns: { email: true, name: true } }) : null;
  if (owner) {
    await sendEmail({ to: owner.email, template: "listing-submitted", data: { name: owner.name, businessName: b.name } }).catch(() => {});
    await notify({ userId: b.ownerId!, type: "listing_status", title: `${b.name} was submitted for review`, link: "/dashboard/businesses" });
  }
}

/** Soft delete (30-day restore window; the cleanup cron purges after 30 days). */
export async function softDelete(actor: Actor, businessId: string, opts: { immediate?: boolean } = { immediate: true }) {
  const b = await loadEditable(businessId, actor);
  await db.update(s.businesses).set({ deletedAt: new Date() }).where(eq(s.businesses.id, b.id));
  await audit({ actorId: actor.id, action: "business.delete", entityType: "business", entityId: b.id });
  await revalidateBusiness(b.id, { immediate: opts.immediate !== false });
}

export async function restore(actor: Actor, businessId: string) {
  const b = await db.query.businesses.findFirst({ where: eq(s.businesses.id, businessId) });
  if (!b || (b.ownerId !== actor.id && !isStaffRole(actor.role))) throw new ActionError("Business not found.");
  await db.update(s.businesses).set({ deletedAt: null }).where(eq(s.businesses.id, b.id));
  await audit({ actorId: actor.id, action: "business.restore", entityType: "business", entityId: b.id });
  await revalidateBusiness(b.id, { immediate: true });
}

/** Copies a business (details, categories, hours, social, SEO) into a new draft. */
export async function duplicate(actor: Actor, businessId: string) {
  const b = await loadEditable(businessId, actor);
  const id = uuidv7();
  const slug = await uniqueSlug(`${b.slug}-copy`);
  await tx(async (t) => {
    const { id: _id, slug: _slug, searchVector: _sv, location: _loc, createdAt: _c, updatedAt: _u, deletedAt: _d, ...rest } = b;
    await t.insert(s.businesses).values({
      ...rest,
      id,
      slug,
      name: `${b.name} (copy)`,
      ownerId: actor.id,
      status: "draft",
      verificationStatus: "unverified",
      claimed: false,
      featured: false,
      avgRating: 0,
      reviewCount: 0,
      lastReviewAt: null,
      submittedAt: null,
      approvedAt: null,
      rejectionReason: null,
    });
    await t.execute(sql`insert into business_categories (business_id, category_id, is_primary) select ${id}, category_id, is_primary from business_categories where business_id = ${b.id}`);
    await t.execute(sql`insert into business_hours (id, business_id, day, open_time, close_time, is_closed, is_24h, sequence) select gen_random_uuid(), ${id}, day, open_time, close_time, is_closed, is_24h, sequence from business_hours where business_id = ${b.id}`);
    await t.execute(sql`insert into social_links (business_id, platform, url) select ${id}, platform, url from social_links where business_id = ${b.id}`);
    await t.execute(sql`insert into business_seo (business_id, meta_title, meta_keywords, meta_description, tags) select ${id}, meta_title, meta_keywords, meta_description, tags from business_seo where business_id = ${b.id}`);
    await audit({ actorId: actor.id, action: "business.duplicate", entityType: "business", entityId: id, diff: { from: b.id } }, t);
  });
  await refreshSearchFields(id);
  return id;
}

/* ── Media ─────────────────────────────────────────────────────── */

export const MAX_GALLERY = 20;

/** Processes an uploaded original into WebP variants and saves the media row. Logo/banner replace the previous one. */
export async function addMedia(actor: Actor, businessId: string, type: "logo" | "banner" | "gallery", key: string, opts: { immediate?: boolean } = { immediate: true }) {
  const b = await loadEditable(businessId, actor);
  if (!key.startsWith(`business/${actor.id}/`) && !isStaffRole(actor.role)) throw new ActionError("Invalid upload.");
  if (type === "gallery") {
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from media where business_id = ${b.id} and type = 'gallery'`)).rows as { n: number }[];
    if (n >= MAX_GALLERY) throw new ActionError(`You can add up to ${MAX_GALLERY} gallery photos.`);
  }
  const img = await processUploadedImage(key, { crop: type === "logo" ? 1 : type === "banner" ? 16 / 9 : undefined });
  let old: { id: string; key: string }[] = [];
  if (type !== "gallery") {
    old = await db.select({ id: s.media.id, key: s.media.key }).from(s.media).where(and(eq(s.media.businessId, b.id), eq(s.media.type, type)));
  }
  const nextOrder =
    type === "gallery"
      ? Number(((await db.execute(sql`select coalesce(max(sort_order), -1) + 1 as n from media where business_id = ${b.id} and type = 'gallery'`)).rows[0] as { n: number }).n)
      : 0;
  const [row] = await db
    .insert(s.media)
    .values({ businessId: b.id, type, key: img.key, url: img.url, width: img.width, height: img.height, blurDataUrl: img.blurDataUrl, alt: `${b.name} ${type}`, sortOrder: nextOrder })
    .returning();
  if (old.length) {
    await db.delete(s.media).where(inArray(s.media.id, old.map((o) => o.id)));
    await Promise.all(old.map((o) => deleteImageVariants(o.key)));
  }
  await revalidateBusiness(b.id, { immediate: opts.immediate !== false });
  return row!;
}

export async function deleteMedia(actor: Actor, mediaId: string) {
  const m = await db.query.media.findFirst({ where: eq(s.media.id, mediaId) });
  if (!m) throw new ActionError("Photo not found.");
  await loadEditable(m.businessId, actor);
  await db.delete(s.media).where(eq(s.media.id, m.id));
  await deleteImageVariants(m.key).catch(() => {});
  await revalidateBusiness(m.businessId, { immediate: true });
}

export async function reorderGallery(actor: Actor, businessId: string, ids: string[]) {
  await loadEditable(businessId, actor);
  await tx(async (t) => {
    for (const [i, id] of ids.entries()) {
      await t.update(s.media).set({ sortOrder: i }).where(and(eq(s.media.id, id), eq(s.media.businessId, businessId)));
    }
  });
  await revalidateBusiness(businessId, { immediate: true });
}
