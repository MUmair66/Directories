import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, connection } from "next/server";

/**
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Returns a 401 response when it doesn't match.
 * Also opts the handler into request-time rendering (never prerendered at build).
 */
export async function cronGuard(req: Request): Promise<NextResponse | null> {
  await connection();
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = !!secret && header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  return ok ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
