import { sql, type SQL } from "drizzle-orm";

export const METERS_PER_MILE = 1609.344;

/** geography(Point) literal for PostGIS functions. */
export function point(lat: number, lng: number): SQL {
  return sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}

/** Distance in miles from a geography column to a point. */
export function distanceMiles(column: SQL, lat: number, lng: number): SQL<number> {
  return sql<number>`(ST_Distance(${column}, ${point(lat, lng)}) / ${METERS_PER_MILE})`;
}

export function withinMiles(column: SQL, lat: number, lng: number, miles: number): SQL {
  return sql`ST_DWithin(${column}, ${point(lat, lng)}, ${miles * METERS_PER_MILE})`;
}

export type BBox = { west: number; south: number; east: number; north: number };

export function inBBox(column: SQL, b: BBox): SQL {
  return sql`${column} && ST_MakeEnvelope(${b.west}, ${b.south}, ${b.east}, ${b.north}, 4326)::geography`;
}

export function parseBBox(value: string | undefined | null): BBox | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = parts as [number, number, number, number];
  if (south < -90 || north > 90 || south >= north) return null;
  return { west, south, east, north };
}

export function formatMiles(miles: number | null | undefined) {
  if (miles == null) return "";
  if (miles < 0.1) return "< 0.1 mi";
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}
