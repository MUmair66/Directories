import { NextResponse, type NextRequest } from "next/server";
import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { authenticate } from "@/lib/api-auth";

/** GET /api/v1/categories: full taxonomy (parents with children). */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  const cats = await db.select({ id: s.categories.id, name: s.categories.name, slug: s.categories.slug, parentId: s.categories.parentId }).from(s.categories).orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
  const data = cats
    .filter((c) => !c.parentId)
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, children: cats.filter((c) => c.parentId === p.id).map(({ parentId: _p, ...c }) => c) }));
  return NextResponse.json({ data });
}
