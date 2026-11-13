"use server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { isStaffRole } from "@/lib/businesses";
import { sanitizeHtml } from "@/lib/sanitize";

async function ownedReview(reviewId: string, user: { id: string; role?: string | null }) {
  const r = await db
    .select({ id: s.reviews.id, businessId: s.reviews.businessId, ownerId: s.businesses.ownerId })
    .from(s.reviews)
    .innerJoin(s.businesses, eq(s.businesses.id, s.reviews.businessId))
    .where(and(eq(s.reviews.id, reviewId), isNull(s.reviews.deletedAt)))
    .limit(1);
  const row = r[0];
  if (!row || (row.ownerId !== user.id && !isStaffRole(user.role))) throw new ActionError("Review not found.");
  return row;
}

/** One public owner reply per review (editable). */
export const replyToReview = action(
  { schema: z.object({ reviewId: z.uuid(), body: z.string().trim().min(2, "Write a reply").max(2000) }), rateLimit: "write" },
  async ({ reviewId, body }, { user }) => {
    const r = await ownedReview(reviewId, user);
    const clean = sanitizeHtml(body).replace(/<[^>]*>/g, "");
    await db
      .insert(s.reviewReplies)
      .values({ reviewId, authorId: user.id, body: clean })
      .onConflictDoUpdate({ target: s.reviewReplies.reviewId, set: { body: clean, updatedAt: new Date() } });
    updateTag(tags.reviews(r.businessId));
    return { ok: true, message: "Reply published" };
  },
);

export const deleteReply = action({ schema: z.object({ reviewId: z.uuid() }), rateLimit: "write" }, async ({ reviewId }, { user }) => {
  const r = await ownedReview(reviewId, user);
  await db.delete(s.reviewReplies).where(eq(s.reviewReplies.reviewId, reviewId));
  updateTag(tags.reviews(r.businessId));
  return { ok: true, message: "Reply removed" };
});

export const reportReviewToAdmin = action(
  { schema: z.object({ reviewId: z.uuid(), reason: z.string().trim().min(5, "Tell us what's wrong").max(500) }), rateLimit: "review" },
  async ({ reviewId, reason }, { user }) => {
    await ownedReview(reviewId, user);
    await db.insert(s.reviewReports).values({ reviewId, reporterId: user.id, reason });
    return { ok: true, message: "Reported. Our moderators will review it." };
  },
);

export const setLeadStatus = action(
  { schema: z.object({ leadIds: z.array(z.uuid()).min(1).max(500), status: z.enum(["new", "contacted", "closed"]) }), rateLimit: "write" },
  async ({ leadIds, status }, { user }) => {
    const res = await db.execute(sql`
      update leads l set status = ${status}::lead_status, updated_at = now()
      from businesses b where b.id = l.business_id and b.owner_id = ${user.id} and l.id in (${sql.join(leadIds.map((id) => sql`${id}::uuid`), sql`, `)})
      returning l.id`);
    if (!res.rows.length) throw new ActionError("Lead not found.");
    return { ok: true, message: `Marked as ${status}` };
  },
);

export const setNotifyPrefs = action(
  { schema: z.object({ review: z.boolean(), lead: z.boolean(), ticket: z.boolean(), listingStatus: z.boolean() }), rateLimit: "write" },
  async (notify, { user }) => {
    await db.insert(s.userPreferences).values({ userId: user.id, notify }).onConflictDoUpdate({ target: s.userPreferences.userId, set: { notify } });
    return { ok: true, message: "Notification preferences saved" };
  },
);

export const removeFavorite = action({ schema: z.object({ businessId: z.uuid() }), rateLimit: "write" }, async ({ businessId }, { user }) => {
  await db.delete(s.favorites).where(and(eq(s.favorites.userId, user.id), eq(s.favorites.businessId, businessId)));
  return { ok: true, message: "Removed from favorites" };
});

export const markNotificationsRead = action(
  { schema: z.object({ ids: z.array(z.uuid()).max(200).optional() }), rateLimit: "write" },
  async ({ ids }, { user }) => {
    const where = ids?.length
      ? and(eq(s.notifications.userId, user.id), inArray(s.notifications.id, ids))
      : and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt));
    await db.update(s.notifications).set({ readAt: new Date() }).where(where);
    return { ok: true, message: "Marked as read" };
  },
);
