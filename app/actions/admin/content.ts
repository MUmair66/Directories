"use server";
import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { db, schema as s, tx } from "@/lib/db";
import { sanitizeHtml, stripHtml } from "@/lib/sanitize";
import { readMinutes } from "@/lib/text";
import { tags } from "@/lib/cache-tags";
import { processUploadedImage } from "@/lib/images";
import { blogCategorySchema, blogPostSchema, faqSchema, pageSchema, pricingPlanSchema, testimonialSchema, topProsSchema } from "./schemas";

const STAFF = ["admin", "editor"] as const;
const nul = (v: string | undefined | null) => (v ? v : null);
const idOnly = z.object({ id: z.uuid() });

/* ── Images (category images, covers, testimonial photos, logo) ───── */

export const processContentImage = action(
  { schema: z.object({ key: z.string().regex(/^content\//, "Invalid upload"), crop: z.number().positive().optional() }), roles: [...STAFF], rateLimit: "upload" },
  async ({ key, crop }, { user }) => {
    if (!key.startsWith(`content/${user.id}/`)) throw new ActionError("Invalid upload.");
    const img = await processUploadedImage(key, { crop });
    return { ok: true, data: { url: img.url } };
  },
);

/** Cities for a state (Top Pros location picker). */
export const citiesForStateAction = action({ schema: z.object({ stateId: z.uuid() }), roles: [...STAFF] }, async ({ stateId }) => {
  const rows = await db.query.cities.findMany({ where: eq(s.cities.stateId, stateId), columns: { id: true, name: true }, orderBy: (c, { desc, asc }) => [desc(c.population), asc(c.name)], limit: 1000 });
  return { ok: true, data: rows };
});

/* ── Top Pros ─────────────────────────────────────────────────────── */

export const saveTopPros = action({ schema: topProsSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const values = {
    title: input.title,
    slug: input.slug,
    stateId: nul(input.stateId),
    cityId: nul(input.cityId),
    categoryId: nul(input.categoryId),
    intro: input.intro ? sanitizeHtml(input.intro) : null,
    criteria: input.criteria ? sanitizeHtml(input.criteria) : null,
    faqs: input.faqs.map((f) => ({ question: stripHtml(f.question), answer: stripHtml(f.answer) })),
    coverUrl: nul(input.coverUrl),
    metaTitle: nul(input.metaTitle),
    metaDescription: nul(input.metaDescription),
    status: input.status,
  };
  const id = await tx(async (t) => {
    let pageId = input.id;
    if (pageId) {
      const before = await t.query.topProsPages.findFirst({ where: eq(s.topProsPages.id, pageId), columns: { publishedAt: true, slug: true } });
      if (!before) throw new ActionError("Page not found.");
      await t
        .update(s.topProsPages)
        .set({ ...values, publishedAt: input.status === "published" ? (before.publishedAt ?? new Date()) : before.publishedAt })
        .where(eq(s.topProsPages.id, pageId));
      if (before.slug !== input.slug) {
        await t.insert(s.slugRedirects).values({ entityType: "top_pros", oldPath: `/top-pros/${before.slug}`, newPath: `/top-pros/${input.slug}` }).onConflictDoUpdate({ target: s.slugRedirects.oldPath, set: { newPath: `/top-pros/${input.slug}` } });
      }
    } else {
      const [row] = await t.insert(s.topProsPages).values({ ...values, publishedAt: input.status === "published" ? new Date() : null }).returning({ id: s.topProsPages.id });
      pageId = row!.id;
    }
    await t.delete(s.topProsItems).where(eq(s.topProsItems.pageId, pageId));
    const seen = new Set<string>();
    const items = input.items.filter((i) => (seen.has(i.businessId) ? false : (seen.add(i.businessId), true)));
    if (items.length) {
      await t.insert(s.topProsItems).values(items.map((i, idx) => ({ pageId: pageId!, businessId: i.businessId, rank: idx + 1, blurb: nul(i.blurb ? stripHtml(i.blurb) : null) })));
    }
    await audit({ actorId: user.id, action: input.id ? "top_pros.update" : "top_pros.create", entityType: "top_pros", entityId: pageId, diff: { title: values.title, status: values.status, items: items.length }, ip }, t);
    return pageId!;
  });
  updateTag(tags.content("top-pros"));
  return { ok: true, message: "Top Pros page saved.", data: { id } };
});

export const deleteTopPros = action({ schema: idOnly, roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  await db.delete(s.topProsPages).where(eq(s.topProsPages.id, id));
  await audit({ actorId: user.id, action: "top_pros.delete", entityType: "top_pros", entityId: id, ip });
  updateTag(tags.content("top-pros"));
  return { ok: true, message: "Page deleted." };
});

/* ── Blog ─────────────────────────────────────────────────────────── */

export const saveBlogPost = action({ schema: blogPostSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const content = sanitizeHtml(input.content);
  const values = {
    title: input.title,
    slug: input.slug,
    excerpt: nul(input.excerpt),
    content,
    coverUrl: nul(input.coverUrl),
    categoryId: nul(input.categoryId),
    metaTitle: nul(input.metaTitle),
    metaDescription: nul(input.metaDescription),
    status: input.status,
    readMinutes: readMinutes(content),
  };
  let id = input.id;
  if (id) {
    const before = await db.query.blogPosts.findFirst({ where: eq(s.blogPosts.id, id), columns: { publishedAt: true, slug: true } });
    if (!before) throw new ActionError("Post not found.");
    await tx(async (t) => {
      await t.update(s.blogPosts).set({ ...values, publishedAt: input.status === "published" ? (before.publishedAt ?? new Date()) : before.publishedAt }).where(eq(s.blogPosts.id, id!));
      if (before.slug !== input.slug) {
        await t.insert(s.slugRedirects).values({ entityType: "blog", oldPath: `/blog/${before.slug}`, newPath: `/blog/${input.slug}` }).onConflictDoUpdate({ target: s.slugRedirects.oldPath, set: { newPath: `/blog/${input.slug}` } });
      }
    });
  } else {
    const [row] = await db.insert(s.blogPosts).values({ ...values, authorId: user.id, publishedAt: input.status === "published" ? new Date() : null }).returning({ id: s.blogPosts.id });
    id = row!.id;
  }
  await audit({ actorId: user.id, action: input.id ? "blog.update" : "blog.create", entityType: "blog_post", entityId: id, diff: { title: values.title, status: values.status }, ip });
  updateTag(tags.content("blog"));
  return { ok: true, message: "Post saved.", data: { id } };
});

export const deleteBlogPost = action({ schema: idOnly, roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  await db.delete(s.blogPosts).where(eq(s.blogPosts.id, id));
  await audit({ actorId: user.id, action: "blog.delete", entityType: "blog_post", entityId: id, ip });
  updateTag(tags.content("blog"));
  return { ok: true, message: "Post deleted." };
});

export const saveBlogCategory = action({ schema: blogCategorySchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  if (input.id) await db.update(s.blogCategories).set({ name: input.name, slug: input.slug }).where(eq(s.blogCategories.id, input.id));
  else await db.insert(s.blogCategories).values({ name: input.name, slug: input.slug });
  await audit({ actorId: user.id, action: "blog_category.save", entityType: "blog_category", entityId: input.id ?? null, diff: input, ip });
  updateTag(tags.content("blog"));
  return { ok: true, message: "Blog category saved." };
});

export const deleteBlogCategory = action({ schema: idOnly, roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  await db.delete(s.blogCategories).where(eq(s.blogCategories.id, id));
  await audit({ actorId: user.id, action: "blog_category.delete", entityType: "blog_category", entityId: id, ip });
  updateTag(tags.content("blog"));
  return { ok: true, message: "Blog category deleted. Its posts are now uncategorized." };
});

/* ── Testimonials, FAQs, pages, pricing ───────────────────────────── */

export const saveTestimonial = action({ schema: testimonialSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const values = { name: input.name, business: nul(input.business), quote: stripHtml(input.quote), photoUrl: nul(input.photoUrl), rating: input.rating, published: input.published, sortOrder: input.sortOrder };
  if (input.id) await db.update(s.testimonials).set(values).where(eq(s.testimonials.id, input.id));
  else await db.insert(s.testimonials).values(values);
  await audit({ actorId: user.id, action: "testimonial.save", entityType: "testimonial", entityId: input.id ?? null, diff: values, ip });
  updateTag(tags.content("testimonials"));
  return { ok: true, message: "Testimonial saved." };
});

export const deleteTestimonial = action({ schema: idOnly, roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  await db.delete(s.testimonials).where(eq(s.testimonials.id, id));
  await audit({ actorId: user.id, action: "testimonial.delete", entityType: "testimonial", entityId: id, ip });
  updateTag(tags.content("testimonials"));
  return { ok: true, message: "Testimonial deleted." };
});

export const saveFaq = action({ schema: faqSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const values = { group: input.group, question: stripHtml(input.question), answer: sanitizeHtml(input.answer), sortOrder: input.sortOrder };
  if (input.id) await db.update(s.faqs).set(values).where(eq(s.faqs.id, input.id));
  else await db.insert(s.faqs).values(values);
  await audit({ actorId: user.id, action: "faq.save", entityType: "faq", entityId: input.id ?? null, diff: values, ip });
  updateTag(tags.content("faqs"));
  return { ok: true, message: "FAQ saved." };
});

export const deleteFaq = action({ schema: idOnly, roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  await db.delete(s.faqs).where(eq(s.faqs.id, id));
  await audit({ actorId: user.id, action: "faq.delete", entityType: "faq", entityId: id, ip });
  updateTag(tags.content("faqs"));
  return { ok: true, message: "FAQ deleted." };
});

export const savePage = action({ schema: pageSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  await db.update(s.pages).set({ title: input.title, content: sanitizeHtml(input.content), metaDescription: nul(input.metaDescription) }).where(eq(s.pages.id, input.id));
  await audit({ actorId: user.id, action: "page.update", entityType: "page", entityId: input.id, diff: { title: input.title }, ip });
  updateTag(tags.content("pages"));
  return { ok: true, message: "Page saved." };
});

export const savePricingPlan = action({ schema: pricingPlanSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const values = {
    name: input.name, description: nul(input.description), monthlyPrice: input.monthlyPrice, yearlyPrice: input.yearlyPrice,
    features: input.features, ctaLabel: input.ctaLabel, highlighted: input.highlighted,
    stripePriceMonthly: nul(input.stripePriceMonthly), stripePriceYearly: nul(input.stripePriceYearly), sortOrder: input.sortOrder,
  };
  await tx(async (t) => {
    // Only one plan is highlighted (the middle "recommended" card).
    if (input.highlighted) await t.update(s.pricingPlans).set({ highlighted: false });
    if (input.id) await t.update(s.pricingPlans).set(values).where(eq(s.pricingPlans.id, input.id));
    else await t.insert(s.pricingPlans).values(values);
    await audit({ actorId: user.id, action: "pricing_plan.save", entityType: "pricing_plan", entityId: input.id ?? null, diff: values, ip }, t);
  });
  updateTag(tags.content("pricing"));
  return { ok: true, message: "Plan saved." };
});

export const deletePricingPlan = action({ schema: idOnly, roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  await db.delete(s.pricingPlans).where(eq(s.pricingPlans.id, id));
  await audit({ actorId: user.id, action: "pricing_plan.delete", entityType: "pricing_plan", entityId: id, ip });
  updateTag(tags.content("pricing"));
  return { ok: true, message: "Plan deleted." };
});
