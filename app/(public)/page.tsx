import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { ArrowRight, BadgeCheck, Building2, MapPinned, MessagesSquare, PhoneCall, Scale3d, Search, Star, Tags } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { getCategoryTree, getRecentlyReviewed, getSiteStats, getStates } from "@/lib/data/public";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { BRAND_NAME, absoluteUrl } from "@/lib/site";
import { SearchBar } from "@/components/search/search-bar";
import { BusinessCard } from "@/components/listing/business-card";
import { CategoryIcon } from "@/components/listing/category-icon";
import { Button } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/json-ld";
import { ReadMore } from "@/components/listing/read-more";

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "Organization", name: BRAND_NAME, url: absoluteUrl("/"), logo: absoluteUrl("/icon.png") },
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
      <PopularCategories />
      <section className="py-14" aria-labelledby="recent-heading">
        <Container>
          <SectionHeader id="recent-heading" title="Businesses with recent reviews" href="/search?sort=recent_reviews" linkLabel="View more" />
          <Suspense fallback={<CardGridSkeleton />}>
            <RecentlyReviewed />
          </Suspense>
        </Container>
      </section>
      <BrowseStates />
      <HowItWorks />
      <OwnerCta />
      <TopProsHighlights />
      <LatestPosts />
      <SeoBlock />
    </>
  );
}

