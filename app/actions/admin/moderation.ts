"use server";
import { after } from "next/server";
import { updateTag, revalidateTag } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { audit, notify } from "@/lib/audit";
import { db, schema as s, tx } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { presignGet, privateBucket } from "@/lib/r2";
import { revalidateBusiness } from "@/lib/revalidate";
import { tags } from "@/lib/cache-tags";

const STAFF = ["admin", "editor"] as const;
const reason = z.string().trim().min(5, "Give a reason (at least 5 characters)").max(1000);

/* ── Claims ───────────────────────────────────────────────────────── */

/** Approval transfers ownership in one transaction and rejects competing pending claims. */
export const approveClaim = action({ schema: z.object({ id: z.uuid() }), roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  const claim = await db.query.claims.findFirst({
    where: eq(s.claims.id, id),
    with: { business: { columns: { id: true, name: true, ownerId: true } }, user: { columns: { id: true, name: true, email: true, role: true } } },
  });
  if (!claim) throw new ActionError("Claim not found.");
  if (claim.status !== "pending") throw new ActionError("This claim was already reviewed.");

  const competing = await tx(async (t) => {
    await t.update(s.claims).set({ status: "approved", reviewedBy: user.id, reviewedAt: new Date() }).where(eq(s.claims.id, id));
    await t.update(s.businesses).set({ ownerId: claim.userId, claimed: true }).where(eq(s.businesses.id, claim.businessId));
    const others = await t
      .update(s.claims)
      .set({ status: "rejected", rejectionReason: "Another ownership claim for this business was approved.", reviewedBy: user.id, reviewedAt: new Date() })
      .where(and(eq(s.claims.businessId, claim.businessId), eq(s.claims.status, "pending"), ne(s.claims.id, id)))
      .returning({ email: s.claims.email, name: s.claims.name });
    if (claim.user.role === "user") await t.update(s.users).set({ role: "owner" }).where(eq(s.users.id, claim.userId));
    await notify({ userId: claim.userId, type: "claim", title: `Your claim for ${claim.business.name} was approved`, link: "/dashboard/businesses" }, t);
    await audit({ actorId: user.id, action: "claim.approve", entityType: "claim", entityId: id, diff: { businessId: claim.businessId, previousOwner: claim.business.ownerId, newOwner: claim.userId }, ip }, t);
    return others;
  });

  await revalidateBusiness(claim.businessId, { immediate: true });
  after(async () => {
    await sendEmail({ to: claim.email, template: "claim-status", data: { name: claim.name, businessName: claim.business.name, status: "approved" } });
    for (const o of competing) {
      await sendEmail({ to: o.email, template: "claim-status", data: { name: o.name, businessName: claim.business.name, status: "rejected", reason: "Another ownership claim for this business was approved." } });
    }
  });
  return { ok: true, message: `Ownership of ${claim.business.name} transferred to ${claim.user.name}.` };
});

export const rejectClaim = action({ schema: z.object({ id: z.uuid(), reason }), roles: [...STAFF] }, async ({ id, reason }, { user, ip }) => {
  const claim = await db.query.claims.findFirst({ where: eq(s.claims.id, id), with: { business: { columns: { name: true } } } });
  if (!claim) throw new ActionError("Claim not found.");
  if (claim.status !== "pending") throw new ActionError("This claim was already reviewed.");
  await tx(async (t) => {
    await t.update(s.claims).set({ status: "rejected", rejectionReason: reason, reviewedBy: user.id, reviewedAt: new Date() }).where(eq(s.claims.id, id));
    await notify({ userId: claim.userId, type: "claim", title: `Your claim for ${claim.business.name} was rejected`, body: reason }, t);
    await audit({ actorId: user.id, action: "claim.reject", entityType: "claim", entityId: id, diff: { reason }, ip }, t);
  });
  after(() => sendEmail({ to: claim.email, template: "claim-status", data: { name: claim.name, businessName: claim.business.name, status: "rejected", reason } }));
  return { ok: true, message: "Claim rejected." };
});

/** Short-lived signed URL for a private claim/verification document. */
export const getDocumentUrl = action(
  { schema: z.object({ kind: z.enum(["claim", "verification"]), id: z.uuid() }), roles: [...STAFF] },
  async ({ kind, id }, { user, ip }) => {
    let key: string | null | undefined;
    if (kind === "claim") key = (await db.query.claimDocuments.findFirst({ where: eq(s.claimDocuments.id, id) }))?.key;
    else key = (await db.query.businessVerifications.findFirst({ where: eq(s.businessVerifications.id, id) }))?.documentKey;
    if (!key) throw new ActionError("Document not found.");
    await audit({ actorId: user.id, action: "document.view", entityType: kind, entityId: id, ip });
    return { ok: true, data: { url: await presignGet(privateBucket(), key, 300) } };
  },
);

