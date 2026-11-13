"use server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { getAuth } from "@/lib/auth";
import { db, schema as s } from "@/lib/db";
import { ASSIGNABLE_ROLES } from "./schemas";

const ADMIN = ["admin"] as const;

/** Narrow view of the Better Auth admin plugin endpoints we call (independent of plugin type inference). */
type AdminApi = {
  banUser(opts: { body: { userId: string; banReason?: string; banExpiresIn?: number }; headers: Headers }): Promise<unknown>;
  unbanUser(opts: { body: { userId: string }; headers: Headers }): Promise<unknown>;
  impersonateUser(opts: { body: { userId: string }; headers: Headers }): Promise<unknown>;
};
const adminApi = () => getAuth().api as unknown as AdminApi;
const userId = z.string().min(1).max(64);

/**
 * Roles are written directly: the Better Auth admin plugin only knows "admin" and "user",
 * while the app uses admin | editor | owner | user (admin plugin checks role === "admin").
 */
export const setUserRole = action({ schema: z.object({ userId, role: z.enum(ASSIGNABLE_ROLES) }), roles: [...ADMIN] }, async ({ userId, role }, { user, ip }) => {
  const target = await db.query.users.findFirst({ where: eq(s.users.id, userId), columns: { role: true } });
  if (!target) throw new ActionError("User not found.");
  // Admin accounts are managed in the database only: they can't be granted, changed or removed here.
  if (userId === user.id || target.role === "admin") throw new ActionError("Admin accounts can't be changed from the admin panel.");
  await db.update(s.users).set({ role, updatedAt: new Date() }).where(eq(s.users.id, userId));
  await audit({ actorId: user.id, action: "user.set_role", entityType: "user", entityId: userId, diff: { from: target.role, to: role }, ip });
  return { ok: true, message: `Role changed to ${role}.` };
});

export const banUser = action(
  { schema: z.object({ userId, reason: z.string().trim().min(3, "Give a reason").max(500), days: z.number().int().min(0).max(3650).optional() }), roles: [...ADMIN] },
  async ({ userId, reason, days }, { user, ip }) => {
    if (userId === user.id) throw new ActionError("You can't ban yourself.");
    await adminApi().banUser({ body: { userId, banReason: reason, banExpiresIn: days ? days * 86400 : undefined }, headers: await headers() });
    await audit({ actorId: user.id, action: "user.ban", entityType: "user", entityId: userId, diff: { reason, days: days ?? null }, ip });
    return { ok: true, message: "User banned and signed out." };
  },
);

export const unbanUser = action({ schema: z.object({ userId }), roles: [...ADMIN] }, async ({ userId }, { user, ip }) => {
  await adminApi().unbanUser({ body: { userId }, headers: await headers() });
  await audit({ actorId: user.id, action: "user.unban", entityType: "user", entityId: userId, ip });
  return { ok: true, message: "User unbanned." };
});

/** Starts an impersonation session (Better Auth admin plugin); the client then navigates to /dashboard. */
export const impersonateUser = action({ schema: z.object({ userId }), roles: [...ADMIN] }, async ({ userId }, { user, ip }) => {
  if (userId === user.id) throw new ActionError("You're already signed in as this user.");
  await audit({ actorId: user.id, action: "user.impersonate", entityType: "user", entityId: userId, ip });
  await adminApi().impersonateUser({ body: { userId }, headers: await headers() });
  return { ok: true, message: "Now viewing as this user. Log out to end impersonation." };
});
