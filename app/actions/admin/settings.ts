"use server";
import { updateTag } from "next/cache";
import { action } from "@/lib/action";
import { audit } from "@/lib/audit";
import { db, schema as s } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";
import { tags } from "@/lib/cache-tags";
import { homepageSchema, siteSettingsSchema } from "./schemas";

async function upsert(key: "site" | "homepage", value: Record<string, unknown>) {
  await db
    .insert(s.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: s.settings.key, set: { value, updatedAt: new Date() } });
}

export const saveHomepageSettings = action({ schema: homepageSchema, roles: ["admin", "editor"] }, async (input, { user, ip }) => {
  const value = { ...input, heroImageUrl: input.heroImageUrl || null, seoText: sanitizeHtml(input.seoText) };
  await upsert("homepage", value);
  await audit({ actorId: user.id, action: "settings.homepage", entityType: "settings", entityId: "homepage", diff: value, ip });
  updateTag(tags.settings);
  return { ok: true, message: "Homepage settings saved." };
});

export const saveSiteSettings = action({ schema: siteSettingsSchema, roles: ["admin"] }, async (input, { user, ip }) => {
  const social = Object.fromEntries(Object.entries(input.social).filter(([, v]) => v));
  const value = {
    ...input,
    logoUrl: input.logoUrl || null,
    supportPhone: input.supportPhone || null,
    social,
    analytics: { gaId: input.analytics.gaId || undefined },
  };
  await upsert("site", value);
  await audit({ actorId: user.id, action: "settings.site", entityType: "settings", entityId: "site", diff: value, ip });
  updateTag(tags.settings);
  return { ok: true, message: "Site settings saved." };
});
