"use server";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { audit, notify } from "@/lib/audit";
import { db, schema as s, tx } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { revalidateBusiness } from "@/lib/revalidate";
import { tags } from "@/lib/cache-tags";
import { absoluteUrl } from "@/lib/site";
import { slugify } from "@/lib/text";
import { STATE_TIMEZONES } from "@/db/seed/states";
import { importRowSchema } from "./schemas";

const STAFF = ["admin", "editor"] as const;
const ids = z.array(z.uuid()).min(1, "Select at least one business").max(200);

const STATUS_FOR = { approve: "approved", reject: "rejected", request_changes: "draft", suspend: "suspended" } as const;

/** Approve / Reject / Request changes / Suspend, single or bulk. Emails + notifies each owner. */
export const moderateBusinesses = action(
  {
    schema: z
      .object({ ids, decision: z.enum(["approve", "reject", "request_changes", "suspend"]), reason: z.string().trim().max(1000).optional() })
      .refine((v) => v.decision === "approve" || (v.reason && v.reason.length >= 5), { message: "Give a reason (at least 5 characters)", path: ["reason"] }),
    roles: [...STAFF],
  },
  async ({ ids, decision, reason }, { user, ip }) => {
    const rows = await db.query.businesses.findMany({
      where: and(inArray(s.businesses.id, ids), isNull(s.businesses.deletedAt)),
      columns: { id: true, name: true, slug: true, ownerId: true, status: true, stateId: true, cityId: true },
      with: { owner: { columns: { email: true, name: true } } },
    });
    const skipped: string[] = [];
    const changed: typeof rows = [];
    const status = STATUS_FOR[decision];
    const stored = decision === "request_changes" ? `Changes requested: ${reason}` : decision === "approve" ? null : (reason ?? null);

    await tx(async (t) => {
      for (const b of rows) {
        if (decision === "approve" && (!b.stateId || !b.cityId)) {
          skipped.push(`${b.name} (missing city or state)`);
          continue;
        }
        await t
          .update(s.businesses)
          .set({ status, rejectionReason: stored, ...(decision === "approve" ? { approvedAt: new Date() } : {}) })
          .where(eq(s.businesses.id, b.id));
        await audit({ actorId: user.id, action: `business.${decision}`, entityType: "business", entityId: b.id, diff: { from: b.status, to: status, reason: stored }, ip }, t);
        if (b.ownerId) {
          const label = decision === "request_changes" ? "needs changes" : status.replace("_", " ");
          await notify({ userId: b.ownerId, type: "listing_status", title: `${b.name} ${label}`, body: stored ?? undefined, link: `/dashboard/businesses/${b.id}/edit` }, t);
        }
        changed.push(b);
      }
    });

    for (const b of changed) await revalidateBusiness(b.id, { immediate: true });
    revalidateTag(tags.counts, "max");

    after(async () => {
      for (const b of changed) {
        if (!b.owner?.email) continue;
        await sendEmail({
          to: b.owner.email,
          template: "listing-status",
          data: {
            name: b.owner.name,
            businessName: b.name,
            status: decision === "request_changes" ? "changes requested" : status,
            reason: stored,
            url: decision === "approve" ? absoluteUrl(`/biz/${b.slug}`) : absoluteUrl(`/dashboard/businesses/${b.id}/edit`),
          },
        });
      }
    });

    const msg = `${changed.length} listing${changed.length === 1 ? "" : "s"} updated.`;
    return { ok: true, message: skipped.length ? `${msg} Skipped: ${skipped.join(", ")}` : msg };
  },
);

export const setFeatured = action({ schema: z.object({ ids, featured: z.boolean() }), roles: [...STAFF] }, async ({ ids, featured }, { user, ip }) => {
  await db.update(s.businesses).set({ featured }).where(inArray(s.businesses.id, ids));
  for (const id of ids) {
    await audit({ actorId: user.id, action: featured ? "business.feature" : "business.unfeature", entityType: "business", entityId: id, ip });
    await revalidateBusiness(id, { immediate: true });
  }
  return { ok: true, message: featured ? "Marked as featured." : "Removed from featured." };
});

