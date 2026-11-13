"use server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { db, schema as s } from "@/lib/db";
import { generateKey } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { processUploadedImage } from "@/lib/images";
import { profileSchema } from "@/lib/validations/business";

/** Creates a new key and revokes any previous one. The full key is returned once and never stored. */
export const generateApiKey = action({ schema: z.object({}), rateLimit: "write" }, async (_i, { user }) => {
  const { key, hash, last4 } = generateKey();
  await db.update(s.apiKeys).set({ revokedAt: new Date() }).where(and(eq(s.apiKeys.userId, user.id), isNull(s.apiKeys.revokedAt)));
  await db.insert(s.apiKeys).values({ userId: user.id, keyHash: hash, last4 });
  await audit({ actorId: user.id, action: "api_key.generate", entityType: "user", entityId: user.id });
  return { ok: true, message: "API key created. Copy it now; it won't be shown again.", data: { key } };
});

export const revokeApiKey = action({ schema: z.object({}), rateLimit: "write" }, async (_i, { user }) => {
  await db.update(s.apiKeys).set({ revokedAt: new Date() }).where(and(eq(s.apiKeys.userId, user.id), isNull(s.apiKeys.revokedAt)));
  await audit({ actorId: user.id, action: "api_key.revoke", entityType: "user", entityId: user.id });
  return { ok: true, message: "API key revoked" };
});

export const checkUsername = action({ schema: z.object({ username: z.string().trim().max(30) }), rateLimit: "write" }, async ({ username }, { user }) => {
  if (username.length < 3) return { ok: true, data: { available: false } };
  const rows = await db.select({ id: s.users.id }).from(s.users).where(and(eq(s.users.username, username.toLowerCase()), ne(s.users.id, user.id))).limit(1);
  return { ok: true, data: { available: rows.length === 0 } };
});

export const updateProfile = action({ schema: profileSchema, rateLimit: "write" }, async (input, { user }) => {
  const username = input.username.toLowerCase();
  const taken = await db.select({ id: s.users.id }).from(s.users).where(and(eq(s.users.username, username), ne(s.users.id, user.id))).limit(1);
  if (taken.length) throw new ActionError("That username is taken.", { username: "That username is taken" });
  await db
    .update(s.users)
    .set({
      firstName: input.firstName,
      lastName: input.lastName,
      name: `${input.firstName} ${input.lastName}`.trim(),
      gender: input.gender || null,
      username,
      displayUsername: input.username,
      email2: input.email2 || null,
      phone: input.phone,
      country: input.country,
      state: input.state || null,
      city: input.city || null,
      address: input.address || null,
      zip: input.zip || null,
      updatedAt: new Date(),
    })
    .where(eq(s.users.id, user.id));
  return { ok: true, message: "Profile saved" };
});

export const setProfilePhoto = action({ schema: z.object({ key: z.string().min(5) }), rateLimit: "upload" }, async ({ key }, { user }) => {
  if (!key.startsWith(`avatar/${user.id}/`)) throw new ActionError("Invalid upload.");
  const img = await processUploadedImage(key, { crop: 1 });
  await db.update(s.users).set({ photoUrl: img.variants.sm, image: img.variants.sm }).where(eq(s.users.id, user.id));
  return { ok: true, message: "Photo updated", data: { url: img.variants.sm } };
});