/* ── Document verifications ──────────────────────────────────────── */

export const approveVerification = action({ schema: z.object({ id: z.uuid() }), roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  const v = await db.query.businessVerifications.findFirst({ where: eq(s.businessVerifications.id, id) });
  if (!v || v.status !== "pending") throw new ActionError("This verification was already reviewed.");
  const biz = await db.query.businesses.findFirst({ where: eq(s.businesses.id, v.businessId), columns: { name: true } });
  await tx(async (t) => {
    await t.update(s.businessVerifications).set({ status: "verified", verifiedAt: new Date() }).where(eq(s.businessVerifications.id, id));
    await t.update(s.businesses).set({ verificationStatus: "verified" }).where(eq(s.businesses.id, v.businessId));
    await notify({ userId: v.userId, type: "listing_status", title: `${biz?.name ?? "Your listing"} is now verified`, link: "/dashboard/businesses" }, t);
    await audit({ actorId: user.id, action: "verification.approve", entityType: "business", entityId: v.businessId, diff: { verificationId: id }, ip }, t);
  });
  await revalidateBusiness(v.businessId, { immediate: true });
  return { ok: true, message: "Business verified." };
});

export const rejectVerification = action({ schema: z.object({ id: z.uuid(), reason }), roles: [...STAFF] }, async ({ id, reason }, { user, ip }) => {
  const v = await db.query.businessVerifications.findFirst({ where: eq(s.businessVerifications.id, id) });
  if (!v || v.status !== "pending") throw new ActionError("This verification was already reviewed.");
  await tx(async (t) => {
    await t.update(s.businessVerifications).set({ status: "rejected", rejectionReason: reason }).where(eq(s.businessVerifications.id, id));
    await t.update(s.businesses).set({ verificationStatus: "unverified" }).where(and(eq(s.businesses.id, v.businessId), eq(s.businesses.verificationStatus, "pending")));
    await notify({ userId: v.userId, type: "listing_status", title: "Verification document rejected", body: reason, link: "/dashboard/businesses" }, t);
    await audit({ actorId: user.id, action: "verification.reject", entityType: "business", entityId: v.businessId, diff: { verificationId: id, reason }, ip }, t);
  });
  await revalidateBusiness(v.businessId, { immediate: true });
  return { ok: true, message: "Verification rejected." };
});

/* ── Reviews ──────────────────────────────────────────────────────── */

/** Hide / publish / spam / delete. Rating aggregates are recomputed in the same transaction. */
export const moderateReview = action(
  { schema: z.object({ id: z.uuid(), decision: z.enum(["hide", "publish", "spam", "delete", "dismiss"]) }), roles: [...STAFF] },
  async ({ id, decision }, { user, ip }) => {
    const review = await db.query.reviews.findFirst({ where: eq(s.reviews.id, id), columns: { id: true, businessId: true, status: true } });
    if (!review) throw new ActionError("Review not found.");
    await tx(async (t) => {
      if (decision === "delete") await t.update(s.reviews).set({ deletedAt: new Date() }).where(eq(s.reviews.id, id));
      else if (decision !== "dismiss") {
        const status = decision === "hide" ? "hidden" : decision === "spam" ? "spam" : "published";
        await t.update(s.reviews).set({ status }).where(eq(s.reviews.id, id));
      }
      await t
        .update(s.reviewReports)
        .set({ status: decision === "dismiss" || decision === "publish" ? "dismissed" : "resolved", resolvedAt: new Date() })
        .where(and(eq(s.reviewReports.reviewId, id), eq(s.reviewReports.status, "open")));
      await t.execute(sql`select refresh_business_rating(${review.businessId}::uuid)`);
      await audit({ actorId: user.id, action: `review.${decision}`, entityType: "review", entityId: id, diff: { from: review.status }, ip }, t);
    });
    updateTag(tags.reviews(review.businessId));
    await revalidateBusiness(review.businessId, { immediate: true });
    revalidateTag(tags.listings, "max");
    const labels = { hide: "Review hidden.", publish: "Review published.", spam: "Marked as spam.", delete: "Review deleted.", dismiss: "Reports dismissed." };
    return { ok: true, message: labels[decision] };
  },
);
