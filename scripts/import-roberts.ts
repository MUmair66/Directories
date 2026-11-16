/**
 * One-off import: Robert's Exterior Home Improvement LLC (listing + landing page).
 * Data from https://www.robertsexteriorhomeimprovement.com/ ; photos stored in public/media/roberts-exterior-home-improvement/.
 *
 *   npx tsx scripts/import-roberts.ts
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { neon } from "@neondatabase/serverless";
import { uuidv7 } from "uuidv7";
import { blankSection } from "@/lib/landing";
import { landingContentSchema } from "@/lib/validations/landing";
import { slugify } from "@/lib/text";
import type { LandingContent } from "@/db/schema/content";

/** Pixel size of each photo in public/media/roberts-exterior-home-improvement. */
const dims: Record<string, [number, number]> = {"hero-house-pool":[1600,1203],"front-of-home":[960,639],"owner":[1200,902],"exterior-painting-home":[1200,1200],"exterior-painting-home-2":[1000,1000],"porch-painting":[1200,1200],"commercial-building-painting":[479,480],"commercial-building-painting-2":[480,480],"commercial-painting-in-progress":[1200,1200],"pressure-washing":[1200,1223],"pool-screen-enclosure":[1200,1223],"porch-railings":[756,578],"landscaping":[831,831],"backyard-pool":[1200,902],"lvp-flooring":[1200,1182],"lvp-flooring-2":[1200,577],"lvp-flooring-3":[1200,1200],"lvp-flooring-4":[1200,1200],"bathroom-remodel":[1200,1599],"bathroom-remodel-2":[1200,1200],"bathroom-remodel-3":[682,682],"bathroom-remodel-4":[1200,1200],"bathroom-remodel-5":[1200,1200],"baseboard-installation":[1000,1000]};

const sql = neon(process.env.DATABASE_URL!);
const IMG = "/media/roberts-exterior-home-improvement";
const img = (n: string) => `${IMG}/${n}.webp`;

const NAME = "Robert's Exterior Home Improvement";
const PHONE = "(407) 844-1508";
const WEBSITE = "https://www.robertsexteriorhomeimprovement.com";
const LANDING_SLUG = "40718-best-exterior-painting-home-improvement-orlando-fl";

const DESCRIPTION = `<p>${NAME} LLC has been helping homeowners remodel and repair their homes in Florida since 2004. We remodel or repair any type of residential property, start to finish, and serve all of Central Florida, Orlando and the East Coast.</p>
<p>We paint two-story homes and commercial buildings, and handle pressure washing, screen repair and installation, fence and gate installation and repair, landscaping, mulch, sod, palm tree and plant installation, and irrigation repairs.</p>
<p>Inside the home we install luxury vinyl plank (LVP), wood-look waterproof and tile flooring, and complete bathroom remodels: vanities, fixtures, tile, doors, trim, baseboards and moulding.</p>
<p>Free estimates, 24-hour emergency service, and senior and veteran discounts. Call or text ${PHONE}.</p>`;

const GALLERY = [
  "exterior-painting-home", "porch-painting", "pressure-washing", "pool-screen-enclosure", "commercial-painting-in-progress",
  "commercial-building-painting", "exterior-painting-home-2", "backyard-pool", "landscaping", "porch-railings",
  "lvp-flooring", "lvp-flooring-2", "lvp-flooring-3", "bathroom-remodel", "bathroom-remodel-2", "bathroom-remodel-3",
  "bathroom-remodel-4", "bathroom-remodel-5",
];

const STATS_CODE = `<div class="re-stats">
  <div><strong>2004</strong><span>Serving Florida since</span></div>
  <div><strong>24/7</strong><span>Emergency service</span></div>
  <div><strong>Free</strong><span>Written estimates</span></div>
  <div><strong>Senior &amp; Veteran</strong><span>Discounts available</span></div>
</div>
<style>
  .re-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; max-width: 1100px; margin: 0 auto; }
  .re-stats div { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px 16px; text-align: center; box-shadow: 0 1px 2px rgba(15,23,42,.06); }
  .re-stats strong { display: block; font-size: 28px; line-height: 1.15; font-weight: 800; color: var(--lp-primary, #0f4c81); }
  .re-stats span { display: block; margin-top: 6px; font-size: 14px; color: #475569; }
  @media (max-width: 760px) { .re-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .re-stats strong { font-size: 22px; } }
</style>`;

