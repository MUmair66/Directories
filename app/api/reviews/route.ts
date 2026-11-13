import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getReviews } from "@/lib/data/public";

const q = z.object({
  businessId: z.uuid(),
  sort: z.enum(["newest", "highest", "lowest"]).default("newest"),
  offset: z.coerce.number().int().min(0).max(5000).default(0),
});

/** Paged, sorted reviews for the profile page (sort switch and "Show more"). */
export async function GET(req: NextRequest) {
  const parsed = q.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const { businessId, sort, offset } = parsed.data;
  const reviews = await getReviews(businessId, sort, 10, offset);
  return NextResponse.json(reviews);
}
