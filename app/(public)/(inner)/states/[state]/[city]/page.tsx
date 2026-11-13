import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { sql } from "drizzle-orm";
import { getCategoryTree, getCity, getCount, getListings, getNearbyCities } from "@/lib/data/public";
import { db } from "@/lib/db";
import { findRedirect } from "@/lib/redirects";
import { staticParams } from "@/lib/static-params";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container, Skeleton } from "@/components/ui/primitives";
import { CategoryTiles, ListingCta, NewestBusinesses, ScopedSearch, WhyUs } from "@/components/listing/directory-sections";
import { ReadMore } from "@/components/listing/read-more";

export async function generateStaticParams() {
  return staticParams(
    async () => {
      const r = await db.execute(sql`
        select s.slug as state, c.slug as city from listing_counts lc
        join cities c on c.id = lc.city_id join states s on s.id = c.state_id
        where lc.category_id is null and lc.city_id is not null
        order by lc.total desc limit 200`);
      return r.rows as { state: string; city: string }[];
    },
    [{ state: "illinois", city: "chicago" }],
  );
}

export async function generateMetadata({ params }: PageProps<"/states/[state]/[city]">): Promise<Metadata> {
  const { state, city } = await params;
  const r = await getCity(state, city);
  if (!r) return { title: "City not found" };
  const count = await getCount({ cityId: r.city.id });
  return {
    title: r.city.metaTitle || `${r.city.name}, ${r.state.code} Business Directory`,
    description: r.city.metaDescription || `Find local businesses in ${r.city.name}, ${r.state.code}. Compare ratings, hours and reviews, and contact businesses directly on ${BRAND_NAME}.`,
    alternates: { canonical: `/states/${state}/${city}` },
    // Cities with no listings are thin pages.
    robots: count === 0 ? { index: false, follow: true } : undefined,
  };
}

export default function CityPage({ params }: PageProps<"/states/[state]/[city]">) {
  return (
    <Suspense fallback={<Container className="py-8"><Skeleton className="h-96" /></Container>}>
      <CityDirectory params={params} />
    </Suspense>
  );
}

async function CityDirectory({ params }: { params: PageProps<"/states/[state]/[city]">["params"] }) {
  const { state, city } = await params;
  const r = await getCity(state, city);
  if (!r) {
    const to = await findRedirect(`/states/${state}/${city}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  const { city: c, state: st } = r;
  const place = `${c.name}, ${st.code}`;
  const [tree, newest, total, nearby] = await Promise.all([
    getCategoryTree({ cityId: c.id }),
    getListings({ cityId: c.id, sort: "newest", perPage: 6 }),
    getCount({ cityId: c.id }),
    getNearbyCities(c.lat, c.lng, c.id, 12),
  ]);
  const tiles = tree
    .flatMap((p) => p.children.map((ch) => ({ ...ch, icon: p.icon })))
    .filter((ch) => ch.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 16);

  return (
    <Container className="grid gap-12 py-8">
      <div className="grid gap-4">
        <Breadcrumbs items={[{ name: "States", href: "/states" }, { name: st.name, href: `/states/${st.slug}` }, { name: c.name }]} />
        <h1 className="text-3xl font-bold">{place} Business Directory</h1>
        <p className="text-muted-foreground">{total.toLocaleString("en-US")} businesses listed in {c.name}.</p>
        <ScopedSearch where={place} />
      </div>

      <CategoryTiles title={`Browse ${c.name} businesses by category`} items={tiles} hrefFor={(slug) => `/states/${st.slug}/${c.slug}/${slug}`} />
      <NewestBusinesses title={`New businesses in ${c.name}`} items={newest.items} moreHref={`/search?state=${st.slug}&city=${c.slug}&sort=newest`} />
      <ListingCta place={place} />
      <WhyUs />

      {nearby.length > 0 && (
        <section aria-labelledby="nearby-heading">
          <h2 id="nearby-heading" className="mb-4 text-2xl font-bold">
            Nearby cities
          </h2>
          <ul className="flex flex-wrap gap-2">
            {nearby.map((n) => (
              <li key={n.id}>
                <Link href={`/states/${n.state_slug}/${n.slug}`} className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                  {n.name}, {n.code}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.intro && (
        <section aria-label={`About ${c.name}`} className="max-w-4xl">
          <ReadMore html={c.intro} />
        </section>
      )}
    </Container>
  );
}
