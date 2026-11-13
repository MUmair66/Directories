import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopProsCity, getTopProsForCity } from "@/lib/data/content";
import { pageMeta } from "@/lib/meta";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/content/blocks";
import { TopProsLinkList } from "@/components/content/top-pros";

export async function generateMetadata({ params }: PageProps<"/top-pros/[state]/[city]">): Promise<Metadata> {
  const { state, city } = await params;
  const r = await getTopProsCity(state, city);
  if (!r) return { title: "Not found", robots: { index: false } };
  return pageMeta({
    title: `Top Pros in ${r.city.name}, ${r.state.code}`,
    description: `Ranked lists of the best local businesses in ${r.city.name}, ${r.state.code}, by category.`,
    path: `/top-pros/${state}/${city}`,
  });
}

async function Content({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state, city } = await params;
  const r = await getTopProsCity(state, city);
  if (!r) notFound();
  const pages = await getTopProsForCity(r.city.id);
  return (
    <>
      <PageHero
        top={
          <Breadcrumbs
            items={[
              { name: "Top Pros", href: "/top-pros" },
              { name: r.state.name, href: `/top-pros/${r.state.slug}` },
              { name: r.city.name },
            ]}
          />
        }
        title={`Top Pros in ${r.city.name}, ${r.state.code}`}
        subtitle="Pick a category to see our ranked list."
      />
      <Container className="py-12">
        {pages.length ? (
          <TopProsLinkList items={pages} />
        ) : (
          <EmptyState
            title={`No lists for ${r.city.name} yet`}
            description="Browse every business in this city in the meantime."
            action={
              <Button asChild>
                <Link href={`/states/${r.state.slug}/${r.city.slug}`}>Browse {r.city.name} businesses</Link>
              </Button>
            }
          />
        )}
      </Container>
    </>
  );
}

export default function TopProsCityPage({ params }: PageProps<"/top-pros/[state]/[city]">) {
  return (
    <Suspense
      fallback={
        <Container className="grid gap-4 py-12">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-48 w-full" />
        </Container>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
