import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { ActionError } from "@/lib/action";

export const API_KEY_PREFIX = "lfk_";

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateKey() {
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { key, hash: hashKey(key), last4: key.slice(-4) };
}

export type ApiUser = { id: string; role: string | null; keyId: string };

export function apiError(status: number, message: string, errors?: { field: string; message: string }[]) {
  return NextResponse.json({ error: { message, ...(errors ? { fields: errors } : {}) } }, { status });
}

export function zodErrors(error: z.ZodError) {
  return error.issues.map((i) => ({ field: i.path.join(".") || "body", message: i.message }));
}

/**
 * Bearer API key auth for /api/v1. Looks up the SHA-256 hash, rejects revoked keys and
 * banned users, applies 60 requests/minute per key, and records usage.
 */
export async function authenticate(req: Request): Promise<{ user: ApiUser } | { response: NextResponse }> {
  const header = req.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key.startsWith(API_KEY_PREFIX)) return { response: apiError(401, "Missing or invalid API key. Send Authorization: Bearer <key>.") };

  const rows = await db
    .select({ id: s.apiKeys.id, userId: s.apiKeys.userId, role: s.users.role, banned: s.users.banned })
    .from(s.apiKeys)
    .innerJoin(s.users, eq(s.users.id, s.apiKeys.userId))
    .where(and(eq(s.apiKeys.keyHash, hashKey(key)), isNull(s.apiKeys.revokedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return { response: apiError(401, "Invalid or revoked API key.") };
  if (row.banned) return { response: apiError(403, "Account suspended.") };

  const rl = await rateLimit("api", row.id);
  if (!rl.success) {
    const res = apiError(429, "Rate limit exceeded: 60 requests per minute.");
    if (rl.reset) res.headers.set("Retry-After", String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))));
    return { response: res };
  }
  await db.execute(sql`update api_keys set last_used_at = now(), request_count = request_count + 1 where id = ${row.id}`);
  return { user: { id: row.userId, role: row.role, keyId: row.id } };
}

/** Converts thrown errors into JSON responses. */
export function handleApiError(e: unknown) {
  if (e instanceof ActionError) {
    const fields = e.fieldErrors ? Object.entries(e.fieldErrors).map(([field, message]) => ({ field, message })) : undefined;
    return apiError(e.message.includes("not found") ? 404 : 422, e.message, fields);
  }
  if (e && typeof e === "object" && "issues" in e) return apiError(422, "Validation failed", zodErrors(e as z.ZodError));
  console.error("[api/v1]", e);
  return apiError(500, "Internal error");
}
