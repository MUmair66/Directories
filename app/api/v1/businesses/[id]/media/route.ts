import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, authenticate, handleApiError, zodErrors } from "@/lib/api-auth";
import * as biz from "@/lib/businesses";
import { buildKey, publicBucket, putObject } from "@/lib/r2";
import { loadApiBusiness } from "../../../_serialize";

const body = z.object({
  type: z.enum(["logo", "banner", "gallery"]),
  url: z.url().refine((u) => /^https:\/\//i.test(u), "Use an https:// image URL"),
});

const MAX_BYTES = 10 * 1024 * 1024;
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?|metadata\.)/i;

/** POST /api/v1/businesses/{id}/media  body: { "type": "gallery", "url": "https://…/photo.jpg" } */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/businesses/[id]/media">) {
  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const existing = await loadApiBusiness(id, auth.user.id).catch(() => null);
  if (!existing) return apiError(404, "Business not found");

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError(400, "Body must be valid JSON");
  }
  const parsed = body.safeParse(json);
  if (!parsed.success) return apiError(422, "Validation failed", zodErrors(parsed.error));
  const { type, url } = parsed.data;
  if (PRIVATE_HOST.test(new URL(url).hostname)) return apiError(422, "Validation failed", [{ field: "url", message: "URL host is not allowed" }]);

  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10_000) });
    const contentType = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !contentType.startsWith("image/")) return apiError(422, "Validation failed", [{ field: "url", message: "URL must return an image" }]);
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return apiError(422, "Validation failed", [{ field: "url", message: "Image must be 10 MB or smaller" }]);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_BYTES) return apiError(422, "Validation failed", [{ field: "url", message: "Image must be 10 MB or smaller" }]);

    const key = buildKey(`business/${auth.user.id}`, `api.${contentType.split("/")[1] ?? "jpg"}`);
    await putObject(publicBucket(), key, bytes, contentType);
    const m = await biz.addMedia({ id: auth.user.id, role: auth.user.role }, id, type, key, { immediate: false });
    return NextResponse.json({ data: { id: m.id, type: m.type, url: m.url, width: m.width, height: m.height } }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
