import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { db, schema as s } from "@/lib/db";
import { presignGet, privateBucket } from "@/lib/r2";

/** Redirects the ticket owner (or staff) to a short-lived signed URL for a private attachment. */
export async function GET(_req: Request, ctx: RouteContext<"/dashboard/tickets/attachments/[id]">) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const rows = await db
    .select({ key: s.ticketAttachments.key, userId: s.supportTickets.userId })
    .from(s.ticketAttachments)
    .innerJoin(s.ticketMessages, eq(s.ticketMessages.id, s.ticketAttachments.messageId))
    .innerJoin(s.supportTickets, eq(s.supportTickets.id, s.ticketMessages.ticketId))
    .where(eq(s.ticketAttachments.id, id))
    .limit(1);
  const row = rows[0];
  const role = (session.user as { role?: string }).role;
  if (!row || (row.userId !== session.user.id && role !== "admin" && role !== "editor")) return new NextResponse("Not found", { status: 404 });
  const url = await presignGet(privateBucket(), row.key, 300);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}
