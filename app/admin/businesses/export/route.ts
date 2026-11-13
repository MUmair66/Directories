import { NextResponse, type NextRequest } from "next/server";
import Papa from "papaparse";
import { sql, type SQL } from "drizzle-orm";
import { getAuth, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BUSINESS_STATUSES } from "@/lib/data/admin";

const CHUNK = 5000;

/** Streams all matching businesses as CSV (staff only), in keyset-paginated chunks. */
export async function GET(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session || !hasRole(session.user as { role?: string | null }, "admin", "editor")) return new NextResponse("Forbidden", { status: 403 });

  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q")?.slice(0, 100);
  const where: SQL[] = [sql`b.deleted_at is null`];
  if (status && (BUSINESS_STATUSES as readonly string[]).includes(status)) where.push(sql`b.status = ${status}`);
  if (q) where.push(sql`(b.name ilike ${`%${q}%`} or b.slug ilike ${`%${q}%`})`);

  await audit({ actorId: session.user.id, action: "business.export", entityType: "business", diff: { status, q }, ip: req.headers.get("x-real-ip") ?? undefined });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastId: string | null = null;
      let first = true;
      try {
        for (;;) {
          const r = await db.execute(sql`
            select b.id, b.name, b.slug, b.status, b.verification_status, b.featured, b.claimed,
              left(regexp_replace(coalesce(b.description, ''), '<[^>]*>', ' ', 'g'), 2000) as description,
              b.email, b.website, b.phone, b.phone2, b.address, b.city_name as city, st.code as state, b.zip, b.lat, b.lng,
              coalesce((select string_agg(c.slug, '|') from business_categories bc join categories c on c.id = bc.category_id where bc.business_id = b.id), '') as categories,
              b.avg_rating, b.review_count, u.email as owner_email, b.created_at
            from businesses b
            left join states st on st.id = b.state_id
            left join users u on u.id = b.owner_id
            where ${sql.join(where, sql` and `)} ${lastId ? sql`and b.id > ${lastId}` : sql``}
            order by b.id limit ${CHUNK}`);
          const rows = r.rows as Record<string, unknown>[];
          if (!rows.length) break;
          controller.enqueue(encoder.encode(Papa.unparse(rows, { header: first }) + "\r\n"));
          first = false;
          lastId = rows[rows.length - 1]!.id as string;
          if (rows.length < CHUNK) break;
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="businesses${status ? `-${status}` : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
