import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { ArrowRight, BadgeCheck, Building2, LayoutGrid, MessagesSquare, Star } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { getCategoryTree, getRecentActivity, getRecentlyReviewed, getSiteStats, getStates } from "@/lib/data/public";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { BRAND_NAME, absoluteUrl } from "@/lib/site";
import { SearchBar } from "@/components/search/search-bar";
import { BusinessCard } from "@/components/listing/business-card";
import { CategoryIcon } from "@/components/listing/category-icon";
import { ActivityCard } from "@/components/home/activity-card";
import { Button } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/json-ld";
import { ReadMore } from "@/components/listing/read-more";

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "Organization", name: BRAND_NAME, url: absoluteUrl("/"), logo: absoluteUrl("/icon") },
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
      <CategoryGrid />
      <section className="py-16" aria-labelledby="activity-heading">
        <Container>
          <SectionHeader id="activity-heading" title="Recent activity" subtitle="Fresh reviews from customers across the country." href="/search?sort=recent_reviews" linkLabel="More recently reviewed" />
          <Suspense fallback={<CardGridSkeleton />}>
            <RecentActivity />
          </Suspense>
        </Container>
      </section>
      <BrowseStates />
      <TopProsHighlights />
      <OwnerCta />
      <LatestPosts />
      <SeoBlock />
    </>
  );
}

