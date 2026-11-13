import "server-only";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@/db/schema";

/**
 * Neon is the app's only database.
 * All runtime queries use DATABASE_URL (the pooled "-pooler" connection).
 * DATABASE_URL_UNPOOLED is used only by drizzle-kit and the seed (see drizzle.config.ts).
 *
 * - `db`: HTTP driver, one round trip per query. Use for reads and single writes.
 * - `tx()`: WebSocket Pool driver for interactive transactions.
 */
function url() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not set");
  if (process.env.NODE_ENV === "production" && !value.includes("-pooler")) {
    console.warn("[db] DATABASE_URL should be the pooled (-pooler) Neon connection string");
  }
  return value;
}

type HttpDb = ReturnType<typeof drizzleHttp<typeof schema>>;
type WsDb = ReturnType<typeof drizzleWs<typeof schema>>;

let httpDb: HttpDb | undefined;
let pool: Pool | undefined;
let wsDb: WsDb | undefined;

function getHttpDb() {
  httpDb ??= drizzleHttp(neon(url()), { schema });
  return httpDb;
}

function getWsDb() {
  if (!wsDb) {
    if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;
    pool = new Pool({ connectionString: url() });
    wsDb = drizzleWs(pool, { schema });
  }
  return wsDb;
}

/** Lazy proxy so importing this module never requires DATABASE_URL at build time. */
export const db = new Proxy({} as HttpDb, {
  get(_t, prop) {
    const target = getHttpDb();
    const value = Reflect.get(target, prop);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export type Tx = Parameters<Parameters<WsDb["transaction"]>[0]>[0];

/** Run work inside a Postgres transaction over the WebSocket pool. */
export function tx<T>(fn: (t: Tx) => Promise<T>): Promise<T> {
  return getWsDb().transaction(fn);
}

/** Drizzle instance on the WebSocket pool (needed by Better Auth for transactional writes). */
export function poolDb() {
  return getWsDb();
}

export { schema };