function landingContent(): LandingContent {
  return {
    version: 2,
    theme: { primary: "#0f4c81", accent: "#f59e0b", background: "#ffffff", text: "#0f172a", heroOverlay: 55, radius: "large" },
    sections: [
      blankSection("intro", {
        title: "Exterior Painting & Home Improvement in Orlando, FL",
        subtitle: "Two-story homes, commercial buildings, pressure washing, flooring and bathroom remodels. One trusted Central Florida crew since 2004.",
        ctaLabel: "Get a free estimate",
        imageUrl: img("hero-house-pool"),
        layout: "centered",
        items: [
          { title: "Free estimates", text: "", imageUrl: "" },
          { title: "24-hour emergency service", text: "", imageUrl: "" },
          { title: "Senior & veteran discounts", text: "", imageUrl: "" },
          { title: "Serving Florida since 2004", text: "", imageUrl: "" },
        ],
      }),
      blankSection("code", { anchor: "Highlights", navLabel: "", title: "", code: STATS_CODE, codeMode: "html", fullWidth: false, bgColor: "#f1f5f9" }),
      blankSection("services", {
        title: "Our services",
        subtitle: "We remodel or repair any type of residential property, start to finish.",
        items: [
          { title: "Exterior Painting", text: "We paint two-story homes: siding, stucco, trim, porches, railings and doors, with careful prep and clean lines.", imageUrl: img("exterior-painting-home") },
          { title: "Commercial Painting", text: "Office buildings and commercial properties repainted with minimal disruption to your business.", imageUrl: img("commercial-painting-in-progress") },
          { title: "Pressure Washing", text: "Driveways, pool decks, patios, walkways and exterior walls cleaned back to like-new.", imageUrl: img("pressure-washing") },
          { title: "Screen Repair & Installation", text: "Pool cages, lanais and porch screens repaired or replaced to keep bugs out and the breeze in.", imageUrl: img("pool-screen-enclosure") },
          { title: "Flooring Installation", text: "Luxury vinyl plank (LVP), wood-look waterproof and tile flooring, professionally installed.", imageUrl: img("lvp-flooring") },
          { title: "Bathroom Remodeling", text: "Showers, tile, vanities, fixtures and finishes, from quick updates to full bathroom makeovers.", imageUrl: img("bathroom-remodel") },
          { title: "Fences, Gates & Railings", text: "Fence and gate installation and repair, plus porch and stair railings.", imageUrl: img("porch-railings") },
          { title: "Landscaping & Irrigation", text: "Landscape changes, mulch, sod, palm tree and plant installation, and irrigation repairs.", imageUrl: img("landscaping") },
          { title: "Handyman & Interior Repairs", text: "Baseboards, trim and moulding, doors, interior painting, caulking, blinds, shutters and more.", imageUrl: img("baseboard-installation") },
        ],
      }),
      blankSection("about", {
        title: "Local, owner-operated and on the job since 2004",
        body: `<p>${NAME} LLC has been helping homeowners remodel and repair their homes in Florida since 2004. We use the best products and have professional home improvement pros for any job, big or small.</p><p>From repainting a two-story home or a commercial building to new floors and a bathroom remodel, we handle the project from start to finish and serve all of Central Florida, Orlando and the East Coast.</p><p><strong>Call or text ${PHONE}</strong> for a free estimate. Senior and veteran discounts available.</p>`,
        imageUrl: img("owner"),
        layout: "image-right",
      }),
      blankSection("gallery", {
        title: "Recent projects",
        subtitle: "Exterior painting, pressure washing, flooring and bathroom remodels across Central Florida.",
        items: GALLERY.map((n) => ({ title: "", text: "", imageUrl: img(n) })),
      }),
      blankSection("reviews", { enabled: false }),
      blankSection("faq", {
        items: [
          { title: "Do you offer free estimates?", text: "Yes. Call or text (407) 844-1508, or send the form below, and we'll set up a free estimate.", imageUrl: "" },
          { title: "What areas do you serve?", text: "All of Central Florida, Orlando and the East Coast of Florida.", imageUrl: "" },
          { title: "Do you offer emergency service?", text: "Yes, 24-hour emergency service is available.", imageUrl: "" },
          { title: "Do you paint two-story homes and commercial buildings?", text: "Yes. We paint two-story homes as well as commercial buildings.", imageUrl: "" },
          { title: "Do you install flooring and remodel bathrooms?", text: "Yes. We install LVP, wood-look waterproof and tile flooring, and remodel bathrooms including vanities, fixtures and tile.", imageUrl: "" },
          { title: "Do you have any discounts?", text: "Yes, we offer senior and veteran discounts.", imageUrl: "" },
        ],
      }),
      blankSection("contact", {
        title: "Get your free estimate",
        subtitle: "Tell us about your project. We'll get back to you fast, or call or text (407) 844-1508.",
        ctaLabel: "Request free estimate",
      }),
    ],
  };
}

