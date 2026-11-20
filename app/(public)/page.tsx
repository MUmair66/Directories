import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import {
  ArrowRight, BadgeCheck, Building2, CheckCircle2, LayoutGrid, MapPin, MessagesSquare, PlusCircle, Quote, Search, ShieldCheck, Sparkles,
  Star, ThumbsUp, Zap,
} from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { getCategoryTree, getListings, getRecentActivity, getRecentlyReviewed, getSiteStats, getStates } from "@/lib/data/public";
import { getFaqs, getTestimonials } from "@/lib/data/content";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { initials } from "@/lib/text";
import { BRAND_NAME, absoluteUrl } from "@/lib/site";
import { SearchBar } from "@/components/search/search-bar";
import { BusinessCard } from "@/components/listing/business-card";
import { CategoryIcon } from "@/components/listing/category-icon";
import { Stars } from "@/components/listing/stars";
import { ActivityCard } from "@/components/home/activity-card";
import { StorefrontIllustration } from "@/components/home/storefront-illustration";
import { FaqList } from "@/components/content/blocks";
import { Button } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/json-ld";
import { ReadMore } from "@/components/listing/read-more";

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "Organization", name: BRAND_NAME, url: absoluteUrl("/"), logo: absoluteUrl("/brand/logo.png") },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: BRAND_NAME,
            url: absoluteUrl("/"),
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <Hero />
      <TrustStrip />
      <CategoryGrid />
      <section className="py-16 sm:py-20" aria-labelledby="featured-heading">
        <Container>
          <SectionHeader id="featured-heading" title="Featured" highlight="Listings" subtitle="Top-rated local businesses customers keep coming back to." href="/search?sort=rating" linkLabel="View all listings" />
          <Suspense fallback={<CardGridSkeleton count={4} cols="lg:grid-cols-4" />}>
            <FeaturedListings />
          </Suspense>
        </Container>
      </section>
      <HowItWorks />
      <Suspense fallback={null}>
        <RecentActivity />
      </Suspense>
      <WhyChooseUs />
      <BrowseStates />
      <TopProsHighlights />
      <Testimonials />
      <OwnerCta />
      <LatestPosts />
      <HomeFaq />
      <SeoBlock />
    </>
  );
}

/* ── Shared bits ─────────────────────────────────────────────────── */

