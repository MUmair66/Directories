"use server";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { db, schema as s } from "@/lib/db";
import { loadEditable } from "@/lib/businesses";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { revalidateBusiness } from "@/lib/revalidate";
import { uploadedDocSchema } from "@/lib/validations/forms";
import { BRAND_NAME } from "@/lib/site";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

function mask(method: "sms" | "email", value: string) {
  if (method === "sms") return `•••-•••-${value.replace(/\D/g, "").slice(-4)}`;
  const [u, d] = value.split("@");
  return `${u!.slice(0, 2)}•••@${d}`;
}

/** Sends a 6-digit code by SMS (listing phone) or email (listing email). Code is stored hashed. */
export const startVerification = action(
  { schema: z.object({ businessId: z.uuid(), method: z.enum(["sms", "email"]) }), rateLimit: "verify" },
  async ({ businessId, method }, { user }) => {
    const b = await loadEditable(businessId, user);
    if (b.verificationStatus === "verified") throw new ActionError("This business is already verified.");
    const target = method === "sms" ? b.phone : b.email;
    if (!target) throw new ActionError(method === "sms" ? "Add a phone number to the listing first." : "Add an email address to the listing first.");

    const last = await db.query.businessVerifications.findFirst({
      where: and(eq(s.businessVerifications.businessId, b.id), eq(s.businessVerifications.method, method), eq(s.businessVerifications.status, "pending")),
      orderBy: desc(s.businessVerifications.createdAt),
    });
    if (last?.lastSentAt && Date.now() - last.lastSentAt.getTime() < RESEND_AFTER_MS) {
      const wait = Math.ceil((RESEND_AFTER_MS - (Date.now() - last.lastSentAt.getTime())) / 1000);
      throw new ActionError(`Please wait ${wait}s before requesting a new code.`);
    }
    // Any previous pending code is superseded.
    await db.update(s.businessVerifications).set({ status: "expired" }).where(and(eq(s.businessVerifications.businessId, b.id), eq(s.businessVerifications.status, "pending")));

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const [row] = await db
      .insert(s.businessVerifications)
      .values({ businessId: b.id, userId: user.id, method, codeHash: hash(code), expiresAt: new Date(Date.now() + CODE_TTL_MS), lastSentAt: new Date() })
      .returning({ id: s.businessVerifications.id });

    if (method === "sms") {
      const res = await sendSms(target, `${BRAND_NAME}: your verification code for ${b.name} is ${code}. It expires in 10 minutes.`);
      if (!res.ok) throw new ActionError("We couldn't send the SMS. Check the phone number or choose email.");
    } else {
      await sendEmail({ to: target, template: "verification-code", data: { code, businessName: b.name } });
    }
    return { ok: true, message: `Code sent to ${mask(method, target)}`, data: { verificationId: row!.id, sentTo: mask(method, target), resendIn: RESEND_AFTER_MS / 1000 } };
  },
);

export const confirmVerification = action(
  { schema: z.object({ verificationId: z.uuid(), code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }), rateLimit: "verify" },
  async ({ verificationId, code }, { user }) => {
    const v = await db.query.businessVerifications.findFirst({ where: eq(s.businessVerifications.id, verificationId) });
    if (!v || v.userId !== user.id) throw new ActionError("Verification not found. Request a new code.");
    if (v.status !== "pending") throw new ActionError("This code is no longer valid. Request a new code.");
    if (!v.expiresAt || v.expiresAt.getTime() < Date.now()) {
      await db.update(s.businessVerifications).set({ status: "expired" }).where(eq(s.businessVerifications.id, v.id));
      throw new ActionError("This code expired. Request a new code.");
    }
    if (v.attempts >= MAX_ATTEMPTS) {
      await db.update(s.businessVerifications).set({ status: "failed" }).where(eq(s.businessVerifications.id, v.id));
      throw new ActionError("Too many attempts. Request a new code.");
    }
    const ok = timingSafeEqual(Buffer.from(hash(code)), Buffer.from(v.codeHash ?? ""));
    if (!ok) {
      const attempts = v.attempts + 1;
      await db.update(s.businessVerifications).set({ attempts, status: attempts >= MAX_ATTEMPTS ? "failed" : "pending" }).where(eq(s.businessVerifications.id, v.id));
      const left = MAX_ATTEMPTS - attempts;
      throw new ActionError(left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many attempts. Request a new code.", { code: "Incorrect code" });
    }
    await db.update(s.businessVerifications).set({ status: "verified", verifiedAt: new Date() }).where(eq(s.businessVerifications.id, v.id));
    await db.update(s.businesses).set({ verificationStatus: "verified" }).where(eq(s.businesses.id, v.businessId));
    await audit({ actorId: user.id, action: `business.verify.${v.method}`, entityType: "business", entityId: v.businessId });
    await revalidateBusiness(v.businessId, { immediate: true });
    return { ok: true, message: "Your business is verified!" };
  },
);

/** Document-based verification goes to the admin Verifications queue. */
export const submitVerificationDocument = action(
  { schema: z.object({ businessId: z.uuid(), document: uploadedDocSchema }), rateLimit: "verify" },
  async ({ businessId, document }, { user }) => {
    const b = await loadEditable(businessId, user);
    if (!document.key.startsWith(`verification/${user.id}/`)) throw new ActionError("Invalid upload.");
    await db.update(s.businessVerifications).set({ status: "expired" }).where(and(eq(s.businessVerifications.businessId, b.id), eq(s.businessVerifications.status, "pending")));
    await db.insert(s.businessVerifications).values({ businessId: b.id, userId: user.id, method: "document", documentKey: document.key, documentName: document.fileName });
    await db.update(s.businesses).set({ verificationStatus: "pending" }).where(eq(s.businesses.id, b.id));
    await audit({ actorId: user.id, action: "business.verify.document_submitted", entityType: "business", entityId: b.id });
    await revalidateBusiness(b.id, { immediate: true });
    return { ok: true, message: "Document submitted. Our team will review it within 2 business days." };
  },
);
