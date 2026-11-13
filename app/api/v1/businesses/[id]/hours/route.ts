import { NextResponse, type NextRequest } from "next/server";
import { apiError, authenticate, handleApiError, zodErrors } from "@/lib/api-auth";
import { hoursSchema } from "@/lib/validations/business";
import * as biz from "@/lib/businesses";
import { loadApiBusiness, toJson } from "../../../_serialize";

/** PUT /api/v1/businesses/{id}/hours  body: { "hours": [{ "day": 0, "openTime": "09:00", "closeTime": "17:00" }, …] } */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/v1/businesses/[id]/hours">) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const existing = await loadApiBusiness(id, auth.user.id).catch(() => null);
  if (!existing) return apiError(404, "Business not found");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Body must be valid JSON");
  }
  const parsed = hoursSchema.safeParse(body);
  if (!parsed.success) return apiError(422, "Validation failed", zodErrors(parsed.error));
  try {
    await biz.saveSection({ id: auth.user.id, role: auth.user.role }, id, "hours", parsed.data, { immediate: false });
    const b = await loadApiBusiness(id, auth.user.id);
    return NextResponse.json({ data: b ? toJson(b).hours : [] });
  } catch (e) {
    return handleApiError(e);
  }
}
