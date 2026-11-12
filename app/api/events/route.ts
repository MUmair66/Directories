import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

const body = z.object({
  businessId: z.uuid(),
  type: z.enum(["view", "call_click", "website_click", "directions_click"]),
});

/**
 * Lightweight event beacon (navigator.sendBeacon). Responds 204 immediately and
 * writes to event_log after the response, so it never affects page speed.
 */
export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof body>;
  try {
    parsed = body.parse(JSON.parse(await req.text()));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|preview|lighthouse/i.test(ua)) return new NextResponse(null, { status: 204 });
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";

  after(async () => {
    const { success } = await rateLimit("write", `ev:${ip}:${parsed.businessId}`);
    if (!success) return;
    try {
      await db.insert(s.eventLog).values({ businessId: parsed.businessId, type: parsed.type });
    } catch (e) {
      console.error("[events]", e);
    }
  });
  return new NextResponse(null, { status: 204 });
}
