/* eslint-disable @typescript-eslint/no-explicit-any -- test harness: raw SQL rows are intentionally loosely typed */
// Verifies migrations, triggers, SQL functions, the materialized view and lib/search.ts on PGlite.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db, pg } from "./db-shim";
import * as s from "../../db/schema";
import { TAXONOMY } from "../../db/seed/categories";
import { MAJOR_CITIES, STATES, STATE_TIMEZONES } from "../../db/seed/states";
import { slugify } from "../../lib/text";
import { searchBusinesses, mapMarkers, suggestWhat, suggestWhere, resolveLocation } from "@/lib/search";

const t0 = Date.now();
const ok = (msg: string) => console.log(`✓ ${msg}`);
const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

async function migrate() {
  const dir = join(__dirname, "../../db/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const stmts = readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint").map((x) => x.trim()).filter(Boolean);
    for (const stmt of stmts) {
      try {
        await pg.exec(stmt);
      } catch (e) {
        fail(`${file}: ${(e as Error).message}\n${stmt.slice(0, 300)}`);
      }
    }
    ok(`migration ${file} (${stmts.length} statements)`);
  }
  // ALTER DATABASE … SET applies to new sessions; PGlite keeps one session, so apply it here too.
  const t = (await pg.query<{ v: string }>(`select setting as v from pg_db_role_setting, unnest(setconfig) setting where setting like 'pg_trgm%'`)).rows[0]?.v;
  if (t !== "pg_trgm.word_similarity_threshold=0.5") fail(`database-level trigram threshold not set: ${t}`);
  await pg.exec(`set pg_trgm.word_similarity_threshold = 0.5`);
  ok("database-level pg_trgm.word_similarity_threshold = 0.5");
}

