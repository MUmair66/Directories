"use server";
import { after } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidateTag, updateTag } from "next/cache";
import { action, ActionError } from "@/lib/action";
import { db, schema as s, tx } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/audit";
import { tags } from "@/lib/cache-tags";
import { absoluteUrl } from "@/lib/site";
import {
  contactSchema,
  messageSchema,
  newsletterSchema,
  pricingLeadSchema,
  reportReviewSchema,
  reviewSchema,
} from "@/lib/validations/forms";

async function wantsEmail(userId: string, key: "review" | "lead" | "ticket" | "listingStatus") {
  const pref = await db.query.userPreferences.findFirst({ where: eq(s.userPreferences.userId, userId) });
  return pref ? pref.notify[key] !== false : true;
}

export const subscribeNewsletter = action({ schema: newsletterSchema, auth: false, rateLimit: "contact" }, async ({ email }) => {
  await db.insert(s.newsletterSubscribers).values({ email: email.toLowerCase() }).onConflictDoNothing();
  return { ok: true, message: "Thanks! You're subscribed." };
});

export const submitContact = action({ schema: contactSchema, auth: false, rateLimit: "contact", turnstile: true }, async (input) => {
  const { turnstileToken: _t, ...data } = input;
  await db.insert(s.contactSubmissions).values({ ...data, phone: data.phone || null, company: data.company || null });
  const to = process.env.ADMIN_EMAIL;
  if (to) {
    after(() => sendEmail({ to, template: "contact-received", data: { name: `${data.firstName} ${data.lastName}`, email: data.email, message: data.message } }));
  }
  return { ok: true, message: "Thanks! We'll get back to you within 1 business day." };
});

export const submitPricingLead = action({ schema: pricingLeadSchema, auth: false, rateLimit: "contact", turnstile: true }, async (input) => {
  const plan = await db.query.pricingPlans.findFirst({ where: eq(s.pricingPlans.id, input.planId) });
  if (!plan) throw new ActionError("That plan is no longer available.");
  await db.insert(s.leads).values({
    source: "pricing",
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    message: input.message || null,
    meta: { plan: plan.name, billing: input.billing, company: input.company ?? null },
  });
  return { ok: true, message: "Thanks! Our team will contact you shortly." };
});

/** "Send message" on a profile or landing page: saves a Lead and emails the owner. */
export const sendMessage = action({ schema: messageSchema, auth: false, rateLimit: "message", turnstile: true }, async (input) => {
  const biz = await db.query.businesses.findFirst({
    where: and(eq(s.businesses.id, input.businessId), eq(s.businesses.status, "approved"), isNull(s.businesses.deletedAt)),
    columns: { id: true, name: true, email: true, ownerId: true },
  });
  if (!biz) throw new ActionError("This business is not accepting messages right now.");

  await tx(async (t) => {
    await t.insert(s.leads).values({
      businessId: biz.id,
      landingPageId: input.landingPageId ?? null,
      source: input.landingPageId ? "landing_page" : "message",
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      message: input.message,
    });
    await t.insert(s.eventLog).values({ businessId: biz.id, type: "message" });
    if (biz.ownerId) await notify({ userId: biz.ownerId, type: "lead", title: `New message from ${input.name}`, body: input.message.slice(0, 140), link: "/dashboard/leads" }, t);
  });

  after(async () => {
    const to = biz.ownerId ? (await db.query.users.findFirst({ where: eq(s.users.id, biz.ownerId), columns: { email: true } }))?.email : biz.email;
    if (to && (!biz.ownerId || (await wantsEmail(biz.ownerId, "lead")))) {
      await sendEmail({ to, template: "new-lead", data: { businessName: biz.name, leadName: input.name, email: input.email, phone: input.phone, message: input.message } });
    }
  });
  return { ok: true, message: "Message sent! The business will contact you soon." };
});

/** Review insert + rating aggregates in one transaction. One review per user per business. */
export const submitReview = action({ schema: reviewSchema, rateLimit: "review", turnstile: true }, async (input, { user }) => {
  const biz = await db.query.businesses.findFirst({
    where: and(eq(s.businesses.id, input.businessId), eq(s.businesses.status, "approved"), isNull(s.businesses.deletedAt)),
    columns: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!biz) throw new ActionError("Business not found.");
  if (biz.ownerId === user.id) throw new ActionError("You can't review your own business.");

  const existing = await db.query.reviews.findFirst({ where: and(eq(s.reviews.businessId, biz.id), eq(s.reviews.userId, user.id)) });
  if (existing && !existing.deletedAt) throw new ActionError("You've already reviewed this business. Edit your review from your dashboard.");

  await tx(async (t) => {
    if (existing) {
      await t.update(s.reviews).set({ rating: input.rating, body: input.body, deletedAt: null, status: "published", createdAt: new Date() }).where(eq(s.reviews.id, existing.id));
    } else {
      await t.insert(s.reviews).values({ businessId: biz.id, userId: user.id, rating: input.rating, body: input.body });
    }
    await t.execute(sql`select refresh_business_rating(${biz.id}::uuid)`);
    if (biz.ownerId) await notify({ userId: biz.ownerId, type: "review", title: `New ${input.rating}-star review`, body: input.body.slice(0, 140), link: "/dashboard/reviews" }, t);
  });

  updateTag(tags.reviews(biz.id));
  updateTag(tags.business(biz.id));
  revalidateTag(tags.listings, "max");

  if (biz.ownerId) {
    const ownerId = biz.ownerId;
    after(async () => {
      const owner = await db.query.users.findFirst({ where: eq(s.users.id, ownerId), columns: { email: true } });
      if (owner && (await wantsEmail(ownerId, "review"))) {
        await sendEmail({ to: owner.email, template: "new-review", data: { businessName: biz.name, rating: input.rating, body: input.body, url: absoluteUrl("/dashboard/reviews") } });
      }
    });
  }
  return { ok: true, message: "Thanks! Your review is live." };
});

export const reportReview = action({ schema: reportReviewSchema, rateLimit: "review" }, async (input, { user }) => {
  await db.insert(s.reviewReports).values({ reviewId: input.reviewId, reporterId: user.id, reason: input.reason });
  return { ok: true, message: "Thanks. Our moderators will review this report." };
});
