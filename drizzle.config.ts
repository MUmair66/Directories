import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/** Migrations always run on the direct (unpooled) Neon connection. */
export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? "postgres://placeholder@localhost/placeholder",
  },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