/** Soft delete (30-day restore window; cron purges later). */
export const deleteBusinesses = action({ schema: z.object({ ids }), roles: [...STAFF] }, async ({ ids }, { user, ip }) => {
  await db.update(s.businesses).set({ deletedAt: new Date() }).where(inArray(s.businesses.id, ids));
  for (const id of ids) {
    await audit({ actorId: user.id, action: "business.delete", entityType: "business", entityId: id, ip });
    await revalidateBusiness(id, { immediate: true });
  }
  revalidateTag(tags.counts, "max");
  return { ok: true, message: `${ids.length} listing${ids.length === 1 ? "" : "s"} deleted.` };
});

export const restoreBusiness = action({ schema: z.object({ id: z.uuid() }), roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  await db.update(s.businesses).set({ deletedAt: null }).where(eq(s.businesses.id, id));
  await audit({ actorId: user.id, action: "business.restore", entityType: "business", entityId: id, ip });
  await revalidateBusiness(id, { immediate: true });
  return { ok: true, message: "Listing restored." };
});

/**
 * Merge a duplicate (source) into the canonical listing (target) in one transaction:
 * moves reviews, favorites, leads, events, media, categories, landing pages, claims and Top Pros
 * entries, soft-deletes the source and adds a 301 from its slug.
 */
