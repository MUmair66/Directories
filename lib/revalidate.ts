import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";

/**
 * Invalidates every cache tag a business change touches: its profile, its categories,
 * its state and city, and listing grids. Call after any business write.
 *
 * `immediate` (Server Actions only) uses updateTag for read-your-own-writes on the profile;
 * Route Handlers and cron must pass false (revalidateTag with the "max" profile).
 */
export async function revalidateBusiness(businessId: string, opts: { immediate?: boolean; extraSlugs?: string[] } = {}) {
  const row = await db.execute(sql`
    select b.slug, st.slug as state_slug, c.slug as city_slug,
      coalesce(array_agg(distinct cat.slug) filter (where cat.slug is not null), '{}') as cat_slugs,
      coalesce(array_agg(distinct par.slug) filter (where par.slug is not null), '{}') as parent_slugs
    from businesses b
    left join states st on st.id = b.state_id
    left join cities c on c.id = b.city_id
    left join business_categories bc on bc.business_id = b.id
    left join categories cat on cat.id = bc.category_id
    left join categories par on par.id = cat.parent_id
    where b.id = ${businessId}
    group by b.slug, st.slug, c.slug`);
  const r = row.rows[0] as { slug: string; state_slug: string | null; city_slug: string | null; cat_slugs: string[]; parent_slugs: string[] } | undefined;

  const expire = (tag: string) => (opts.immediate ? updateTag(tag) : revalidateTag(tag, "max"));
  expire(tags.business(businessId));
  if (r) {
    expire(tags.businessSlug(r.slug));
    for (const slug of opts.extraSlugs ?? []) expire(tags.businessSlug(slug));
    for (const slug of [...r.cat_slugs, ...r.parent_slugs]) revalidateTag(tags.category(slug), "max");
    if (r.state_slug) revalidateTag(tags.state(r.state_slug), "max");
    if (r.state_slug && r.city_slug) revalidateTag(tags.city(`${r.state_slug}/${r.city_slug}`), "max");
  }
  revalidateTag(tags.listings, "max");
}

/** Recomputes denormalized search columns (category names, tags, city/state names). */
export async function refreshSearchFields(businessId: string) {
  await db.execute(sql`select refresh_business_search(${businessId}::uuid)`);
}

export async function businessOwnerId(businessId: string) {
  const b = await db.query.businesses.findFirst({ where: eq(s.businesses.id, businessId), columns: { ownerId: true } });
  return b?.ownerId ?? null;
}
