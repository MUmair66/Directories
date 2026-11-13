"use server";
import { revalidateTag, updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { db, schema as s, tx } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";
import { tags } from "@/lib/cache-tags";
import { categorySchema, citySchema, stateSchema } from "./schemas";

const STAFF = ["admin", "editor"] as const;
const nul = (v: string | undefined) => (v ? v : null);

/* ── Categories ───────────────────────────────────────────────────── */

export const saveCategory = action({ schema: categorySchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const parentId = nul(input.parentId);
  if (input.id && parentId === input.id) throw new ActionError("A category can't be its own parent.", { parentId: "Choose a different parent" });
  if (input.id && parentId) {
    const hasChildren = await db.query.categories.findFirst({ where: eq(s.categories.parentId, input.id), columns: { id: true } });
    if (hasChildren) throw new ActionError("This category has subcategories, so it must stay a parent.", { parentId: "Parent categories can't be nested" });
  }
  const values = {
    parentId,
    name: input.name,
    slug: input.slug,
    icon: nul(input.icon),
    imageUrl: nul(input.imageUrl),
    intro: input.intro ? sanitizeHtml(input.intro) : null,
    metaTitle: nul(input.metaTitle),
    metaDescription: nul(input.metaDescription),
    sortOrder: input.sortOrder,
    featured: input.featured,
  };
  let oldSlug: string | null = null;
  let id = input.id;
  if (id) {
    const before = await db.query.categories.findFirst({ where: eq(s.categories.id, id) });
    if (!before) throw new ActionError("Category not found.");
    oldSlug = before.slug;
    await tx(async (t) => {
      await t.update(s.categories).set(values).where(eq(s.categories.id, id!));
      if (before.slug !== input.slug) {
        await addRedirect(t, before.parentId ? `/search?category=${before.slug}` : `/categories/${before.slug}`, parentId ? `/search?category=${input.slug}` : `/categories/${input.slug}`);
      }
      // Names feed the search vector of every listing in this category.
      if (before.name !== input.name || before.parentId !== parentId) {
        await t.execute(sql`select refresh_business_search(bc.business_id) from business_categories bc
          join categories c on c.id = bc.category_id where c.id = ${id} or c.parent_id = ${id}`);
      }
      await audit({ actorId: user.id, action: "category.update", entityType: "category", entityId: id!, diff: { before: { name: before.name, slug: before.slug }, after: values }, ip }, t);
    });
  } else {
    const [row] = await db.insert(s.categories).values(values).returning({ id: s.categories.id });
    id = row!.id;
    await audit({ actorId: user.id, action: "category.create", entityType: "category", entityId: id, diff: values, ip });
  }
  invalidateCategory(input.slug, oldSlug);
  return { ok: true, message: input.id ? "Category saved." : "Category created.", data: { id } };
});

export const deleteCategory = action({ schema: z.object({ id: z.uuid() }), roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  const cat = await db.query.categories.findFirst({ where: eq(s.categories.id, id) });
  if (!cat) throw new ActionError("Category not found.");
  const [{ n }] = (await db.execute(sql`select
      (select count(*)::int from business_categories where category_id = ${id}) + (select count(*)::int from categories where parent_id = ${id}) as n`)).rows as { n: number }[];
  if (n > 0) throw new ActionError("This category still has listings or subcategories. Merge it into another category instead.");
  await db.delete(s.categories).where(eq(s.categories.id, id));
  await audit({ actorId: user.id, action: "category.delete", entityType: "category", entityId: id, diff: { name: cat.name, slug: cat.slug }, ip });
  invalidateCategory(cat.slug);
  return { ok: true, message: "Category deleted." };
});

/** Moves listings (and subcategories) from source to target, deletes source, 301s its URL. */
export const mergeCategories = action({ schema: z.object({ sourceId: z.uuid(), targetId: z.uuid() }), roles: [...STAFF] }, async ({ sourceId, targetId }, { user, ip }) => {
  if (sourceId === targetId) throw new ActionError("Choose two different categories.");
  const [source, target] = await Promise.all([
    db.query.categories.findFirst({ where: eq(s.categories.id, sourceId) }),
    db.query.categories.findFirst({ where: eq(s.categories.id, targetId) }),
  ]);
  if (!source || !target) throw new ActionError("Category not found.");
  if (target.parentId === sourceId) throw new ActionError("You can't merge a parent into its own subcategory.");
  await tx(async (t) => {
    const moved = await t.execute(sql`select business_id from business_categories where category_id = ${sourceId}`);
    await t.execute(sql`insert into business_categories (business_id, category_id, is_primary)
      select business_id, ${targetId}, is_primary from business_categories where category_id = ${sourceId} on conflict do nothing`);
    await t.execute(sql`delete from business_categories where category_id = ${sourceId}`);
    await t.execute(sql`update categories set parent_id = ${target.parentId ? target.parentId : targetId} where parent_id = ${sourceId}`);
    await t.execute(sql`update top_pros_pages set category_id = ${targetId} where category_id = ${sourceId}`);
    await t.delete(s.categories).where(eq(s.categories.id, sourceId));
    await addRedirect(t, source.parentId ? `/search?category=${source.slug}` : `/categories/${source.slug}`, target.parentId ? `/search?category=${target.slug}` : `/categories/${target.slug}`);
    const bizIds = (moved.rows as { business_id: string }[]).map((r) => r.business_id);
    if (bizIds.length) await t.execute(sql`select refresh_business_search(id) from businesses where id in (${sql.join(bizIds.map((b) => sql`${b}::uuid`), sql`, `)})`);
    await audit({ actorId: user.id, action: "category.merge", entityType: "category", entityId: targetId, diff: { mergedFrom: source.slug, listings: bizIds.length }, ip }, t);
  });
  invalidateCategory(target.slug, source.slug);
  revalidateTag(tags.listings, "max");
  return { ok: true, message: `Merged “${source.name}” into “${target.name}”.` };
});

function invalidateCategory(slug: string, oldSlug?: string | null) {
  updateTag(tags.categories);
  updateTag(tags.category(slug));
  if (oldSlug && oldSlug !== slug) updateTag(tags.category(oldSlug));
  revalidateTag(tags.counts, "max");
}

type T = Parameters<Parameters<typeof tx>[0]>[0];
async function addRedirect(t: T, oldPath: string, newPath: string) {
  if (oldPath === newPath) return;
  await t
    .insert(s.slugRedirects)
    .values({ entityType: "category", oldPath, newPath })
    .onConflictDoUpdate({ target: s.slugRedirects.oldPath, set: { newPath } });
  // Keep redirect chains one hop long.
  await t.update(s.slugRedirects).set({ newPath }).where(eq(s.slugRedirects.newPath, oldPath));
  await t.delete(s.slugRedirects).where(eq(s.slugRedirects.oldPath, newPath));
}

/* ── Locations ────────────────────────────────────────────────────── */

export const saveState = action({ schema: stateSchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const before = await db.query.states.findFirst({ where: eq(s.states.id, input.id) });
  if (!before) throw new ActionError("State not found.");
  const values = { name: input.name, slug: input.slug, lat: input.lat, lng: input.lng, intro: input.intro ? sanitizeHtml(input.intro) : null, metaTitle: nul(input.metaTitle), metaDescription: nul(input.metaDescription), featured: input.featured };
  await tx(async (t) => {
    await t.update(s.states).set(values).where(eq(s.states.id, input.id));
    if (before.slug !== input.slug) {
      await t.insert(s.slugRedirects).values({ entityType: "state", oldPath: `/states/${before.slug}`, newPath: `/states/${input.slug}` }).onConflictDoUpdate({ target: s.slugRedirects.oldPath, set: { newPath: `/states/${input.slug}` } });
    }
    if (before.name !== input.name) await t.execute(sql`select refresh_business_search(id) from businesses where state_id = ${input.id}`);
    await audit({ actorId: user.id, action: "state.update", entityType: "state", entityId: input.id, diff: values, ip }, t);
  });
  updateTag(tags.locations);
  updateTag(tags.state(input.slug));
  if (before.slug !== input.slug) updateTag(tags.state(before.slug));
  return { ok: true, message: "State saved." };
});

export const saveCity = action({ schema: citySchema, roles: [...STAFF] }, async (input, { user, ip }) => {
  const values = {
    stateId: input.stateId, name: input.name, slug: input.slug, lat: input.lat, lng: input.lng, population: input.population ?? null,
    intro: input.intro ? sanitizeHtml(input.intro) : null, metaTitle: nul(input.metaTitle), metaDescription: nul(input.metaDescription),
  };
  const st = await db.query.states.findFirst({ where: eq(s.states.id, input.stateId), columns: { slug: true } });
  if (!st) throw new ActionError("State not found.", { stateId: "Choose a state" });
  const dup = await db.query.cities.findFirst({ where: and(eq(s.cities.stateId, input.stateId), eq(s.cities.slug, input.slug)), columns: { id: true } });
  if (dup && dup.id !== input.id) throw new ActionError("A city with this slug already exists in that state.", { slug: "Already used in this state" });

  if (input.id) {
    const before = await db.query.cities.findFirst({ where: eq(s.cities.id, input.id), with: { state: { columns: { slug: true } } } });
    if (!before) throw new ActionError("City not found.");
    await tx(async (t) => {
      await t.update(s.cities).set(values).where(eq(s.cities.id, input.id!));
      const oldPath = `/states/${before.state.slug}/${before.slug}`;
      const newPath = `/states/${st.slug}/${input.slug}`;
      if (oldPath !== newPath) await t.insert(s.slugRedirects).values({ entityType: "city", oldPath, newPath }).onConflictDoUpdate({ target: s.slugRedirects.oldPath, set: { newPath } });
      if (before.name !== input.name || before.stateId !== input.stateId) await t.execute(sql`select refresh_business_search(id) from businesses where city_id = ${input.id}`);
      await audit({ actorId: user.id, action: "city.update", entityType: "city", entityId: input.id!, diff: values, ip }, t);
    });
    updateTag(tags.city(`${before.state.slug}/${before.slug}`));
  } else {
    const [row] = await db.insert(s.cities).values(values).returning({ id: s.cities.id });
    await audit({ actorId: user.id, action: "city.create", entityType: "city", entityId: row!.id, diff: values, ip });
  }
  updateTag(tags.locations);
  updateTag(tags.city(`${st.slug}/${input.slug}`));
  return { ok: true, message: input.id ? "City saved." : "City added." };
});

export const deleteCity = action({ schema: z.object({ id: z.uuid() }), roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from businesses where city_id = ${id}`)).rows as { n: number }[];
  if (n > 0) throw new ActionError(`This city has ${n} listing${n === 1 ? "" : "s"}. Move them before deleting it.`);
  const city = await db.query.cities.findFirst({ where: eq(s.cities.id, id), columns: { name: true } });
  await db.delete(s.cities).where(eq(s.cities.id, id));
  await audit({ actorId: user.id, action: "city.delete", entityType: "city", entityId: id, diff: { name: city?.name }, ip });
  updateTag(tags.locations);
  return { ok: true, message: "City deleted." };
});