function SectionHeader({ id, title, highlight, subtitle, href, linkLabel, center }: { id: string; title: string; highlight?: string; subtitle?: string; href?: string; linkLabel?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto mb-10 max-w-2xl text-center" : "mb-8 flex flex-wrap items-end justify-between gap-4"}>
      <div>
        <h2 id={id} className="text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-[2.25rem]">
          {title} {highlight && <span className="text-brand-gradient">{highlight}</span>}
        </h2>
        {subtitle && <p className="mt-2 text-base text-muted-foreground sm:text-lg">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-primary dark:text-purple-300">
          {linkLabel} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function CardGridSkeleton({ count, cols }: { count: number; cols: string }) {
  return (
    <div className={`grid gap-5 sm:grid-cols-2 ${cols}`}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-96 rounded-xl" />
      ))}
    </div>
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

type SiteStats = Awaited<ReturnType<typeof getSiteStats>>;
type StatTile = { icon: typeof Star; value: string; label: string };

/** Live counts once they are impressive enough to show; evergreen facts until then. */
function statTiles(stats: SiteStats): StatTile[] {
  const live: StatTile[] = [
    { icon: Building2, value: stats.listings >= 50 ? `${compact.format(stats.listings)}+` : "", label: "Local businesses" },
    { icon: MapPin, value: stats.cities >= 10 ? `${compact.format(stats.cities)}+` : "50", label: stats.cities >= 10 ? "Cities covered" : "States covered" },
    { icon: LayoutGrid, value: stats.categories >= 10 ? `${compact.format(stats.categories)}+` : "", label: "Categories" },
    { icon: Star, value: stats.reviews >= 25 ? `${compact.format(stats.reviews)}+` : "", label: "Customer reviews" },
  ];
  const evergreen: StatTile[] = [
    { icon: ShieldCheck, value: "100%", label: "Free to search" },
    { icon: BadgeCheck, value: "Verified", label: "Business owners" },
    { icon: Zap, value: "24/7", label: "Online access" },
  ];
  const shown = live.filter((t) => t.value);
  return [...shown, ...evergreen].slice(0, 4);
}

/* ── Hero ────────────────────────────────────────────────────────── */

const HERO_PINS = [
  { className: "right-[30%] top-[22%]", delay: "0s", size: "size-11" },
  { className: "right-[8%] top-[18%]", delay: "1.2s", size: "size-10" },
  { className: "right-[18%] top-[48%]", delay: "0.6s", size: "size-12" },
  { className: "right-[6%] top-[66%]", delay: "1.8s", size: "size-9" },
];

async function Hero() {
  const [{ homepage }, stats] = await Promise.all([getSettings(), getSiteStats()]);
  return (
    <section className="relative isolate overflow-hidden bg-brand-deep text-white">
      <SafeImage
        src={homepage.heroImageUrl ?? "https://picsum.photos/seed/city-skyline/1920/900"}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
        fallback={null}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1f0838]/95 via-[#3a0f63]/80 to-[#4a148c]/25" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[#1f0838]/70 to-transparent" aria-hidden />

      {/* Decorative map pins over the skyline */}
      <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" aria-hidden>
        {HERO_PINS.map((p, i) => (
          <span key={i} className={`absolute animate-float ${p.className}`} style={{ animationDelay: p.delay }}>
            <span className={`flex ${p.size} items-center justify-center rounded-full rounded-br-none bg-white shadow-lg shadow-purple-950/40 rotate-45`}>
              <span className="size-1/2 -rotate-45 rounded-full border-[5px] border-primary" />
            </span>
          </span>
        ))}
      </div>

      <Container className="pb-24 pt-16 sm:pb-28 sm:pt-24">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-purple-100 ring-1 ring-white/20 backdrop-blur">
            <Star className="size-4 fill-rating text-rating" aria-hidden />
            {stats.reviews >= 25 ? `${compact.format(stats.reviews)} reviews of ${compact.format(stats.listings)} local businesses` : "The trusted directory for local businesses"}
          </p>
          <h1 className="text-[2.5rem] font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
            Find Local Businesses <span className="text-[#E7B8FB]">in Your Area</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-purple-100/90">
            Discover trusted local businesses, services and professionals near you, all in one place. Compare reviews, check hours, then call or message in one tap.
          </p>
        </div>
        <div className="mt-9 max-w-4xl">
          <Suspense fallback={<Skeleton className="h-16 w-full rounded-full" />}>
            <SearchBar variant="hero" />
          </Suspense>
        </div>
        {homepage.heroChips.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-white">Popular:</span>
            <ul className="contents" aria-label="Popular searches">
              {homepage.heroChips.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white hover:text-primary">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
          {statTiles(stats)
            .slice(0, 3)
            .map((t) => (
              <div key={t.label} className="flex flex-col-reverse">
                <dt className="text-sm text-purple-200">{t.label}</dt>
                <dd className="font-heading text-2xl font-extrabold tabular-nums sm:text-3xl">{t.value}</dd>
              </div>
            ))}
        </dl>
      </Container>
    </section>
  );
}

/* ── Trust strip ─────────────────────────────────────────────────── */

const TRUST = [
  { icon: ShieldCheck, title: "Verified Businesses", text: "Real, trusted local listings" },
  { icon: MapPin, title: "Local Results", text: "Find services near you" },
  { icon: Star, title: "Real Reviews", text: "Honest customer feedback" },
  { icon: Zap, title: "Grow Your Business", text: "Get discovered by locals" },
];

function TrustStrip() {
  return (
    <section aria-label={`Why people use ${BRAND_NAME}`} className="relative z-10">
      <Container>
        <ul className="-mt-12 grid grid-cols-1 divide-y divide-border rounded-2xl border border-border bg-card shadow-card-hover min-[480px]:grid-cols-2 min-[480px]:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {TRUST.map((t) => (
            <li key={t.title} className="flex items-center gap-4 px-6 py-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary dark:text-purple-300">
                <t.icon className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-heading font-bold">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ── Categories ──────────────────────────────────────────────────── */

async function CategoryGrid() {
  const [{ homepage }, tree] = await Promise.all([getSettings(), getCategoryTree()]);
  const featured = homepage.featuredCategories.map((slug) => tree.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => !!c);
  const fill = tree.filter((c) => !featured.includes(c)).sort((a, b) => b.count - a.count);
  const tiles = [...featured, ...fill].slice(0, 11);
  return (
    <section className="bg-surface pb-16 pt-16 sm:pb-20 sm:pt-20" aria-labelledby="cats-heading">
      <Container>
        <SectionHeader id="cats-heading" title="Browse by" highlight="Category" subtitle="Explore local businesses across top service categories." href="/categories" linkLabel="View all categories" />
        <ul className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {tiles.map((c) => (
            <li key={c.id}>
              <Link
                href={`/categories/${c.slug}`}
                className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-card px-3 py-6 text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white dark:text-purple-300">
                  <CategoryIcon name={c.icon} className="size-7" />
                </span>
                <span className="text-sm font-semibold leading-snug">{c.name}</span>
                {c.count > 0 && <span className="text-xs text-muted-foreground">{c.count.toLocaleString("en-US")} listings</span>}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/categories"
              className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-card px-3 py-6 text-center transition-colors hover:border-primary hover:bg-secondary"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-primary transition-colors group-hover:bg-primary group-hover:text-white dark:text-purple-300">
                <LayoutGrid className="size-7" aria-hidden />
              </span>
              <span className="text-sm font-semibold">More Categories</span>
              <span className="text-xs text-muted-foreground">{tree.length} in total</span>
            </Link>
          </li>
        </ul>
      </Container>
    </section>
  );
}

/* ── Featured listings ───────────────────────────────────────────── */

async function FeaturedListings() {
  const { items } = await getListings({ sort: "rating", perPage: 8 });
  if (!items.length) return <p className="text-muted-foreground">No listings yet. Be the first to add your business.</p>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((b) => (
        <BusinessCard key={b.id} b={b} />
      ))}
    </div>
  );
}

/* ── How it works ────────────────────────────────────────────────── */

const STEPS = [
  { icon: Search, title: "Search", text: "Tell us what you need and where. Search by service, business name, city or ZIP code." },
  { icon: ThumbsUp, title: "Compare", text: "Check ratings, real reviews, photos, hours and services side by side." },
  { icon: MessagesSquare, title: "Connect", text: "Call, message or request a quote directly from the business in one tap." },
];

function HowItWorks() {
  return (
    <section className="border-y border-border bg-surface py-16 sm:py-20" aria-labelledby="how-heading">
      <Container>
        <SectionHeader id="how-heading" title="How It" highlight="Works" subtitle={`Finding the right local pro on ${BRAND_NAME} takes less than a minute.`} center />
        <ol className="relative grid gap-6 md:grid-cols-3">
          <span className="absolute left-[16%] right-[16%] top-10 hidden border-t-2 border-dashed border-primary/25 md:block" aria-hidden />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex flex-col items-center rounded-2xl border border-border bg-card px-6 pb-8 pt-6 text-center shadow-card">
              <span className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 dark:to-brand-deep">
                <step.icon className="size-7" aria-hidden />
                <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-card font-heading text-sm font-extrabold text-primary ring-2 ring-primary dark:text-purple-300">{i + 1}</span>
              </span>
              <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ── Recent activity ─────────────────────────────────────────────── */

async function RecentActivity() {
  const activity = await getRecentActivity(9);
  // Too few reviews for a feed yet: show recently reviewed businesses instead, or skip the section.
  const reviewed = activity.length >= 3 ? [] : await getRecentlyReviewed(8);
  if (activity.length < 3 && !reviewed.length) return null;
  return (
    <section className="py-16 sm:py-20" aria-labelledby="activity-heading">
      <Container>
        <SectionHeader id="activity-heading" title="Recent" highlight="Activity" subtitle="Fresh reviews from real customers across the country." href="/search?sort=recent_reviews" linkLabel="More recently reviewed" />
        {activity.length >= 3 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activity.map((a) => (
              <li key={a.id}>
                <ActivityCard a={a} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {reviewed.map((b) => (
              <BusinessCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

/* ── Why choose us ───────────────────────────────────────────────── */

const REASONS = [
  "Every listing is reviewed before it goes live",
  "Verified badges for owners who confirm their business",
  "Honest reviews from real customers, never paid placements",
  "Free to search, free to list, no account needed to browse",
];

async function WhyChooseUs() {
  const stats = await getSiteStats();
  const tiles = statTiles(stats);
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-deep via-[#3a0f63] to-ink py-16 text-white sm:py-20" aria-labelledby="why-heading">
      <div className="absolute -right-32 -top-32 -z-10 size-96 rounded-full bg-purple-500/20 blur-3xl" aria-hidden />
      <div className="absolute -bottom-40 -left-20 -z-10 size-96 rounded-full bg-fuchsia-500/10 blur-3xl" aria-hidden />
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#E7B8FB]">
            <Sparkles className="size-4" aria-hidden /> Why {BRAND_NAME}
          </p>
          <h2 id="why-heading" className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            A directory built on trust, <span className="text-[#E7B8FB]">made for your neighborhood</span>
          </h2>
          <p className="mt-4 max-w-xl text-purple-100/90">We help people find businesses that are actually local, and help those businesses get found by the customers right around the corner.</p>
          <ul className="mt-6 grid gap-3">
            {REASONS.map((r) => (
              <li key={r} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#E7B8FB]" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          {tiles.map((t) => (
            <div key={t.label} className="flex flex-col-reverse rounded-2xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur">
              <dt className="mt-1 text-sm text-purple-100/80">{t.label}</dt>
              <dd className="font-heading text-3xl font-extrabold tabular-nums sm:text-4xl">
                <t.icon className="mb-4 size-7 text-[#E7B8FB]" aria-hidden />
                {t.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

/* ── States ──────────────────────────────────────────────────────── */

async function BrowseStates() {
  const [{ homepage }, states] = await Promise.all([getSettings(), getStates()]);
  const featured = homepage.featuredStates.map((slug) => states.find((s) => s.slug === slug)).filter((s): s is NonNullable<typeof s> => !!s);
  if (!featured.length) return null;
  return (
    <section className="py-16 sm:py-20" aria-labelledby="states-heading">
      <Container>
        <SectionHeader id="states-heading" title="Browse by" highlight="State" subtitle="Local businesses in every state, city and town." href="/states" linkLabel="All 50 states" />
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((st) => (
            <li key={st.id}>
              <Link href={`/states/${st.slug}`} className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/40 hover:bg-secondary hover:shadow-card">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white transition-colors group-hover:bg-primary dark:bg-purple-950">{st.code}</span>
                  <span className="truncate font-medium">{st.name}</span>
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">{st.count.toLocaleString("en-US")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ── Top Pros, blog ──────────────────────────────────────────────── */

async function getHomeContent() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.content("top-pros"), tags.content("blog"));
  try {
    const [pros, posts] = await Promise.all([
      db.select({ title: s.topProsPages.title, slug: s.topProsPages.slug, intro: s.topProsPages.intro, coverUrl: s.topProsPages.coverUrl }).from(s.topProsPages).where(eq(s.topProsPages.status, "published")).orderBy(desc(s.topProsPages.publishedAt)).limit(6),
      db.select({ title: s.blogPosts.title, slug: s.blogPosts.slug, excerpt: s.blogPosts.excerpt, coverUrl: s.blogPosts.coverUrl, publishedAt: s.blogPosts.publishedAt, readMinutes: s.blogPosts.readMinutes }).from(s.blogPosts).where(eq(s.blogPosts.status, "published")).orderBy(desc(s.blogPosts.publishedAt)).limit(3),
    ]);
    return { pros, posts };
  } catch {
    return { pros: [], posts: [] };
  }
}

async function TopProsHighlights() {
  const { pros } = await getHomeContent();
  if (!pros.length) return null;
  return (
    <section className="bg-surface py-16 sm:py-20" aria-labelledby="pros-heading">
      <Container>
        <SectionHeader id="pros-heading" title="Top Pros" highlight="Near You" subtitle="Hand-picked, top-rated businesses by city." href="/top-pros" linkLabel="All Top Pros" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((p) => (
            <li key={p.slug}>
              <Link href={`/top-pros/${p.slug}`} className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950">
                  <Star className="size-5 fill-rating text-rating" aria-hidden />
                </span>
                <span className="font-semibold leading-snug group-hover:text-primary dark:group-hover:text-purple-300">{p.title}</span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

async function LatestPosts() {
  const { posts } = await getHomeContent();
  if (!posts.length) return null;
  return (
    <section className="bg-surface py-16 sm:py-20" aria-labelledby="blog-heading">
      <Container>
        <SectionHeader id="blog-heading" title="From the" highlight="Blog" subtitle="Tips for hiring local pros and growing a local business." href="/blog" linkLabel="All articles" />
        <ul className="grid gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <li key={p.slug} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
              <Link href={`/blog/${p.slug}`} className="group block">
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  {p.coverUrl ? (
                    <SafeImage src={p.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-105" fallback={<span className="absolute inset-0 bg-gradient-to-br from-primary to-brand-deep" aria-hidden />} />
                  ) : (
                    <span className="absolute inset-0 bg-gradient-to-br from-primary to-brand-deep" aria-hidden />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold leading-snug group-hover:text-primary dark:group-hover:text-purple-300">{p.title}</h3>
                  {p.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>}
                  <p className="mt-3 text-xs font-medium text-muted-foreground">{p.readMinutes} min read</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ── Testimonials ────────────────────────────────────────────────── */

async function Testimonials() {
  const items = (await getTestimonials().catch(() => [])).slice(0, 3);
  if (!items.length) return null;
  return (
    <section className="py-16 sm:py-20" aria-labelledby="testimonials-heading">
      <Container>
        <SectionHeader id="testimonials-heading" title="What People" highlight="Are Saying" subtitle="Stories from business owners and customers who use us every day." href="/testimonials" linkLabel="Read all stories" />
        <ul className="grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <li key={t.id}>
              <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <Stars rating={t.rating} />
                  <Quote className="size-8 text-primary/20" aria-hidden />
                </div>
                <blockquote className="mt-4 flex-1 leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  {t.photoUrl ? (
                    <SafeImage src={t.photoUrl} alt="" width={44} height={44} className="size-11 rounded-full object-cover" fallback={null} />
                  ) : (
                    <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-bold text-white dark:to-brand-deep" aria-hidden>
                      {initials(t.name)}
                    </span>
                  )}
                  <span>
                    <span className="block font-semibold">{t.name}</span>
                    {t.business && <span className="block text-sm text-muted-foreground">{t.business}</span>}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ── Owner CTA ───────────────────────────────────────────────────── */

const OWNER_POINTS = [
  { icon: Building2, text: "List free in minutes" },
  { icon: BadgeCheck, text: "Get a verified badge" },
  { icon: MessagesSquare, text: "Receive calls and quote requests" },
];

function OwnerCta() {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="owner-heading">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-[#5a1590] via-primary to-[#9c27b0] px-6 py-10 text-white shadow-card-hover sm:px-12 sm:py-12">
          <div className="absolute -left-24 -top-24 -z-10 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-32 right-1/3 -z-10 size-80 rounded-full bg-fuchsia-300/20 blur-3xl" aria-hidden />
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-purple-200">For business owners</p>
              <h2 id="owner-heading" className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                List Your Business on {BRAND_NAME}
              </h2>
              <p className="mt-3 max-w-xl text-lg text-purple-100">Get more local customers, increase your visibility and grow your business with a trusted directory platform.</p>
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                {OWNER_POINTS.map((p) => (
                  <li key={p.text} className="inline-flex items-center gap-2 text-sm font-medium">
                    <p.icon className="size-4 text-purple-200" aria-hidden /> {p.text}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="white" className="rounded-lg text-primary">
                  <Link href="/dashboard/businesses/new">
                    <PlusCircle aria-hidden /> Add Your Business
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="rounded-lg text-white ring-1 ring-white/60 hover:bg-white/10 hover:text-white">
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
            <StorefrontIllustration className="mx-auto hidden w-full max-w-sm drop-shadow-2xl sm:block" />
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────── */

const FALLBACK_FAQS = [
  { question: `Is ${BRAND_NAME} free to use?`, answer: `Yes. Searching ${BRAND_NAME}, reading reviews and contacting businesses is completely free, and you don't need an account to browse.` },
  { question: "How do I add my business?", answer: "Click Add Business, create a free account and fill in your details, hours, photos and services. Our team reviews every listing before it goes live." },
  { question: "What does the Verified badge mean?", answer: "Verified businesses have confirmed they own the listing by SMS, email or document, so you know you're dealing with the real owner." },
  { question: "Are the reviews real?", answer: "Reviews come from signed-in customers and are moderated. Businesses can reply publicly, but they can't pay to remove or hide reviews." },
  { question: "How do I claim an existing listing?", answer: "Open the business page and choose Claim this business. Once ownership is confirmed you can edit the listing and reply to reviews." },
];

async function HomeFaq() {
  const faqs = await getFaqs().catch(() => []);
  const items = (faqs.length ? faqs.map((f) => ({ question: f.question, answer: f.answer })) : FALLBACK_FAQS).slice(0, 6);
  return (
    <section className="py-16 sm:py-20" aria-labelledby="faq-heading">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <h2 id="faq-heading" className="text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-[2.25rem]">
            Frequently Asked <span className="text-brand-gradient">Questions</span>
          </h2>
          <p className="mt-3 text-muted-foreground sm:text-lg">Quick answers about searching, listing and reviewing businesses on {BRAND_NAME}.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline-primary" className="rounded-lg">
              <Link href="/faqs">See all FAQs</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-lg">
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
        </div>
        <FaqList items={items} idPrefix="home-faq" />
      </Container>
    </section>
  );
}

/* ── SEO copy ────────────────────────────────────────────────────── */

async function SeoBlock() {
  const { homepage } = await getSettings();
  if (!homepage.seoText) return null;
  return (
    <section className="border-t border-border bg-surface py-16" aria-labelledby="about-heading">
      <Container className="max-w-4xl">
        <h2 id="about-heading" className="mb-4 text-2xl font-bold">
          {BRAND_NAME}: your local business directory
        </h2>
        <ReadMore html={homepage.seoText} />
      </Container>
    </section>
  );
}
