import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiError, authenticate } from "@/lib/api-auth";

/** GET /api/v1/leads?status=new&business_id=…&since=ISO&page=1&per_page=50 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  const p = req.nextUrl.searchParams;
  const status = p.get("status");
  if (status && !["new", "contacted", "closed"].includes(status)) return apiError(422, "Validation failed", [{ field: "status", message: "Use new, contacted or closed" }]);
  const businessId = p.get("business_id");
  if (businessId && !/^[0-9a-f-]{36}$/i.test(businessId)) return apiError(422, "Validation failed", [{ field: "business_id", message: "Invalid id" }]);
  const since = p.get("since");
  if (since && Number.isNaN(Date.parse(since))) return apiError(422, "Validation failed", [{ field: "since", message: "Use an ISO 8601 date" }]);
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(p.get("per_page") ?? 50) || 50));

  const r = await db.execute(sql`
    select l.id, l.business_id as "businessId", b.name as "businessName", l.source, l.status, l.name, l.email, l.phone, l.message, l.created_at as "createdAt"
    from leads l join businesses b on b.id = l.business_id
    where b.owner_id = ${auth.user.id}
      ${status ? sql`and l.status = ${status}::lead_status` : sql``}
      ${businessId ? sql`and l.business_id = ${businessId}::uuid` : sql``}
      ${since ? sql`and l.created_at >= ${since}::timestamptz` : sql``}
    order by l.created_at desc limit ${perPage} offset ${(page - 1) * perPage}`);
  return NextResponse.json({ data: r.rows, page, perPage });
}