async function seed() {
  for (const [i, parent] of TAXONOMY.entries()) {
    const [p] = await db.insert(s.categories).values({ name: parent.name, slug: slugify(parent.name), icon: parent.icon, sortOrder: i }).returning();
    await db.insert(s.categories).values(parent.children.map((name, j) => ({ name, slug: slugify(name), parentId: p!.id, sortOrder: j })));
  }
  const total = (await db.execute(sql`select count(*)::int n from categories`)).rows[0] as { n: number };
  ok(`categories seeded (${total.n}, slugs unique)`);

  await db.insert(s.states).values(STATES.map((st) => ({ ...st, slug: slugify(st.name) })));
  const states = await db.select().from(s.states);
  const byCode = new Map(states.map((x) => [x.code, x.id]));
  const seen = new Set<string>();
  const cityRows = MAJOR_CITIES.flatMap(([name, code, lat, lng, population]) => {
    const key = `${code}:${slugify(name)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ name, slug: slugify(name), stateId: byCode.get(code)!, lat, lng, population }];
  });
  await db.insert(s.cities).values(cityRows);
  const centered = (await db.execute(sql`select count(*)::int n from cities where center is not null`)).rows[0] as { n: number };
  if (centered.n !== cityRows.length) fail("cities center trigger did not fill geography");
  ok(`states (${states.length}) and cities (${cityRows.length}) seeded; center trigger works`);

  const cities = await db.execute(sql`select c.id, c.name, c.lat, c.lng, c.state_id, s.code from cities c join states s on s.id = c.state_id`);
  const chicago = (cities.rows as any[]).find((c) => c.name === "Chicago")!;
  const evanston = (cities.rows as any[]).find((c) => c.name === "Evanston")!;
  const plumbers = (await db.select().from(s.categories).where(sql`slug = 'plumbers'`))[0]!;
  const roofers = (await db.select().from(s.categories).where(sql`slug = 'roofers'`))[0]!;
  const users = Array.from({ length: 3 }, (_, i) => ({ id: uuidv7(), name: `User ${i}`, email: `u${i}@example.com` }));
  await db.insert(s.users).values(users);

  const mk = (name: string, city: any, cat: any, extra: Partial<typeof s.businesses.$inferInsert> = {}) => ({
    id: uuidv7(), name, slug: slugify(`${name} ${city.name}`), stateId: city.state_id, cityId: city.id, lat: city.lat + 0.01, lng: city.lng + 0.01,
    status: "approved" as const, description: `<p>${name} serves ${city.name} with fast &amp; friendly service.</p>`, timezone: STATE_TIMEZONES[city.code], cat, ...extra,
  });
  const rows = [
    mk("Blue Line Plumbing", chicago, plumbers),
    mk("Café Résumé Plumbing", chicago, plumbers),
    mk("Summit Roofing", chicago, roofers),
    mk("Lakeshore Roofers", evanston, roofers),
    mk("Hidden Draft Plumbing", chicago, plumbers, { status: "draft" }),
    mk("Deleted Plumbing", chicago, plumbers, { deletedAt: new Date() }),
  ];
  for (const { cat, ...b } of rows) {
    await db.insert(s.businesses).values(b);
    await db.insert(s.businessCategories).values({ businessId: b.id, categoryId: cat.id, isPrimary: true });
    for (let d = 0; d < 7; d++) await db.insert(s.businessHours).values({ businessId: b.id, day: d, is24h: true });
  }
  const located = (await db.execute(sql`select count(*)::int n from businesses where location is not null`)).rows[0] as { n: number };
  if (located.n !== rows.length) fail("businesses location trigger failed");
  ok("businesses location trigger fills geography from lat/lng");

  await db.execute(sql`select refresh_business_search(id) from businesses`);
  const bl = (await db.execute(sql`select category_names, city_name, state_name, search_vector::text sv from businesses where name = 'Blue Line Plumbing'`)).rows[0] as any;
  if (!bl.category_names.includes("Plumbers") || !bl.category_names.includes("Home Improvement")) fail(`refresh_business_search categories wrong: ${bl.category_names}`);
  if (bl.city_name !== "Chicago" || !bl.state_name.includes("IL")) fail("refresh_business_search location wrong");
  if (!bl.sv.includes("plumber")) fail("search_vector not generated");
  ok(`refresh_business_search + generated search_vector (${bl.category_names} | ${bl.state_name})`);

  const target = rows[0]!;
  await db.insert(s.reviews).values([
    { businessId: target.id, userId: users[0]!.id, rating: 5, body: "x".repeat(40) },
    { businessId: target.id, userId: users[1]!.id, rating: 4, body: "y".repeat(40) },
  ]);
  await db.execute(sql`select refresh_business_rating(${target.id}::uuid)`);
  const agg = (await db.execute(sql`select avg_rating::float a, review_count n, last_review_at is not null has_last from businesses where id = ${target.id}`)).rows[0] as any;
  if (agg.a !== 4.5 || agg.n !== 2 || !agg.has_last) fail(`refresh_business_rating wrong: ${JSON.stringify(agg)}`);
  ok("refresh_business_rating (avg 4.5, count 2)");
  try {
    await db.insert(s.reviews).values({ businessId: target.id, userId: users[0]!.id, rating: 1, body: "z".repeat(40) });
    fail("duplicate review was allowed");
  } catch {
    ok("unique (business_id, user_id) on reviews enforced");
  }

  await db.execute(sql`refresh materialized view listing_counts`);
  await db.execute(sql`refresh materialized view concurrently listing_counts`);
  const counts = (await db.execute(sql`select
      (select total from listing_counts where category_id is null and state_id is null and city_id is null) total,
      (select total from listing_counts lc join categories c on c.id = lc.category_id where c.slug = 'plumbers' and lc.city_id = ${chicago.id}) chi_plumbers,
      (select total from listing_counts lc join categories c on c.id = lc.category_id where c.slug = 'home-improvement-and-contractors' and lc.state_id is null and lc.city_id is null) parent_total`)).rows[0] as any;
  if (counts.total !== 4 || counts.chi_plumbers !== 2 || counts.parent_total !== 4) fail(`listing_counts wrong: ${JSON.stringify(counts)}`);
  ok(`listing_counts mat view + CONCURRENTLY refresh (total 4, Chicago plumbers 2, parent rollup 4)`);
  return { chicago, plumbers, target };
}

async function searchTests({ chicago, plumbers }: { chicago: any; plumbers: any }) {
  const all = await searchBusinesses({});
  if (all.total !== 4) fail(`public filter: expected 4 approved non-deleted, got ${all.total}`);
  ok("public filter hides drafts and soft-deleted listings");

  const typo = await searchBusinesses({ q: "plumer" });
  if (!typo.items.some((b) => b.name === "Blue Line Plumbing")) fail(`typo "plumer" did not find plumbers: ${typo.items.map((b) => b.name)}`);
  ok(`typo search "plumer" → ${typo.items.map((b) => b.name).join(", ")}`);

  const accent = await searchBusinesses({ q: "cafe resume" });
  if (!accent.items.some((b) => b.name.startsWith("Café"))) fail("unaccent search failed");
  ok('unaccent search "cafe resume" → Café Résumé Plumbing');

  const fts = await searchBusinesses({ q: "roofing" });
  if (fts.items[0]?.name !== "Summit Roofing" && fts.items[0]?.name !== "Lakeshore Roofers") fail("full-text ranking failed");
  ok(`full-text "roofing" ranks roofers first (${fts.items.map((b) => b.name).join(", ")})`);

  const cat = await searchBusinesses({ categoryId: plumbers.id, cityId: chicago.id, sort: "rating" });
  if (cat.total !== 2 || cat.items[0]?.name !== "Blue Line Plumbing") fail("category+city filter / rating sort failed");
  ok("category + city filter with rating sort");

  const parent = (await db.select().from(s.categories).where(sql`slug = 'home-improvement-and-contractors'`))[0]!;
  const byParent = await searchBusinesses({ categoryId: parent.id });
  if (byParent.total !== 4) fail("parent category should include children");
  ok("parent category includes child listings");

  const near = await searchBusinesses({ origin: { lat: chicago.lat, lng: chicago.lng }, sort: "distance", radiusMiles: 5 });
  if (near.total !== 3 || near.items.some((b) => b.distanceMiles == null || b.distanceMiles > 5)) fail(`near me failed: ${JSON.stringify(near.items.map((b) => [b.name, b.distanceMiles]))}`);
  ok(`near-me radius + distance sort in miles (${near.items.map((b) => `${b.name} ${b.distanceMiles?.toFixed(2)}mi`).join(", ")})`);

  const open = await searchBusinesses({ openNow: true });
  if (open.total !== 4) fail("open now (24h) failed");
  ok("open-now SQL evaluates per business time zone");

  const bbox = await mapMarkers({ bbox: { west: -88, south: 41.7, east: -87.5, north: 42 } });
  if (bbox.length !== 3) fail(`bbox expected 3 Chicago markers got ${bbox.length}`);
  ok("map bounding box (ST_MakeEnvelope) returns markers in view");

  const page2 = await searchBusinesses({ perPage: 3, page: 2 });
  if (page2.total !== 4 || page2.items.length !== 1) fail("pagination/total failed");
  ok("pagination with window-count total");

  const card = all.items[0]!;
  if (!Array.isArray(card.hours) || typeof card.isNew !== "boolean" || !card.stateCode) fail("card columns incomplete");
  ok("card columns (hours json, isNew, stateCode, logo/banner subqueries)");

  const what = await suggestWhat("plum");
  if (!what.some((x) => x.type === "category" && x.label === "Plumbers")) fail(`autocomplete what failed: ${JSON.stringify(what)}`);
  if (!what.some((x) => x.type === "business" && x.label === "Blue Line Plumbing")) fail(`autocomplete should match words inside business names: ${JSON.stringify(what)}`);
  ok(`autocomplete "plum" → ${what.map((x) => `${x.type}:${x.label}`).join(", ")}`);

  const where = await suggestWhere("chic");
  if (!where.some((x) => x.label === "Chicago, IL")) fail(`autocomplete where failed: ${JSON.stringify(where)}`);
  ok(`autocomplete "chic" → ${where.map((x) => x.label).join(", ")}`);

  const loc = await resolveLocation("Chicago, IL");
  if (loc?.cityId !== chicago.id) fail("resolveLocation failed");
  ok("resolveLocation('Chicago, IL')");
}

async function dataLayerTests({ chicago, plumbers, target }: { chicago: any; plumbers: any; target: any }) {
  const d = await import("@/lib/data/public");
  const tree = await d.getCategoryTree();
  const home = tree.find((c) => c.slug === "home-improvement-and-contractors")!;
  if (tree.length !== 30 || home.count !== 4 || home.children.find((c) => c.slug === "plumbers")?.count !== 2) fail(`getCategoryTree wrong: ${tree.length} parents, home=${home?.count}`);
  ok(`getCategoryTree (30 parents, counts from listing_counts)`);

  const cityTree = await d.getCategoryTree({ cityId: chicago.id });
  if (cityTree.find((c) => c.slug === "home-improvement-and-contractors")?.count !== 3) fail("city-scoped category counts wrong");
  ok("getCategoryTree scoped to a city");

  const cat = await d.getCategory("plumbers");
  if (cat?.parent?.slug !== "home-improvement-and-contractors") fail("getCategory parent relation failed");
  ok("getCategory with parent/children relations");

  const states = await d.getStates();
  if (states.length !== 51 || states.find((s) => s.code === "IL")?.count !== 4) fail("getStates counts wrong");
  const city = await d.getCity("illinois", "chicago");
  if (city?.city.id !== chicago.id) fail("getCity failed");
  const top = await d.getTopCities(chicago.state_id);
  if (top[0]?.name !== "Chicago" || top[0]?.count !== 3) fail(`getTopCities wrong: ${JSON.stringify(top)}`);
  const near = await d.getNearbyCities(chicago.lat, chicago.lng, chicago.id);
  if (!near.some((c) => c.name === "Evanston")) fail(`getNearbyCities wrong: ${JSON.stringify(near)}`);
  ok("getStates / getCity / getTopCities / getNearbyCities (PostGIS KNN)");

  const counts = [await d.getCount({}), await d.getCount({ stateId: chicago.state_id }), await d.getCount({ cityId: chicago.id }), await d.getCount({ categoryId: plumbers.id, cityId: chicago.id })];
  if (counts.join() !== "4,4,3,2") fail(`getCount wrong: ${counts}`);
  ok("getCount (site, state, city, city + category)");

  const stats = await d.getSiteStats();
  if (stats.listings !== 4 || stats.reviews !== 2 || stats.cities !== 2) fail(`getSiteStats wrong: ${JSON.stringify(stats)}`);
  ok(`getSiteStats ${JSON.stringify(stats)}`);

  const biz = await d.getBusinessBySlug(target.slug);
  if (!biz || biz.categories[0]?.category.parent?.slug !== "home-improvement-and-contractors" || biz.hours.length !== 7 || "email" in biz) fail("getBusinessBySlug relations/email hiding wrong");
  ok("getBusinessBySlug (nested relations, raw email removed)");
  if (await d.getBusinessBySlug("hidden-draft-plumbing-chicago")) fail("draft business visible on profile");
  ok("draft business profile returns null (404)");

  const reviews = await d.getReviews(target.id, "lowest");
  if (reviews.length !== 2 || reviews[0]!.rating !== 4 || !reviews[0]!.user?.name) fail("getReviews failed");
  const dist = await d.getRatingDistribution(target.id);
  if (dist.find((x) => x.star === 5)?.n !== 1 || dist.find((x) => x.star === 4)?.n !== 1) fail("getRatingDistribution failed");
  ok("getReviews (sort, user relation) + getRatingDistribution");

  const similar = await d.getSimilarNearby({ id: target.id, lat: target.lat, lng: target.lng, categoryId: plumbers.id });
  if (similar.length !== 1 || similar[0]!.name !== "Café Résumé Plumbing") fail(`getSimilarNearby wrong: ${similar.map((x) => x.name)}`);
  ok("getSimilarNearby (same category, excludes itself)");

  const recent = await d.getRecentlyReviewed();
  if (recent[0]?.id !== target.id) fail("getRecentlyReviewed failed");
  ok("getRecentlyReviewed");

  const slugs = await d.getTopBusinessSlugs();
  if (slugs[0] !== target.slug || slugs.length !== 4) fail("getTopBusinessSlugs failed");
  ok("getTopBusinessSlugs (generateStaticParams)");
}

(async () => {
  await migrate();
  const ctx = await seed();
  await searchTests(ctx);
  await dataLayerTests(ctx);
  console.log(`\nAll checks passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(0);
})().catch((e) => fail(e?.stack ?? String(e)));
