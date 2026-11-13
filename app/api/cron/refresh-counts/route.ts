import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { cronGuard } from "@/lib/cron";

export const maxDuration = 300;

/** Every 15 minutes: refresh listing counts without blocking readers, and prune expired rate-limit counters. */
export async function GET(req: Request) {
  const denied = await cronGuard(req);
  if (denied) return denied;
  const started = performance.now();
  await db.execute(sql`refresh materialized view concurrently listing_counts`);
  revalidateTag(tags.counts, "max");
  // Counters older than a day are past every window (longest is 1 hour).
  await db.execute(sql`delete from rate_limits where last_request < ${Date.now() - 86_400_000}`);
  return NextResponse.json({ ok: true, ms: Math.round(performance.now() - started) });
}
