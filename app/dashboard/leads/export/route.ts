import Papa from "papaparse";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getLeads } from "@/lib/data/dashboard";

/** CSV export of the signed-in owner's leads (respects the same filters as the Leads page). */
export async function GET(req: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const p = new URL(req.url).searchParams;
  const businessId = p.get("businessId") ?? undefined;
  const leads = await getLeads(session.user.id, {
    businessId: businessId && /^[0-9a-f-]{36}$/i.test(businessId) ? businessId : undefined,
    status: p.get("status") ?? undefined,
    source: p.get("source") ?? undefined,
    q: p.get("q")?.slice(0, 80) ?? undefined,
  });
  // Prefix cells that start with formula characters to prevent CSV injection in spreadsheets.
  const safe = (v: string | null) => (v && /^[=+\-@\t\r]/.test(v) ? `'${v}` : (v ?? ""));
  const csv = Papa.unparse(
    leads.map((l) => ({
      Date: new Date(l.createdAt).toISOString(),
      Business: safe(l.businessName),
      Name: safe(l.name),
      Email: safe(l.email),
      Phone: safe(l.phone),
      Message: safe(l.message),
      Source: l.source,
      Status: l.status,
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
