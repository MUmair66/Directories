import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  getRelatedTopPros,
  getTopProsArticle,
  getTopProsCities,
  getTopProsSlugs,
  getTopProsState,
} from "@/lib/data/content";
import { STATES } from "@/db/seed/states";
import { pageMeta } from "@/lib/meta";
import { slugify } from "@/lib/text";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/content/blocks";
import { TopProsArticle } from "@/components/content/top-pros";

/**
 * One dynamic segment serves two page types:
 *   /top-pros/[state]  -> list of cities with Top Pros lists (state slugs are checked first)
 *   /top-pros/[slug]   -> a "Best [Category] in [City], [ST]" article
 * Article slugs look like "best-plumbers-in-chicago-il", so they never collide with state slugs.
 */
export async function generateStaticParams() {
  const states = STATES.map((s) => ({ state: slugify(s.name) }));
  try {
    return [...states, ...(await getTopProsSlugs(100)).map((slug) => ({ state: slug }))];
  } catch {
    return states;
  }
}

export async function generateMetadata({ params }: PageProps<"/top-pros/[state]">): Promise<Metadata> {
  const { state: slug } = await params;
  const state = await getTopProsState(slug);
  if (state) {
    return pageMeta({
      title: `Top Pros in ${state.name}`,
      description: `The best-rated local businesses in ${state.name}, ranked city by city.`,
      path: `/top-pros/${slug}`,
    });
  }
  const article = await getTopProsArticle(slug);
  if (!article) return { title: "Not found", robots: { index: false } };
  const { page } = article;
  return pageMeta({
    title: page.metaTitle || page.title,
    description: page.metaDescription || `${page.title}: ranked by ratings, reviews and verified details.`,
    path: `/top-pros/${slug}`,
    image: page.coverUrl,
    type: "article",
  });
}

async function Content({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params;
  const state = await getTopProsState(slug);
  if (state) {
    const cities = await getTopProsCities(state.id);
    return (
      <>
        <PageHero top={<Breadcrumbs items={[{ name: "Top Pros", href: "/top-pros" }, { name: state.name }]} />} title={`Top Pros in ${state.name}`} subtitle="Choose a city to see our ranked lists of the best local businesses." />
        <Container className="py-12">
          {cities.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {cities.map((c) => (
                <li key={c.id}>
                  <Link href={`/top-pros/${state.slug}/${c.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary">
                    <span className="flex items-center gap-2 font-medium">
                      <MapPin className="size-4 text-primary" aria-hidden /> {c.name}
                    </span>
                    <span className="text-sm text-muted-foreground">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={`No Top Pros lists in ${state.name} yet`}
              description="Browse every business in this state while we put our lists together."
              action={
                <Button asChild>
                  <Link href={`/states/${state.slug}`}>Browse {state.name} businesses</Link>
                </Button>
              }
            />
          )}
        </Container>
      </>
    );
  }

  const article = await getTopProsArticle(slug);
  if (!article) notFound();
  const related = await getRelatedTopPros({ id: article.page.id, cityId: article.page.cityId, categoryId: article.page.categoryId });
  return <TopProsArticle data={article} related={related} />;
}

export default function TopProsStateOrArticle({ params }: PageProps<"/top-pros/[state]">) {
  return (
    <Suspense
      fallback={
        <Container className="grid gap-4 py-12">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </Container>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
