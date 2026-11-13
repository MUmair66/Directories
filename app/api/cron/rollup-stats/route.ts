import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cronGuard } from "@/lib/cron";

export const maxDuration = 300;

/**
 * Nightly: roll raw event_log rows for yesterday and today (UTC) into business_stats_daily
 * (idempotent upsert, so re-runs recompute the same totals), then delete raw events older than 90 days.
 * Dashboard charts read business_stats_daily only.
 */
export async function GET(req: Request) {
  const denied = await cronGuard(req);
  if (denied) return denied;

  const upsert = await db.execute(sql`
    insert into business_stats_daily (business_id, date, views, calls, website_clicks, directions, messages)
    select business_id, (created_at at time zone 'UTC')::date as day,
      count(*) filter (where type = 'view')::int,
      count(*) filter (where type = 'call_click')::int,
      count(*) filter (where type = 'website_click')::int,
      count(*) filter (where type = 'directions_click')::int,
      count(*) filter (where type = 'message')::int
    from event_log
    where created_at >= (date_trunc('day', now() at time zone 'UTC') - interval '1 day') at time zone 'UTC'
    group by business_id, day
    on conflict (business_id, date) do update set
      views = excluded.views,
      calls = excluded.calls,
      website_clicks = excluded.website_clicks,
      directions = excluded.directions,
      messages = excluded.messages`);

  const purged = await db.execute(sql`delete from event_log where created_at < now() - interval '90 days'`);

  return NextResponse.json({ ok: true, upserted: upsert.rowCount ?? null, purged: purged.rowCount ?? null });
}
