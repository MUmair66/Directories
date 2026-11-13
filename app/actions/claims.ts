"use server";
import { after } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { action, ActionError } from "@/lib/action";
import { db, schema as s, tx } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { claimSchema } from "@/lib/validations/forms";

/** Creates a Claim in the admin queue. Admin approval transfers ownership (app/actions/admin). */
export const submitClaim = action({ schema: claimSchema, rateLimit: "claim", turnstile: true }, async (input, { user }) => {
  const biz = await db.query.businesses.findFirst({
    where: and(eq(s.businesses.id, input.businessId), isNull(s.businesses.deletedAt)),
    columns: { id: true, name: true, claimed: true, ownerId: true },
  });
  if (!biz) throw new ActionError("Business not found.");
  if (biz.claimed || biz.ownerId === user.id) throw new ActionError("This business has already been claimed. Contact support if you believe this is a mistake.");

  const pending = await db.query.claims.findFirst({
    where: and(eq(s.claims.businessId, biz.id), eq(s.claims.userId, user.id), eq(s.claims.status, "pending")),
    columns: { id: true },
  });
  if (pending) throw new ActionError("You already have a pending claim for this business. We'll email you when it's reviewed.");

  // Only accept documents this user uploaded (keys are prefixed with the uploader's id).
  const prefix = `claim/${user.id}/`;
  if (input.documents.some((d) => !d.key.startsWith(prefix))) throw new ActionError("One of the uploaded files is invalid. Please upload it again.");

  await tx(async (t) => {
    const [claim] = await t
      .insert(s.claims)
      .values({ businessId: biz.id, userId: user.id, name: input.name, email: input.email, phone: input.phone, details: input.details || null })
      .returning({ id: s.claims.id });
    await t.insert(s.claimDocuments).values(input.documents.map((d) => ({ claimId: claim!.id, key: d.key, fileName: d.fileName, contentType: d.contentType, size: d.size })));
  });

  after(() => sendEmail({ to: input.email, template: "claim-status", data: { name: input.name, businessName: biz.name, status: "received and pending review" } }));
  return { ok: true, message: "Claim submitted. We'll review your documents within 1 to 2 business days." };
});
