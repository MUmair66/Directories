/**
 * Seed logic used by the Neon seed runner (db/seed/index.ts).
 */
import { sql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { uuidv7 } from "uuidv7";
import * as s from "../schema";
import { TAXONOMY } from "./categories";
import { MAJOR_CITIES, STATES, STATE_TIMEZONES } from "./states";
import { loadGazetteer } from "./gazetteer";
import { seedContent } from "./content";
import { slugify } from "../../lib/text";

// Any drizzle Postgres database (Neon WebSocket pool in production, PGlite locally).
type SeedDb = NeonDatabase<typeof s>;
let db: SeedDb;

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seedCategories() {
  let order = 0;
  for (const parent of TAXONOMY) {
    const parentSlug = slugify(parent.name);
    const [p] = await db
      .insert(s.categories)
      .values({ name: parent.name, slug: parentSlug, icon: parent.icon, featured: !!parent.featured, sortOrder: order++ })
      .onConflictDoUpdate({ target: s.categories.slug, set: { name: parent.name, icon: parent.icon, featured: !!parent.featured } })
      .returning();
    const seen = new Set<string>();
    const children = parent.children
      .map((name, i) => ({ name, slug: slugify(name), parentId: p!.id, sortOrder: i, icon: parent.icon }))
      .filter((c) => (seen.has(c.slug) ? false : (seen.add(c.slug), true)));
    await db
      .insert(s.categories)
      .values(children)
      .onConflictDoUpdate({ target: s.categories.slug, set: { parentId: sql`excluded.parent_id`, name: sql`excluded.name` } });
  }
  console.log(`✓ categories (${TAXONOMY.length} parents)`);
}

async function seedStates() {
  await db
    .insert(s.states)
    .values(STATES.map((st, i) => ({ ...st, slug: slugify(st.name), featured: !!st.featured, sortOrder: i })))
    .onConflictDoUpdate({ target: s.states.slug, set: { lat: sql`excluded.lat`, lng: sql`excluded.lng`, featured: sql`excluded.featured` } });
  console.log(`✓ states (${STATES.length})`);
}

async function seedCities() {
  const states = await db.select().from(s.states);
  const byCode = new Map(states.map((st) => [st.code, st.id]));
  let places: { state: string; name: string; lat: number; lng: number; population: number | null }[];
  if (process.env.SEED_SKIP_GAZETTEER === "1") {
    places = MAJOR_CITIES.map(([name, state, lat, lng, population]) => ({ name, state, lat, lng, population }));
  } else {
    try {
      places = await loadGazetteer();
      // Merge known populations for the largest cities.
      const pops = new Map(MAJOR_CITIES.map(([n, st, , , p]) => [`${st}:${n.toLowerCase()}`, p]));
      places = places.map((p) => ({ ...p, population: p.population ?? pops.get(`${p.state}:${p.name.toLowerCase()}`) ?? null }));
    } catch (e) {
      console.warn("! Gazetteer unavailable, using major-city list:", (e as Error).message);
      places = MAJOR_CITIES.map(([name, state, lat, lng, population]) => ({ name, state, lat, lng, population }));
    }
  }
  const seen = new Set<string>();
  const rows = places.flatMap((p) => {
    const stateId = byCode.get(p.state);
    const slug = slugify(p.name);
    const key = `${stateId}:${slug}`;
    if (!stateId || !slug || seen.has(key)) return [];
    seen.add(key);
    return [{ stateId, name: p.name, slug, lat: p.lat, lng: p.lng, population: p.population }];
  });
  for (const part of chunk(rows, 1000)) {
    await db
      .insert(s.cities)
      .values(part)
      .onConflictDoUpdate({
        target: [s.cities.stateId, s.cities.slug],
        set: { lat: sql`excluded.lat`, lng: sql`excluded.lng`, population: sql`coalesce(excluded.population, cities.population)` },
      });
  }
  console.log(`✓ cities (${rows.length})`);
}

const DEMO_NAMES = [
  ["Blue Line Plumbing", "plumbers"], ["Keystone Locksmith", "locksmith"], ["Summit Roofing Co.", "roofers"],
  ["Harbor Realty Group", "real-estate-agent"], ["Rosemary & Thyme Bistro", "other-restaurants-and-nightlife"],
  ["Northside Auto Repair", "auto-repairs"], ["Bright Smile Dental", "general-dentistry"], ["Evergreen Landscaping", "landscaping-and-gardening"],
  ["Precision HVAC", "hvac"], ["Spark Electric", "electricians-and-electronic-repairs"], ["Clean Slate Cleaning", "home-and-office-cleaning-services"],
  ["Oak & Iron Contractors", "general-contractors"], ["Paws & Claws Grooming", "pet-groomers"], ["Lakeside Law Group", "lawyers"],
  ["Golden Hour Photography", "photographer"], ["Fresh Fold Laundry", "laundry"], ["Main Street Bakery", "bakeries"],
  ["Iron Forge Gym", "gyms-and-sports-clubs"], ["Swift Movers", "movers"], ["Sunrise Solar", "solar-panel-installation"],
  ["TechFix Computer Repair", "computer-repair-services"], ["Ledger Tax & Payroll", "tax-services"], ["Bloom Hair Studio", "hair-salon"],
  ["Classic Cuts Barbershop", "barber"], ["Garage Pros", "garage-door"], ["Pristine Pools", "pool-maintenance-and-construction"],
  ["Guardian Pest Control", "pest-control"], ["Atlas Insurance Agency", "auto-insurance"], ["Cornerstone Accounting", "accountants"],
  ["Coastal Catering", "catering"], ["Little Learners Tutoring", "private-tutors"], ["Riverbend Veterinary Boarding", "pet-boarding"],
  ["Urban Brew Cafe", "cafe"], ["Elite Towing", "towing"], ["Crystal Glass & Mirror", "glass-and-mirror-repair"],
  ["Heritage Flooring", "flooring"], ["Peak Painters", "painters"], ["Handy Hank's Handyman", "handyman"],
  ["Restore Pro Water Damage", "damage-restoration"], ["Junk Gone Hauling", "junk-removal-and-hauling"], ["Prime Appliance Repair", "appliance-repair-services"],
  ["Metro Digital Marketing", "digital-marketing-services"], ["Codecraft Software", "software-design-and-development"],
  ["Serenity Massage", "massage-therapy"], ["CityCare Pharmacy", "pharmacies"], ["Wheels Tire Center", "tires"],
  ["Shine Car Wash", "vehicle-wash"], ["Grand Event Venues", "clubs-and-venues"], ["Hometown Credit Union", "banks-and-credit-unions"],
  ["Foundation First Repair", "foundation-repair"],
] as const;

const REVIEW_TEXTS = [
  "Showed up on time, explained everything clearly and the price matched the quote. Would hire again without hesitation.",
  "Friendly team and quick turnaround. They cleaned up after themselves and followed up the next day to check in.",
  "Good work overall, though scheduling took a few days longer than I expected. Quality was excellent once they started.",
  "Absolutely the best in town. Honest, professional and fairly priced. I've already recommended them to my neighbors.",
  "Solid experience. Communication could be a little better, but the end result was exactly what we wanted.",
  "They went above and beyond on a tricky job other companies turned down. Very impressed with their expertise.",
];

async function seedDemo() {
  const count = Number(process.env.SEED_DEMO_COUNT || 50);
  const cities = await db.execute(sql`
    select c.id, c.name, c.lat, c.lng, c.state_id, s.code, s.name as state_name
    from cities c join states s on s.id = c.state_id
    order by c.population desc nulls last limit 60`);
  const cityRows = cities.rows as { id: string; name: string; lat: number; lng: number; state_id: string; code: string; state_name: string }[];
  const cats = await db.select({ id: s.categories.id, slug: s.categories.slug, name: s.categories.name }).from(s.categories);
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));

  // Demo owner and reviewers
  const demoUsers = Array.from({ length: 12 }, (_, i) => ({
    id: uuidv7(),
    name: ["Alex Morgan", "Jamie Lee", "Priya Patel", "Marcus Brown", "Sofia Garcia", "Chen Wei", "Taylor Kim", "Jordan Smith", "Ava Johnson", "Noah Davis", "Mia Wilson", "Ethan Clark"][i]!,
    email: `demo${i + 1}@example.com`,
    emailVerified: true,
    role: i === 0 ? "owner" : "user",
  }));
  await db.insert(s.users).values(demoUsers).onConflictDoNothing();
  const users = await db.select({ id: s.users.id }).from(s.users).where(sql`email like 'demo%@example.com'`);
  const owner = users[0]!;

  const rng = mulberry32(42);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)]!;

  for (const part of chunk(Array.from({ length: count }, (_, i) => i), 500)) {
    const businesses: (typeof s.businesses.$inferInsert)[] = [];
    const bc: (typeof s.businessCategories.$inferInsert)[] = [];
    const hours: (typeof s.businessHours.$inferInsert)[] = [];
    const mediaRows: (typeof s.media.$inferInsert)[] = [];
    const reviews: (typeof s.reviews.$inferInsert)[] = [];

    for (const i of part) {
      const [baseName, catSlug] = DEMO_NAMES[i % DEMO_NAMES.length]!;
      const city = i < DEMO_NAMES.length ? cityRows[i % cityRows.length]! : pick(cityRows);
      const name = i < DEMO_NAMES.length ? baseName : `${baseName} ${city.name} ${Math.floor(i / DEMO_NAMES.length)}`;
      const id = uuidv7();
      const cat = catBySlug.get(catSlug);
      const jitter = () => (rng() - 0.5) * 0.12;
      businesses.push({
        id,
        ownerId: i < 5 ? owner.id : null,
        name,
        slug: slugify(`${name} ${city.name} ${city.code}`),
        description: `<p>${name} has proudly served ${city.name}, ${city.code} and surrounding communities for over ${5 + (i % 20)} years. Our licensed, insured team delivers reliable ${cat?.name.toLowerCase() ?? "local"} services with upfront pricing, friendly communication and a satisfaction guarantee.</p><p>Call today for a free estimate &amp; same-week scheduling.</p>`,
        email: `hello+${i}@example.com`,
        website: `https://example.com/${slugify(name)}`,
        phone: `(${200 + (i % 700)}) 555-${String(1000 + i).slice(-4)}`,
        stateId: city.state_id,
        cityId: city.id,
        address: `${100 + i} Main St`,
        zip: String(10000 + Math.floor(rng() * 89999)),
        lat: city.lat + jitter(),
        lng: city.lng + jitter(),
        timezone: STATE_TIMEZONES[city.code] ?? "America/New_York",
        status: "approved",
        verificationStatus: i % 3 === 0 ? "verified" : "unverified",
        claimed: i < 5,
        featured: i % 11 === 0,
        approvedAt: new Date(),
        createdAt: new Date(Date.now() - Math.floor(rng() * 60) * 86400000),
      });
      if (cat) bc.push({ businessId: id, categoryId: cat.id, isPrimary: true });
      for (let day = 0; day < 7; day++) {
        hours.push(
          day === 6
            ? { businessId: id, day, isClosed: true }
            : { businessId: id, day, openTime: day === 5 ? "10:00" : "08:00", closeTime: day === 5 ? "16:00" : "18:00", is24h: i % 17 === 0 },
        );
      }
      if (i < 500) {
        mediaRows.push({ businessId: id, type: "banner", key: `demo/${id}-banner`, url: `https://picsum.photos/seed/${id}/1200/675`, width: 1200, height: 675 });
        for (let g = 0; g < 3; g++) {
          mediaRows.push({ businessId: id, type: "gallery", key: `demo/${id}-${g}`, url: `https://picsum.photos/seed/${id}-${g}/1200/900`, width: 1200, height: 900, sortOrder: g });
        }
      }
      const nReviews = i % 7 === 0 ? 0 : 1 + Math.floor(rng() * Math.min(5, users.length - 1));
      const reviewers = [...users.slice(1)].sort(() => rng() - 0.5).slice(0, nReviews);
      for (const u of reviewers) {
        reviews.push({ businessId: id, userId: u.id, rating: Math.max(2, Math.min(5, Math.round(3.5 + rng() * 2))), body: pick(REVIEW_TEXTS), createdAt: new Date(Date.now() - Math.floor(rng() * 90) * 86400000) });
      }
    }
    await db.insert(s.businesses).values(businesses).onConflictDoNothing();
    if (bc.length) await db.insert(s.businessCategories).values(bc).onConflictDoNothing();
    await db.insert(s.businessHours).values(hours).onConflictDoNothing();
    if (mediaRows.length) await db.insert(s.media).values(mediaRows);
    if (reviews.length) await db.insert(s.reviews).values(reviews).onConflictDoNothing();
  }

  await db.execute(sql`select refresh_business_search(id) from businesses`);
  await db.execute(sql`select refresh_business_rating(id) from businesses`);
  console.log(`✓ demo businesses (${count})`);
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs the full seed against `database`. */
export async function seedAll(database: SeedDb) {
  db = database;
  await seedCategories();
  await seedStates();
  await seedCities();
  const existing = await db.execute(sql`select count(*)::int as n from businesses`);
  if (Number((existing.rows[0] as { n: number }).n) === 0) await seedDemo();
  else console.log("• businesses already present, skipping demo data");
  await seedContent(db);
  await db.execute(sql`refresh materialized view listing_counts`);
  console.log("✓ listing_counts refreshed");
}