function SectionHeader({ id, title, subtitle, href, linkLabel }: { id: string; title: string; subtitle?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-2xl font-bold sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

async function Hero() {
  const { homepage } = await getSettings();
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${homepage.heroImageUrl ?? "https://picsum.photos/seed/city-skyline/1920/900"})` }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-primary-dark/80" aria-hidden />
      <Container className="flex flex-col items-center py-20 text-center sm:py-28">
        <p className="mb-3 rounded-full bg-white/10 px-4 py-1 text-sm font-semibold tracking-wide text-blue-100 ring-1 ring-white/20">Search, Hire, Review.</p>
        <h1 className="text-[2.5rem] font-extrabold leading-tight sm:text-5xl">Find a Business</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-200">Search trusted local businesses across all 50 states. Compare ratings, read reviews and get in touch in minutes.</p>
        <div className="mt-8 w-full max-w-3xl">
          <Suspense fallback={<Skeleton className="h-16 w-full rounded-full" />}>
            <SearchBar variant="hero" />
          </Suspense>
        </div>
        <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Popular searches">
          {homepage.heroChips.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white hover:text-ink">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

async function TrustStrip() {
  const stats = await getSiteStats();
  const items = [
    { icon: Building2, value: stats.listings, label: "Listings" },
    { icon: Tags, value: stats.categories, label: "Categories" },
    { icon: MapPinned, value: stats.cities, label: "Cities covered" },
    { icon: Star, value: stats.reviews, label: "Reviews" },
  ];
  return (
    <section aria-label="Directory statistics" className="border-b border-border bg-card">
      <Container className="grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-heading text-2xl font-bold tabular-nums">{value.toLocaleString("en-US")}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}

async function PopularCategories() {
  const [{ homepage }, tree] = await Promise.all([getSettings(), getCategoryTree()]);
  const featured = homepage.featuredCategories.map((slug) => tree.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => !!c);
  return (
    <section className="bg-surface py-14" aria-labelledby="cats-heading">
      <Container>
        <SectionHeader id="cats-heading" title="Popular categories" subtitle="Explore the most searched business types." href="/categories" linkLabel="Browse all categories" />
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
          {featured.map((c) => (
            <li key={c.id} className="w-60 shrink-0 snap-start sm:w-auto">
              <Link href={`/categories/${c.slug}`} className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover">
                <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <CategoryIcon name={c.icon} className="size-6" />
                </span>
                <span className="font-semibold leading-snug">{c.name}</span>
                <span className="mt-auto text-sm text-muted-foreground">{c.count.toLocaleString("en-US")} listings</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

async function RecentlyReviewed() {
  const items = await getRecentlyReviewed(8);
  if (!items.length) return <p className="text-muted-foreground">No reviews yet. Be the first to review a local business.</p>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((b) => (
        <BusinessCard key={b.id} b={b} />
      ))}
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-80 rounded-lg" />
      ))}
    </div>
  );
}

async function BrowseStates() {
  const [{ homepage }, states] = await Promise.all([getSettings(), getStates()]);
  const featured = homepage.featuredStates.map((slug) => states.find((s) => s.slug === slug)).filter((s): s is NonNullable<typeof s> => !!s);
  return (
    <section className="bg-surface py-14" aria-labelledby="states-heading">
      <Container>
        <SectionHeader id="states-heading" title="Browse by state" href="/states" linkLabel="All 50 states" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((st) => (
            <li key={st.id}>
              <Link href={`/states/${st.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-ink text-xs font-bold text-white">{st.code}</span>
                  <span className="font-medium">{st.name}</span>
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

function HowItWorks() {
  const searchers = [
    { icon: Search, title: "Search", text: "Find businesses by category, city, state or ZIP." },
    { icon: Scale3d, title: "Compare", text: "Check ratings, hours, photos and real reviews." },
    { icon: PhoneCall, title: "Contact", text: "Call, message or get directions in one tap." },
  ];
  const owners = [
    { icon: Building2, title: "List free", text: "Add your business in under 5 minutes." },
    { icon: BadgeCheck, title: "Verify", text: "Confirm ownership by SMS, email or document." },
    { icon: MessagesSquare, title: "Get leads", text: "Receive messages and calls from local customers." },
  ];
  const Column = ({ title, steps }: { title: string; steps: typeof searchers }) => (
    <div className="rounded-lg border border-border bg-card p-6 shadow-card">
      <h3 className="mb-5 text-lg font-bold">{title}</h3>
      <ol className="grid gap-5">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <st.icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">
                {i + 1}. {st.title}
              </p>
              <p className="text-sm text-muted-foreground">{st.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
  return (
    <section className="py-14" aria-labelledby="how-heading">
      <Container>
        <h2 id="how-heading" className="mb-8 text-center text-2xl font-bold sm:text-3xl">
          How it works
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Column title="For customers" steps={searchers} />
          <Column title="For business owners" steps={owners} />
        </div>
      </Container>
    </section>
  );
}

function OwnerCta() {
  return (
    <section className="bg-primary py-14 text-white">
      <Container className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Your business not listed?</h2>
          <p className="mt-2 text-blue-100">Get a free listing and start receiving calls and messages from local customers.</p>
        </div>
        <Button asChild size="lg" variant="white">
          <Link href="/dashboard/businesses/new">Get a free listing</Link>
        </Button>
      </Container>
    </section>
  );
}

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
    <section className="py-14" aria-labelledby="pros-heading">
      <Container>
        <SectionHeader id="pros-heading" title="Top Pros near you" subtitle="Hand-picked, top-rated businesses by city." href="/top-pros" linkLabel="All Top Pros" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((p) => (
            <li key={p.slug}>
              <Link href={`/top-pros/${p.slug}`} className="flex h-full items-start gap-3 rounded-lg border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
                <Star className="mt-0.5 size-5 shrink-0 fill-rating text-rating" aria-hidden />
                <span className="font-semibold leading-snug hover:text-primary">{p.title}</span>
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
    <section className="bg-surface py-14" aria-labelledby="blog-heading">
      <Container>
        <SectionHeader id="blog-heading" title="From the blog" href="/blog" linkLabel="All articles" />
        <ul className="grid gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <li key={p.slug} className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
              <Link href={`/blog/${p.slug}`} className="group block">
                <div className="aspect-[16/9] bg-muted bg-cover bg-center" style={p.coverUrl ? { backgroundImage: `url(${p.coverUrl})` } : undefined} aria-hidden />
                <div className="p-5">
                  <h3 className="font-bold leading-snug group-hover:text-primary">{p.title}</h3>
                  {p.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">{p.readMinutes} min read</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

async function SeoBlock() {
  const { homepage } = await getSettings();
  return (
    <section className="py-14" aria-labelledby="about-heading">
      <Container className="max-w-4xl">
        <h2 id="about-heading" className="mb-4 text-2xl font-bold">
          {BRAND_NAME}: a free US business directory
        </h2>
        <ReadMore html={homepage.seoText} />
      </Container>
    </section>
  );
}
