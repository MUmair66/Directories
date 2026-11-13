import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { apiError, authenticate, handleApiError, zodErrors } from "@/lib/api-auth";
import { apiBusinessSchema } from "@/lib/validations/business";
import * as biz from "@/lib/businesses";
import { loadApiBusiness, toJson } from "../_serialize";

/** GET /api/v1/businesses: the key owner's listings. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("per_page") ?? 25) || 25));
  const rows = await db
    .select({ id: s.businesses.id, name: s.businesses.name, slug: s.businesses.slug, status: s.businesses.status, verificationStatus: s.businesses.verificationStatus, updatedAt: s.businesses.updatedAt })
    .from(s.businesses)
    .where(and(eq(s.businesses.ownerId, auth.user.id), isNull(s.businesses.deletedAt)))
    .orderBy(desc(s.businesses.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);
  return NextResponse.json({ data: rows, page, perPage });
}

/** POST /api/v1/businesses: create a listing (draft, or submitted for review with "submit": true). */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Body must be valid JSON");
  }
  const parsed = apiBusinessSchema.safeParse(body);
  if (!parsed.success) return apiError(422, "Validation failed", zodErrors(parsed.error));
  const input = parsed.data;
  try {
    const actor = { id: auth.user.id, role: auth.user.role };
    const id = await biz.createDraft(actor, input.details);
    const opts = { immediate: false };
    await biz.saveSection(actor, id, "location", input.location, opts);
    if (input.hours) await biz.saveSection(actor, id, "hours", { hours: input.hours }, opts);
    if (input.videoUrl) await biz.saveSection(actor, id, "media", { videoUrl: input.videoUrl }, opts);
    if (input.seo) await biz.saveSection(actor, id, "seo", input.seo, opts);
    if (input.submit) await biz.submitForReview(actor, id, opts);
    const full = await loadApiBusiness(id, auth.user.id);
    return NextResponse.json({ data: full ? toJson(full) : { id } }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
