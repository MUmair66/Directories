import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cronGuard } from "@/lib/cron";

export const maxDuration = 300;

/**
 * Nightly cleanup:
 * - purge businesses soft-deleted more than 30 days ago (end of the restore window; cascades to children),
 * - delete abandoned drafts not touched in 90 days,
 * - expire pending SMS/email verification codes past their expiry,
 * - drop landing pages and reviews soft-deleted more than 30 days ago.
 */
export async function GET(req: Request) {
  const denied = await cronGuard(req);
  if (denied) return denied;

  const [deleted, drafts, verifications, landing, reviews] = await Promise.all([
    db.execute(sql`delete from businesses where deleted_at is not null and deleted_at < now() - interval '30 days'`),
    db.execute(sql`delete from businesses where status = 'draft' and deleted_at is null and updated_at < now() - interval '90 days'`),
    db.execute(sql`update business_verifications set status = 'expired'
      where status = 'pending' and method <> 'document' and expires_at is not null and expires_at < now()`),
    db.execute(sql`delete from landing_pages where deleted_at is not null and deleted_at < now() - interval '30 days'`),
    db.execute(sql`delete from reviews where deleted_at is not null and deleted_at < now() - interval '30 days'`),
  ]);

  return NextResponse.json({
    ok: true,
    purgedDeleted: deleted.rowCount ?? null,
    purgedDrafts: drafts.rowCount ?? null,
    expiredVerifications: verifications.rowCount ?? null,
    purgedLandingPages: landing.rowCount ?? null,
    purgedReviews: reviews.rowCount ?? null,
  });
}