async function main() {
  const [city] = await sql`select c.id, c.name, c.lat, c.lng, c.state_id, s.code from cities c join states s on s.id = c.state_id where s.code = 'FL' and c.slug = 'orlando'`;
  if (!city) throw new Error("Orlando, FL not found");
  const [admin] = await sql`select id from users where role = 'admin' order by created_at limit 1`;
  const cats = await sql`select id, slug from categories where slug = any(${["painters", "remodeling", "flooring", "landscaping-and-gardening", "handyman"]})`;
  const order = ["painters", "remodeling", "flooring", "landscaping-and-gardening", "handyman"];
  cats.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

  const content = landingContentSchema.parse(landingContent());
  const slug = slugify(`${NAME} ${city.name} ${city.code}`);

  const existing = await sql`select id from businesses where slug = ${slug}`;
  if (existing.length) throw new Error(`Business ${slug} already exists`);

  const [b] = await sql`insert into businesses (id, name, slug, description, phone, website, state_id, city_id, lat, lng, timezone, hide_address, status, approved_at, submitted_at, wizard_step)
    values (${uuidv7()}, ${NAME}, ${slug}, ${DESCRIPTION}, ${PHONE}, ${WEBSITE}, ${city.state_id}, ${city.id}, ${city.lat}, ${city.lng}, 'America/New_York', true, 'approved', now(), now(), 6)
    returning id`;
  const bid = b!.id as string;

  for (const [i, c] of cats.entries()) await sql`insert into business_categories (business_id, category_id, is_primary) values (${bid}, ${c.id}, ${i === 0})`;

  const d = dims;
  await sql`insert into media (id, business_id, type, key, url, width, height, alt, sort_order) values (${uuidv7()}, ${bid}, 'banner', ${"local/roberts/front-of-home"}, ${img("front-of-home")}, ${d["front-of-home"]![0]}, ${d["front-of-home"]![1]}, ${`${NAME} - painted home in Central Florida`}, 0)`;
  for (const [i, n] of GALLERY.entries()) {
    const alt = `${NAME} - ${n.replace(/-\d+$/, "").replace(/-/g, " ")}`;
    await sql`insert into media (id, business_id, type, key, url, width, height, alt, sort_order) values (${uuidv7()}, ${bid}, 'gallery', ${`local/roberts/${n}`}, ${img(n)}, ${d[n]![0]}, ${d[n]![1]}, ${alt}, ${i})`;
  }

  await sql`insert into business_seo (business_id, meta_title, meta_description) values (${bid}, ${"Robert's Exterior Home Improvement | Painting & Remodeling Orlando FL"}, ${"Exterior painting, pressure washing, flooring and bathroom remodeling in Orlando and Central Florida since 2004. Free estimates: (407) 844-1508."})`;

  await sql`select refresh_business_search(${bid}::uuid)`;
  await sql`select refresh_business_rating(${bid}::uuid)`;

  await sql`insert into landing_pages (id, business_id, owner_id, template, title, slug, content, seo_title, seo_description, status)
    values (${uuidv7()}, ${bid}, ${admin!.id}, 'service', ${"Best Exterior Painting & Home Improvement in Orlando, FL"}, ${LANDING_SLUG}, ${JSON.stringify(content)}::jsonb,
      ${"Exterior Painting & Home Improvement Orlando FL | Robert's"}, ${"Robert's Exterior Home Improvement: house & commercial painting, pressure washing, flooring and bathroom remodels in Orlando since 2004. Free estimates."}, 'published')`;

  await sql`refresh materialized view listing_counts`;
  console.log("business:", `/biz/${slug}`);
  console.log("landing:", `/${LANDING_SLUG}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
