import { NextResponse, type NextRequest } from "next/server";
import { suggestWhat, suggestWhere } from "@/lib/search";

/** Autocomplete for the What and Where fields. Target: < 100ms (prefixes cached with "use cache" in lib/search.ts). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") === "where" ? "where" : "what";
  try {
    const items = type === "where" ? await suggestWhere(q) : await suggestWhat(q);
    return NextResponse.json(items, { headers: { "Cache-Control": "public, max-age=60, s-maxage=600" } });
  } catch (e) {
    console.error("[autocomplete]", e);
    return NextResponse.json([]);
  }
}