function SectionHeader({ id, title, subtitle, href, linkLabel }: { id: string; title: string; subtitle?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-primary hover:underline">
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

async function Hero() {
  const [{ homepage }, stats] = await Promise.all([getSettings(), getSiteStats()]);
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <SafeImage
        src={homepage.heroImageUrl ?? "https://picsum.photos/seed/city-skyline/1920/900"}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
        fallback={null}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/85 via-slate-950/70 to-slate-950/90" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-blue-950/60 to-transparent" aria-hidden />
      <Container className="flex flex-col items-center pb-16 pt-20 text-center sm:pb-24 sm:pt-28">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-blue-100 ring-1 ring-white/20 backdrop-blur">
          <Star className="size-4 fill-rating text-rating" aria-hidden />
          {compact.format(stats.reviews)} reviews of {compact.format(stats.listings)} local businesses
        </p>
        <h1 className="max-w-4xl text-[2.5rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
          Find local businesses <span className="text-blue-300">people actually recommend</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-200">Search plumbers, restaurants, salons and more in all 50 states. Read real reviews, check hours, then call or message in one tap.</p>
        <div className="mt-9 w-full max-w-3xl">
          <Suspense fallback={<Skeleton className="h-16 w-full rounded-full" />}>
            <SearchBar variant="hero" />
          </Suspense>
        </div>
        {homepage.heroChips.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-slate-300">Popular:</span>
            <ul className="contents" aria-label="Popular searches">
              {homepage.heroChips.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white hover:text-ink">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <dl className="mt-12 grid w-full max-w-3xl grid-cols-3 divide-x divide-white/15 rounded-xl bg-white/5 py-4 ring-1 ring-white/10 backdrop-blur">
          {[
            [stats.listings, "Businesses"],
            [stats.cities, "Cities"],
            [stats.categories, "Categories"],
          ].map(([value, label]) => (
            <div key={label} className="px-2">
              <dt className="text-xs text-slate-300 sm:text-sm">{label}</dt>
              <dd className="font-heading text-xl font-bold tabular-nums sm:text-2xl">{Number(value).toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

async function CategoryGrid() {
  const [{ homepage }, tree] = await Promise.all([getSettings(), getCategoryTree()]);
  const featured = homepage.featuredCategories.map((slug) => tree.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => !!c);
  const fill = tree.filter((c) => !featured.includes(c)).sort((a, b) => b.count - a.count);
  const tiles = [...featured, ...fill].slice(0, 11);
  return (
    <section className="border-b border-border bg-surface py-16" aria-labelledby="cats-heading">
      <Container>
        <SectionHeader id="cats-heading" title="Browse by category" subtitle="Start with what you need. We'll show the best-rated options." href="/categories" linkLabel="All categories" />
        <ul className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {tiles.map((c) => (
            <li key={c.id}>
              <Link
                href={`/categories/${c.slug}`}
                className="group flex h-full flex-col items-center gap-3 rounded-xl border border-border bg-card px-3 py-6 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover"
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <CategoryIcon name={c.icon} className="size-7" />
                </span>
                <span className="text-sm font-semibold leading-snug">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.count.toLocaleString("en-US")} listings</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/categories"
              className="group flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-3 py-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                <LayoutGrid className="size-7" aria-hidden />
              </span>
              <span className="text-sm font-semibold">More categories</span>
              <span className="text-xs text-muted-foreground">{tree.length} in total</span>
            </Link>
          </li>
        </ul>
      </Container>
    </section>
  );
}

async function RecentActivity() {
  const activity = await getRecentActivity(9);
  if (activity.length >= 3) {
    return (
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {activity.map((a) => (
          <li key={a.id}>
            <ActivityCard a={a} />
          </li>
        ))}
      </ul>
    );
  }
  // Too few reviews for a feed yet: show recently reviewed businesses instead.
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
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-96 rounded-xl" />
      ))}
    </div>
  );
}

async function BrowseStates() {
  const [{ homepage }, states] = await Promise.all([getSettings(), getStates()]);
  const featured = homepage.featuredStates.map((slug) => states.find((s) => s.slug === slug)).filter((s): s is NonNullable<typeof s> => !!s);
  return (
    <section className="bg-surface py-16" aria-labelledby="states-heading">
      <Container>
        <SectionHeader id="states-heading" title="Browse by state" subtitle="Local businesses in every state, city and town." href="/states" linkLabel="All 50 states" />
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((st) => (
            <li key={st.id}>
              <Link href={`/states/${st.slug}`} className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white transition-colors group-hover:bg-primary dark:bg-slate-700">{st.code}</span>
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

const OWNER_POINTS = [
  { icon: Building2, title: "List free in minutes", text: "Add hours, photos, services and a description." },
  { icon: BadgeCheck, title: "Get verified", text: "Confirm ownership by SMS, email or document." },
  { icon: MessagesSquare, title: "Win more customers", text: "Get calls and quote requests, and reply to reviews." },
];

function OwnerCta() {
  return (
    <section className="py-16" aria-labelledby="owner-heading">
      <Container>
        <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-900 px-6 py-10 text-white shadow-card-hover sm:px-10 sm:py-12">
          <div className="absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">For business owners</p>
              <h2 id="owner-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Is your business on {BRAND_NAME}?
              </h2>
              <p className="mt-3 max-w-lg text-blue-100">Claim your free listing so customers searching nearby can find you, read your reviews and get in touch.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="white">
                  <Link href="/dashboard/businesses/new">Get a free listing</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-white ring-1 ring-white/40 hover:bg-white/10 hover:text-white">
                  <Link href="/pricing">See plans</Link>
                </Button>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {OWNER_POINTS.map((p) => (
                <li key={p.title} className="flex gap-4 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                    <p.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-sm text-blue-100">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
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
    <section className="py-16" aria-labelledby="pros-heading">
      <Container>
        <SectionHeader id="pros-heading" title="Top Pros near you" subtitle="Hand-picked, top-rated businesses by city." href="/top-pros" linkLabel="All Top Pros" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((p) => (
            <li key={p.slug}>
              <Link href={`/top-pros/${p.slug}`} className="group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950">
                  <Star className="size-4 fill-rating text-rating" aria-hidden />
                </span>
                <span className="font-semibold leading-snug group-hover:text-primary">{p.title}</span>
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
    <section className="bg-surface py-16" aria-labelledby="blog-heading">
      <Container>
        <SectionHeader id="blog-heading" title="From the blog" href="/blog" linkLabel="All articles" />
        <ul className="grid gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <li key={p.slug} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <Link href={`/blog/${p.slug}`} className="group block">
                <div className="relative aspect-[16/9] bg-muted">
                  {p.coverUrl ? <SafeImage src={p.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" fallback={<span className="absolute inset-0 bg-gradient-to-br from-primary to-blue-900" aria-hidden />} /> : <span className="absolute inset-0 bg-gradient-to-br from-primary to-blue-900" aria-hidden />}
                </div>
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
    <section className="py-16" aria-labelledby="about-heading">
      <Container className="max-w-4xl">
        <h2 id="about-heading" className="mb-4 text-2xl font-bold">
          {BRAND_NAME}: a free US business directory
        </h2>
        <ReadMore html={homepage.seoText} />
      </Container>
    </section>
  );
}
