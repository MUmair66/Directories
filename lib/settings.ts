import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { DEFAULT_HOMEPAGE, DEFAULT_SITE, type HomepageSettings, type SiteSettings } from "@/lib/settings-defaults";

export type { HomepageSettings, SiteSettings };

export async function getSettings(): Promise<{ site: SiteSettings; homepage: HomepageSettings }> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.settings);
  try {
    const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, ["site", "homepage"]));
    const get = (k: string) => rows.find((r) => r.key === k)?.value ?? {};
    return {
      site: { ...DEFAULT_SITE, ...(get("site") as Partial<SiteSettings>) },
      homepage: { ...DEFAULT_HOMEPAGE, ...(get("homepage") as Partial<HomepageSettings>) },
    };
  } catch (e) {
    console.error("[settings] falling back to defaults", e);
    return { site: DEFAULT_SITE, homepage: DEFAULT_HOMEPAGE };
  }
}
