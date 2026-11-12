"use server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { action } from "@/lib/action";
import { db, schema as s } from "@/lib/db";

export const toggleFavorite = action(
  { schema: z.object({ businessId: z.uuid() }), rateLimit: "write" },
  async ({ businessId }, { user }) => {
    const where = and(eq(s.favorites.userId, user.id), eq(s.favorites.businessId, businessId));
    const deleted = await db.delete(s.favorites).where(where).returning();
    if (deleted.length) return { ok: true, message: "Removed from favorites" };
    await db.insert(s.favorites).values({ userId: user.id, businessId }).onConflictDoNothing();
    return { ok: true, message: "Saved to favorites" };
  },
);
