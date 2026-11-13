import { NextResponse, type NextRequest } from "next/server";
import { mapMarkers, searchBusinesses, resolveLocation, type SearchInput } from "@/lib/search";
import { parseBBox } from "@/lib/geo";
import { parseSearchParams } from "@/lib/validations/search";
import { db, schema as s } from "@/lib/db";
import { and, eq } from "drizzle-orm";

/**
 * Map view data for the visible bounding box: up to 200 markers (clustered client-side)
 * plus the first 24 result cards inside the box.
 */
export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const bbox = parseBBox(raw.bbox);
  if (!bbox) return NextResponse.json({ error: "bbox=west,south,east,north is required" }, { status: 400 });

  const p = parseSearchParams(raw);
  const input: SearchInput = {
    q: p.q,
    minRating: p.rating,
    openNow: p.open_now,
    verified: p.verified,
    posted: p.posted,
    sort: p.sort,
    bbox,
    perPage: 24,
  };
  try {
    if (raw.categoryId) input.categoryId = raw.categoryId;
    else if (p.category) {
      const cat = await db.query.categories.findFirst({ where: eq(s.categories.slug, p.category), columns: { id: true } });
      input.categoryId = cat?.id;
    }
    if (p.state && !raw.ignoreLocation) {
      const st = await db.query.states.findFirst({ where: eq(s.states.slug, p.state), columns: { id: true } });
      input.stateId = st?.id;
      if (st && p.city) {
        const c = await db.query.cities.findFirst({ where: and(eq(s.cities.stateId, st.id), eq(s.cities.slug, p.city)), columns: { id: true } });
        input.cityId = c?.id;
      }
    }
    if (p.location && !raw.ignoreLocation) {
      const loc = await resolveLocation(p.location);
      if (loc?.zip) input.zip = loc.zip;
    }
    const [markers, { items, total }] = await Promise.all([mapMarkers({ ...input, bbox }), searchBusinesses(input)]);
    return NextResponse.json({ markers, items, total }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (e) {
    console.error("[map]", e);
    return NextResponse.json({ markers: [], items: [], total: 0 });
  }
}
