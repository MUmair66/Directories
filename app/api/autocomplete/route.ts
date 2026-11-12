import { NextResponse, type NextRequest } from "next/server";
import { suggestWhat, suggestWhere } from "@/lib/search";
import { rateLimit } from "@/lib/ratelimit";

/** Autocomplete for the What and Where fields. Target: < 100ms (Redis-cached prefixes). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") === "where" ? "where" : "what";
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  const { success } = await rateLimit("write", `ac:${ip}`);
  if (!success) return NextResponse.json([], { status: 429 });
  try {
    const items = type === "where" ? await suggestWhere(q) : await suggestWhat(q);
    return NextResponse.json(items, { headers: { "Cache-Control": "public, max-age=60, s-maxage=600" } });
  } catch (e) {
    console.error("[autocomplete]", e);
    return NextResponse.json([]);
  }
}
