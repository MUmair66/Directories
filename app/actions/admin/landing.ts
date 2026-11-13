"use server";
import { updateTag } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { audit, notify } from "@/lib/audit";
import { db, schema as s, tx } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { sanitizeHtml, stripHtml } from "@/lib/sanitize";
import { landingSeedForBusiness } from "@/lib/data/landing";
import { defaultLandingContent, type LandingContent } from "@/lib/landing";
import { createLandingSchema, saveLandingSchema } from "@/lib/validations/landing";

const STAFF = ["admin", "editor"] as const;

async function assertSlugFree(slug: string, exceptId?: string) {
  const taken = await db.query.landingPages.findFirst({
    where: exceptId ? and(eq(s.landingPages.slug, slug), ne(s.landingPages.id, exceptId)) : eq(s.landingPages.slug, slug),
    columns: { id: true },
  });
  if (taken) throw new ActionError("That URL is already used by another landing page.", { slug: "That URL is already used by another landing page." });
}

/** Creates a page with the standard structure, pre-filled from the business profile. Starts as a draft. */
export const createLandingPage = action({ schema: createLandingSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const seed = await landingSeedForBusiness(input.businessId);
  if (!seed) throw new ActionError("Business not found.", { businessId: "Business not found." });
  await assertSlugFree(input.slug);
  const owner = await db.query.businesses.findFirst({ where: eq(s.businesses.id, seed.id), columns: { ownerId: true } });
  const [row] = await db
    .insert(s.landingPages)
    .values({
      businessId: seed.id,
      ownerId: owner?.ownerId ?? user.id,
      template: "service",
      title: input.title,
      slug: input.slug,
      content: defaultLandingContent(seed),
      seoTitle: input.title.slice(0, 70),
      seoDescription: `${seed.name}${seed.cityName ? ` in ${seed.cityName}${seed.stateCode ? `, ${seed.stateCode}` : ""}` : ""}: free estimates, trusted local service and real customer reviews.`.slice(0, 170),
      status: "draft",
    })
    .returning({ id: s.landingPages.id });
  await audit({ actorId: user.id, action: "landing.create", entityType: "landing_page", entityId: row!.id, diff: { slug: input.slug, businessId: seed.id }, ip });
  return { ok: true, message: "Landing page created. Customize it, then publish.", data: { id: row!.id } };
});

function cleanContent(c: LandingContent): LandingContent {
  return {
    ...c,
    sections: c.sections.map((sec) => ({
      ...sec,
      body: sanitizeHtml(sec.body),
      items: sec.items.map((i) => ({ title: stripHtml(i.title), text: stripHtml(i.text), imageUrl: i.imageUrl })),
    })),
  };
}

export const saveLandingPage = action({ schema: saveLandingSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const before = await db.query.landingPages.findFirst({ where: and(eq(s.landingPages.id, input.id), isNull(s.landingPages.deletedAt)) });
  if (!before) throw new ActionError("Landing page not found.");
  await assertSlugFree(input.slug, input.id);
  const biz = await db.query.businesses.findFirst({ where: eq(s.businesses.id, input.businessId), columns: { id: true, name: true, ownerId: true, status: true } });
  if (!biz) throw new ActionError("Business not found.", { businessId: "Business not found." });
  if (input.status === "published" && biz.status !== "approved") {
    throw new ActionError("This business isn't approved yet, so its landing page can't be published.", { status: "Approve the business listing first." });
  }

  await tx(async (t) => {
    await t
      .update(s.landingPages)
      .set({
        businessId: biz.id,
        ownerId: biz.ownerId ?? before.ownerId,
        title: input.title,
        slug: input.slug,
        status: input.status,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
        content: cleanContent(input.content),
        updatedAt: new Date(),
      })
      .where(eq(s.landingPages.id, input.id));
    if (before.slug !== input.slug) {
      await t
        .insert(s.slugRedirects)
        .values({ entityType: "landing_page", oldPath: `/${before.slug}`, newPath: `/${input.slug}` })
        .onConflictDoUpdate({ target: s.slugRedirects.oldPath, set: { newPath: `/${input.slug}` } });
      // A page may reuse a URL that used to redirect elsewhere.
      await t.delete(s.slugRedirects).where(eq(s.slugRedirects.oldPath, `/${input.slug}`));
    }
    await audit({ actorId: user.id, action: "landing.update", entityType: "landing_page", entityId: input.id, diff: { slug: input.slug, status: input.status, sections: input.content.sections.length }, ip }, t);
    // Tell the owner when their page goes live for the first time.
    if (biz.ownerId && before.status !== "published" && input.status === "published") {
      await notify({ userId: biz.ownerId, type: "listing_status", title: "Your landing page is live", body: `${input.title} is now published for ${biz.name}.`, link: "/dashboard/landing-pages" }, t);
    }
  });

  updateTag(tags.landingPage(before.slug));
  if (before.slug !== input.slug) updateTag(tags.landingPage(input.slug));
  return { ok: true, message: input.status === "published" ? "Saved and published." : "Saved as draft." };
});

export const deleteLandingPage = action({ schema: z.object({ id: z.uuid() }), roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  const [row] = await db.update(s.landingPages).set({ deletedAt: new Date(), status: "draft" }).where(eq(s.landingPages.id, id)).returning({ slug: s.landingPages.slug });
  if (!row) throw new ActionError("Landing page not found.");
  await audit({ actorId: user.id, action: "landing.delete", entityType: "landing_page", entityId: id, ip });
  updateTag(tags.landingPage(row.slug));
  return { ok: true, message: "Landing page deleted." };
});

export const duplicateLandingPage = action({ schema: z.object({ id: z.uuid() }), roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  const src = await db.query.landingPages.findFirst({ where: and(eq(s.landingPages.id, id), isNull(s.landingPages.deletedAt)) });
  if (!src) throw new ActionError("Landing page not found.");
  let slug = `${src.slug}-copy`.slice(0, 120);
  for (let i = 2; await db.query.landingPages.findFirst({ where: eq(s.landingPages.slug, slug), columns: { id: true } }); i++) slug = `${src.slug}-copy-${i}`.slice(0, 120);
  const [row] = await db
    .insert(s.landingPages)
    .values({ businessId: src.businessId, ownerId: src.ownerId, template: src.template, title: `${src.title} (copy)`.slice(0, 160), slug, content: src.content, seoTitle: src.seoTitle, seoDescription: src.seoDescription, status: "draft" })
    .returning({ id: s.landingPages.id });
  await audit({ actorId: user.id, action: "landing.duplicate", entityType: "landing_page", entityId: row!.id, diff: { from: id }, ip });
  return { ok: true, message: "Copy created as a draft.", data: { id: row!.id } };
});

/** Default title + slug suggestion for the "new page" form when a business is picked. */
export const landingSuggestion = action({ schema: z.object({ businessId: z.uuid() }), roles: [...STAFF] }, async ({ businessId }) => {
  const seed = await landingSeedForBusiness(businessId);
  if (!seed) throw new ActionError("Business not found.");
  return { ok: true, data: { name: seed.name, categoryName: seed.categoryName, cityName: seed.cityName, stateCode: seed.stateCode } };
});
