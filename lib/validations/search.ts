import { z } from "zod";

export const SORTS = ["relevance", "rating", "reviews", "newest", "name", "distance", "recent_reviews"] as const;
export const POSTED = ["24h", "3d", "7d", "30d"] as const;
export const VIEWS = ["grid", "list", "map"] as const;

const str = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined);

const bool = str.transform((v) => v === "1" || v === "true");

/** Shared search filter schema, parsed from URL searchParams. Unknown/invalid values fall back to defaults. */
export const searchParamsSchema = z.object({
  q: str.transform((v) => v?.slice(0, 100)),
  location: str.transform((v) => v?.slice(0, 100)),
  state: str,
  city: str,
  category: str,
  rating: str.transform((v) => {
    const n = Number(v);
    return n >= 1 && n <= 5 ? n : undefined;
  }),
  open_now: bool,
  verified: bool,
  posted: str.transform((v) => (POSTED as readonly string[]).includes(v ?? "") ? (v as (typeof POSTED)[number]) : undefined),
  sort: str.transform((v) => ((SORTS as readonly string[]).includes(v ?? "") ? (v as (typeof SORTS)[number]) : undefined)),
  page: str.transform((v) => {
    const n = Number.parseInt(v ?? "1", 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : 1;
  }),
  view: str.transform((v) => ((VIEWS as readonly string[]).includes(v ?? "") ? (v as (typeof VIEWS)[number]) : "grid")),
  lat: str.transform((v) => (v && Math.abs(Number(v)) <= 90 ? Number(v) : undefined)),
  lng: str.transform((v) => (v && Math.abs(Number(v)) <= 180 ? Number(v) : undefined)),
  bbox: str,
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
export type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseSearchParams(raw: RawSearchParams): SearchParams {
  const result = searchParamsSchema.safeParse(raw);
  return result.success ? result.data : searchParamsSchema.parse({});
}

/** Builds a query string from filters, dropping empty/default values. */
export function toQueryString(params: Partial<Record<keyof SearchParams, unknown>>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (key === "page" && value === 1) continue;
    if (key === "view" && value === "grid") continue;
    qs.set(key, value === true ? "1" : String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
