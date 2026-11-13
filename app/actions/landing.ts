"use server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { action } from "@/lib/action";
import { db } from "@/lib/db";

/** Counts a landing page view (sent once per page load by a client beacon). Rate-limited per IP. Raw SQL so updated_at isn't touched. */
export const recordLandingView = action({ schema: z.object({ id: z.uuid() }), auth: false, rateLimit: "write" }, async ({ id }) => {
  await db.execute(sql`update landing_pages set views = views + 1 where id = ${id} and status = 'published' and deleted_at is null`);
});
