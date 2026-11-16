/**
 * Seed: category taxonomy, 50 states + DC, US cities (Census Gazetteer) and starter CMS content.
 * Demo businesses/testimonials only with SEED_DEMO=1 (never on the production database).
 *
 *   npm run db:seed                       # full seed
 *   SEED_SKIP_GAZETTEER=1 npm run db:seed # use the built-in major-city list only
 *   SEED_DEMO=1 SEED_DEMO_COUNT=100000 npm run db:seed # load-test volume for search benchmarks
 *
 * Runs on DATABASE_URL_UNPOOLED (direct connection), like migrations.
 */
import { config } from "dotenv";

// `neon deploy` / `neon env pull` write to .env.local; .env is a fallback.
config({ path: [".env.local", ".env"], quiet: true });
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as s from "../schema";
import { seedAll } from "./seed";

neonConfig.webSocketConstructor = ws;
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED");
const pool = new Pool({ connectionString: url });

seedAll(drizzle(pool, { schema: s }))
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
