import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, authenticate, handleApiError, zodErrors } from "@/lib/api-auth";
import { apiBusinessUpdateSchema, detailsSchema } from "@/lib/validations/business";
import * as biz from "@/lib/businesses";
import { db, schema as s } from "@/lib/db";
import { eq } from "drizzle-orm";
import { loadApiBusiness, toJson } from "../../_serialize";

const idSchema = z.uuid();

export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/businesses/[id]">) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return apiError(404, "Business not found");
  const b = await loadApiBusiness(id, auth.user.id);
  if (!b) return apiError(404, "Business not found");
  return NextResponse.json({ data: toJson(b) });
}

/** PUT: update any subset of sections (details, location, hours, videoUrl, seo). */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/v1/businesses/[id]">) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const existing = idSchema.safeParse(id).success ? await loadApiBusiness(id, auth.user.id) : null;
  if (!existing) return apiError(404, "Business not found");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Body must be valid JSON");
  }
  const parsed = apiBusinessUpdateSchema.safeParse(body);
  if (!parsed.success) return apiError(422, "Validation failed", zodErrors(parsed.error));
  const input = parsed.data;
  const actor = { id: auth.user.id, role: auth.user.role };
  const opts = { immediate: false };
  try {
    if (input.details) {
      const current = {
        name: existing.name,
        categoryIds: existing.categories.map((c) => c.category.id),
        slug: existing.slug,
        description: existing.description ?? "",
        email: existing.email ?? "",
        website: existing.website ?? "",
        phone: existing.phone ?? "",
        phone2: existing.phone2 ?? "",
      };
      const merged = detailsSchema.safeParse({ ...current, ...input.details });
      if (!merged.success) return apiError(422, "Validation failed", zodErrors(merged.error).map((e) => ({ ...e, field: `details.${e.field}` })));
      await biz.saveSection(actor, id, "details", merged.data, opts);
    }
    if (input.location) await biz.saveSection(actor, id, "location", input.location, opts);
    if (input.hours) await biz.saveSection(actor, id, "hours", { hours: input.hours }, opts);
    if (input.videoUrl !== undefined) await biz.saveSection(actor, id, "media", { videoUrl: input.videoUrl }, opts);
    if (input.seo) await biz.saveSection(actor, id, "seo", input.seo, opts);
    const b = await loadApiBusiness(id, auth.user.id);
    return NextResponse.json({ data: b ? toJson(b) : null });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/v1/businesses/[id]">) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return apiError(404, "Business not found");
  const b = await db.query.businesses.findFirst({ where: eq(s.businesses.id, id), columns: { ownerId: true, deletedAt: true } });
  if (!b || b.ownerId !== auth.user.id || b.deletedAt) return apiError(404, "Business not found");
  try {
    await biz.softDelete({ id: auth.user.id, role: auth.user.role }, id, { immediate: false });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e);
  }
}
