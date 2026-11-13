import { NextResponse, type NextRequest } from "next/server";
import { resolveFilters } from "@/lib/data/listing";
import { getCategory, getCity, getState } from "@/lib/data/public";
import { searchBusinesses } from "@/lib/search";
import { parseSearchParams } from "@/lib/validations/search";
import { PAGE_SIZE } from "@/lib/site";

/** JSON page of listing cards for the mobile "Load more" button. */
export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const p = parseSearchParams(raw);
  try {
    const scopeCategory = raw.scopeCategory ? await getCategory(raw.scopeCategory) : null;
    const scopeState = raw.scopeState ? await getState(raw.scopeState) : null;
    const scopeCity = scopeState && raw.scopeCity ? (await getCity(scopeState.slug, raw.scopeCity))?.city : null;
    const { input } = await resolveFilters(
      { category: scopeCategory ?? undefined, state: scopeState ?? undefined, city: scopeCity ?? undefined },
      p,
      PAGE_SIZE,
    );
    const { items, total } = await searchBusinesses(input);
    return NextResponse.json({ items, total });
  } catch (e) {
    console.error("[listings]", e);
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}
