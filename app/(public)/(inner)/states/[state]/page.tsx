import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { getCategoryTree, getCount, getListings, getState, getTopCities } from "@/lib/data/public";
import { STATES } from "@/db/seed/states";
import { slugify } from "@/lib/text";
import { findRedirect } from "@/lib/redirects";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container, Skeleton } from "@/components/ui/primitives";
import { CategoryTiles, ListingCta, NewestBusinesses, ScopedSearch, WhyUs } from "@/components/listing/directory-sections";
import { ReadMore } from "@/components/listing/read-more";

export function generateStaticParams() {
  // States are a fixed set: prerender all of them.
  return STATES.map((s) => ({ state: slugify(s.name) }));
}

export async function generateMetadata({ params }: PageProps<"/states/[state]">): Promise<Metadata> {
  const { state } = await params;
  const st = await getState(state);
  if (!st) return { title: "State not found" };
  return {
    title: st.metaTitle || `${st.name} Business Directory`,
    description: st.metaDescription || `Find trusted local businesses in ${st.name}. Browse cities and categories, compare reviews and contact businesses on ${BRAND_NAME}.`,
    alternates: { canonical: `/states/${st.slug}` },
  };
}

export default function StatePage({ params }: PageProps<"/states/[state]">) {
  return (
    <Suspense fallback={<Container className="py-8"><Skeleton className="h-96" /></Container>}>
      <StateDirectory params={params} />
    </Suspense>
  );
}

async function StateDirectory({ params }: { params: PageProps<"/states/[state]">["params"] }) {
  const { state } = await params;
  const st = await getState(state);
  if (!st) {
    const to = await findRedirect(`/states/${state}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  const [cities, tree, newest, total] = await Promise.all([
    getTopCities(st.id, 48),
    getCategoryTree({ stateId: st.id }),
    getListings({ stateId: st.id, sort: "newest", perPage: 6 }),
    getCount({ stateId: st.id }),
  ]);
  const popular = tree
    .flatMap((p) => p.children.map((c) => ({ ...c, icon: p.icon })))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return (
    <Container className="grid gap-12 py-8">
      <div className="grid gap-4">
        <Breadcrumbs items={[{ name: "States", href: "/states" }, { name: st.name }]} />
        <h1 className="text-3xl font-bold">{st.name} Business Directory</h1>
        <p className="text-muted-foreground">{total.toLocaleString("en-US")} businesses listed in {st.name}.</p>
        <ScopedSearch where={st.name} />
      </div>

      {cities.length > 0 && (
        <section aria-labelledby="cities-heading">
          <h2 id="cities-heading" className="mb-5 text-2xl font-bold">
            Top cities in {st.name}
          </h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {cities.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 border-b border-border py-2 text-sm">
                <Link href={`/states/${st.slug}/${c.slug}`} className="truncate font-medium hover:text-primary">
                  {c.name}
                </Link>
                <span className="tabular-nums text-muted-foreground">{c.count.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CategoryTiles title={`Popular categories in ${st.name}`} items={popular} hrefFor={(slug) => `/search?category=${slug}&state=${st.slug}`} />
      <NewestBusinesses title={`New businesses in ${st.name}`} items={newest.items} moreHref={`/search?state=${st.slug}&sort=newest`} />
      <ListingCta place={st.name} />
      <WhyUs />
      {st.intro && (
        <section aria-label={`About businesses in ${st.name}`} className="max-w-4xl">
          <ReadMore html={st.intro} />
        </section>
      )}
    </Container>
  );
}
