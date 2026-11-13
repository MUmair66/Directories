import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

type Bucket = "review" | "message" | "claim" | "contact" | "auth" | "api" | "verify" | "upload" | "ticket" | "write";

/** [max requests, window in seconds] per bucket. */
const LIMITS: Record<Bucket, [number, number]> = {
  review: [5, 3600],
  message: [10, 3600],
  claim: [5, 3600],
  contact: [5, 3600],
  auth: [10, 60],
  api: [60, 60],
  verify: [10, 3600],
  upload: [60, 3600],
  ticket: [20, 3600],
  write: [120, 60],
};

/**
 * Fixed-window rate limit stored in Neon (rate_limits table, shared with Better Auth).
 * One atomic upsert per check: starts a new window when the old one expired, otherwise increments.
 * Fails open (allows the request) if the database is unreachable, so a counter never blocks users.
 */
export async function rateLimit(bucket: Bucket, identifier: string) {
  const [max, windowSec] = LIMITS[bucket];
  const key = `app:${bucket}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  try {
    const r = await db.execute(sql`
      insert into rate_limits (id, key, count, last_request)
      values (${key}, ${key}, 1, ${now})
      on conflict (key) do update set
        count = case when rate_limits.last_request < ${windowStart} then 1 else rate_limits.count + 1 end,
        last_request = case when rate_limits.last_request < ${windowStart} then ${now} else rate_limits.last_request end
      returning count, last_request`);
    const row = r.rows[0] as { count: number; last_request: string | number };
    const count = Number(row.count);
    return { success: count <= max, remaining: Math.max(0, max - count), reset: Number(row.last_request) + windowSec * 1000 };
  } catch (e) {
    console.error("[ratelimit] check failed, allowing request", e);
    return { success: true, remaining: max, reset: now };
  }
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