export const mergeBusinesses = action(
  { schema: z.object({ sourceId: z.uuid(), targetSlug: z.string().trim().min(1, "Enter the slug of the listing to keep") }), roles: [...STAFF] },
  async ({ sourceId, targetSlug }, { user, ip }) => {
    const slug = targetSlug.replace(/^.*\/biz\//, "").replace(/\/$/, "");
    const [source, target] = await Promise.all([
      db.query.businesses.findFirst({ where: and(eq(s.businesses.id, sourceId), isNull(s.businesses.deletedAt)) }),
      db.query.businesses.findFirst({ where: and(eq(s.businesses.slug, slug), isNull(s.businesses.deletedAt)) }),
    ]);
    if (!source) throw new ActionError("The duplicate listing no longer exists.");
    if (!target) throw new ActionError("No listing found with that slug.", { targetSlug: "No listing found with that slug" });
    if (source.id === target.id) throw new ActionError("Choose a different listing to merge into.", { targetSlug: "That is the same listing" });
    const S = source.id;
    const T = target.id;

    await tx(async (t) => {
      // Reviews: keep the target's review when the same user reviewed both.
      await t.execute(sql`delete from reviews r using reviews r2 where r.business_id = ${S} and r2.business_id = ${T} and r2.user_id = r.user_id`);
      await t.execute(sql`update reviews set business_id = ${T} where business_id = ${S}`);
      await t.execute(sql`insert into favorites (user_id, business_id, created_at) select user_id, ${T}, created_at from favorites where business_id = ${S} on conflict do nothing`);
      await t.execute(sql`delete from favorites where business_id = ${S}`);
      await t.execute(sql`insert into business_categories (business_id, category_id, is_primary) select ${T}, category_id, false from business_categories where business_id = ${S} on conflict do nothing`);
      await t.execute(sql`delete from business_categories where business_id = ${S}`);
      await t.execute(sql`insert into business_stats_daily (business_id, date, views, calls, website_clicks, directions, messages)
        select ${T}, date, views, calls, website_clicks, directions, messages from business_stats_daily where business_id = ${S}
        on conflict (business_id, date) do update set views = business_stats_daily.views + excluded.views, calls = business_stats_daily.calls + excluded.calls,
          website_clicks = business_stats_daily.website_clicks + excluded.website_clicks, directions = business_stats_daily.directions + excluded.directions,
          messages = business_stats_daily.messages + excluded.messages`);
      await t.execute(sql`delete from business_stats_daily where business_id = ${S}`);
      await t.execute(sql`insert into top_pros_items (page_id, business_id, rank, blurb) select page_id, ${T}, rank, blurb from top_pros_items where business_id = ${S} on conflict do nothing`);
      await t.execute(sql`delete from top_pros_items where business_id = ${S}`);
      for (const table of ["leads", "event_log", "landing_pages", "claims", "business_verifications"]) {
        await t.execute(sql`update ${sql.identifier(table)} set business_id = ${T} where business_id = ${S}`);
      }
      await t.execute(sql`update media set business_id = ${T}, type = 'gallery' where business_id = ${S} and type = 'gallery'`);
      await t.update(s.businesses).set({ deletedAt: new Date(), status: "suspended", rejectionReason: `Merged into ${target.slug}` }).where(eq(s.businesses.id, S));
      if (!target.ownerId && source.ownerId) await t.update(s.businesses).set({ ownerId: source.ownerId, claimed: source.claimed }).where(eq(s.businesses.id, T));
      await t.insert(s.slugRedirects).values({ entityType: "business", oldPath: `/biz/${source.slug}`, newPath: `/biz/${target.slug}` }).onConflictDoUpdate({ target: s.slugRedirects.oldPath, set: { newPath: `/biz/${target.slug}` } });
      await t.execute(sql`update slug_redirects set new_path = ${`/biz/${target.slug}`} where new_path = ${`/biz/${source.slug}`}`);
      await t.execute(sql`select refresh_business_rating(${T}::uuid)`);
      await t.execute(sql`select refresh_business_search(${T}::uuid)`);
      await audit({ actorId: user.id, action: "business.merge", entityType: "business", entityId: T, diff: { mergedFrom: S, sourceSlug: source.slug }, ip }, t);
    });
    await revalidateBusiness(S, { immediate: true });
    await revalidateBusiness(T, { immediate: true });
    return { ok: true, message: `Merged “${source.name}” into “${target.name}”.` };
  },
);

/* ── CSV import ───────────────────────────────────────────────────── */

export type ImportResult = { inserted: number; errors: { row: number; message: string }[] };

/**
 * Imports one batch (max 500 rows) inside one transaction. Invalid rows are reported and skipped;
 * the valid rows of the batch commit together. `startRow` is the 1-based CSV line of rows[0].
 */
export const importBusinessesBatch = action(
  {
    schema: z.object({
      rows: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
      startRow: z.number().int().min(1),
      status: z.enum(["approved", "pending_review", "draft"]),
    }),
    roles: [...STAFF],
  },
  async ({ rows, startRow, status }, { user, ip }) => {
    const errors: ImportResult["errors"] = [];
    const parsed: { row: number; data: z.infer<typeof importRowSchema> }[] = [];
    rows.forEach((raw, i) => {
      const r = importRowSchema.safeParse(raw);
      if (r.success) parsed.push({ row: startRow + i, data: r.data });
      else errors.push({ row: startRow + i, message: r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
    });

    // Resolve states, cities and categories in bulk (no N+1).
    const codes = [...new Set(parsed.map((p) => p.data.state.toUpperCase()))];
    const states = codes.length ? await db.select({ id: s.states.id, code: s.states.code, name: s.states.name }).from(s.states).where(inArray(s.states.code, codes)) : [];
    const stateByCode = new Map(states.map((x) => [x.code, x]));
    const citySlugs = [...new Set(parsed.map((p) => slugify(p.data.city)))];
    const cities = citySlugs.length
      ? await db.select({ id: s.cities.id, stateId: s.cities.stateId, slug: s.cities.slug, name: s.cities.name, lat: s.cities.lat, lng: s.cities.lng }).from(s.cities).where(inArray(s.cities.slug, citySlugs))
      : [];
    const cityKey = (stateId: string, slug: string) => `${stateId}:${slug}`;
    const cityMap = new Map(cities.map((c) => [cityKey(c.stateId, c.slug), c]));
    const catSlugs = [...new Set(parsed.flatMap((p) => p.data.categories.split("|").map((c) => c.trim()).filter(Boolean)))];
    const cats = catSlugs.length ? await db.select({ id: s.categories.id, slug: s.categories.slug }).from(s.categories).where(inArray(s.categories.slug, catSlugs)) : [];
    const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

    type Ready = { row: number; values: typeof s.businesses.$inferInsert; categoryIds: string[] };
    const ready: Ready[] = [];
    for (const { row, data } of parsed) {
      const st = stateByCode.get(data.state.toUpperCase());
      if (!st) {
        errors.push({ row, message: `state: unknown code "${data.state}"` });
        continue;
      }
      const city = cityMap.get(cityKey(st.id, slugify(data.city)));
      if (!city) {
        errors.push({ row, message: `city: "${data.city}, ${st.code}" not found (add it under Locations first)` });
        continue;
      }
      const slugsIn = data.categories.split("|").map((c) => c.trim()).filter(Boolean);
      const missing = slugsIn.filter((c) => !catBySlug.has(c));
      if (missing.length) {
        errors.push({ row, message: `categories: unknown slug(s) ${missing.join(", ")}` });
        continue;
      }
      const lat = typeof data.lat === "number" ? data.lat : city.lat;
      const lng = typeof data.lng === "number" ? data.lng : city.lng;
      ready.push({
        row,
        categoryIds: slugsIn.slice(0, 5).map((c) => catBySlug.get(c)!),
        values: {
          name: data.name,
          slug: slugify(`${data.name} ${city.name} ${st.code}`),
          description: data.description ? `<p>${escapeHtml(data.description)}</p>` : null,
          email: data.email || null,
          website: data.website || null,
          phone: data.phone || null,
          phone2: data.phone2 || null,
          address: data.address || null,
          zip: data.zip || null,
          stateId: st.id,
          cityId: city.id,
          lat,
          lng,
          timezone: STATE_TIMEZONES[st.code] ?? "America/New_York",
          status,
          approvedAt: status === "approved" ? new Date() : null,
          submittedAt: status === "pending_review" ? new Date() : null,
        },
      });
    }

    // Unique slugs: suffix collisions with existing rows and within the batch.
    if (ready.length) {
      const wanted = ready.map((r) => r.values.slug);
      const taken = new Set(
        (await db.execute(sql`select slug from businesses where slug like any(array[${sql.join(wanted.map((w) => sql`${`${w}%`}`), sql`, `)}]::text[])`)).rows.map(
          (r) => (r as { slug: string }).slug,
        ),
      );
      for (const r of ready) {
        let candidate = r.values.slug;
        let n = 2;
        while (taken.has(candidate)) candidate = `${r.values.slug}-${n++}`;
        taken.add(candidate);
        r.values.slug = candidate;
      }
    }

    let inserted: { id: string }[] = [];
    if (ready.length) {
      inserted = await tx(async (t) => {
        const out = await t.insert(s.businesses).values(ready.map((r) => r.values)).returning({ id: s.businesses.id });
        const links = out.flatMap((b, i) => ready[i]!.categoryIds.map((categoryId, j) => ({ businessId: b.id, categoryId, isPrimary: j === 0 })));
        if (links.length) await t.insert(s.businessCategories).values(links).onConflictDoNothing();
        await t.execute(sql`select refresh_business_search(id) from businesses where id in (${sql.join(out.map((b) => sql`${b.id}::uuid`), sql`, `)})`);
        await audit({ actorId: user.id, action: "business.import", entityType: "business", diff: { count: out.length, startRow, status }, ip }, t);
        return out;
      });
      revalidateTag(tags.listings, "max");
      revalidateTag(tags.counts, "max");
    }
    return { ok: true, data: { inserted: inserted.length, errors } satisfies ImportResult };
  },
);

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Business search for pickers (Top Pros, merge). */
export const searchBusinessesForPicker = action({ schema: z.object({ q: z.string().trim().min(2).max(80) }), roles: [...STAFF] }, async ({ q }) => {
  const r = await db.execute(sql`
    select b.id, b.name, b.slug, b.city_name as "cityName", st.code as "stateCode", b.avg_rating::float as "avgRating", b.review_count as "reviewCount"
    from businesses b left join states st on st.id = b.state_id
    where b.status = 'approved' and b.deleted_at is null and (b.name ilike ${`%${q}%`} or b.slug ilike ${`%${q}%`})
    order by b.review_count desc limit 12`);
  return { ok: true, data: r.rows as { id: string; name: string; slug: string; cityName: string; stateCode: string | null; avgRating: number; reviewCount: number }[] };
});
