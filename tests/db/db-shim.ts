/* eslint-disable @typescript-eslint/no-explicit-any -- test harness: raw SQL rows are intentionally loosely typed */
// Test-only replacement for lib/db.ts backed by in-process PGlite (Postgres in WASM).
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { postgis } from "@electric-sql/pglite-postgis";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../db/schema";

export const pg = new PGlite({ extensions: { citext, pg_trgm, unaccent, postgis } });
export const db = drizzle(pg, { schema });
export const tx = <T>(fn: (t: any) => Promise<T>) => db.transaction(fn as any) as Promise<T>;
export const poolDb = () => db;
export type Tx = any;
export { schema };
