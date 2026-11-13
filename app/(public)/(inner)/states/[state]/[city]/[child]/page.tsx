import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { sql } from "drizzle-orm";
import { getCategory, getCity, getCount } from "@/lib/data/public";
import { db } from "@/lib/db";
import { staticParams } from "@/lib/static-params";
import { BRAND_NAME } from "@/lib/site";
import { ListingSkeleton, ListingTemplate } from "@/components/search/listing-template";

const THIN_PAGE_MIN = 3;

export async function generateStaticParams() {
  return staticParams(
    async () => {
      const r = await db.execute(sql`
        select s.slug as state, ci.slug as city, cat.slug as child from listing_counts lc
        join cities ci on ci.id = lc.city_id join states s on s.id = ci.state_id
        join categories cat on cat.id = lc.category_id and cat.parent_id is not null
        where lc.total >= ${THIN_PAGE_MIN}
        order by lc.total desc limit 300`);
      return r.rows as { state: string; city: string; child: string }[];
    },
    [{ state: "illinois", city: "chicago", child: "plumbers" }],
  );
}

export async function generateMetadata({ params, searchParams }: PageProps<"/states/[state]/[city]/[child]">): Promise<Metadata> {
  const [{ state, city, child }, sp] = await Promise.all([params, searchParams]);
  const [loc, cat] = await Promise.all([getCity(state, city), getCategory(child)]);
  if (!loc || !cat) return { title: "Not found" };
  const count = await getCount({ categoryId: cat.id, cityId: loc.city.id });
  const page = Number(sp.page) > 1 ? Number(sp.page) : 1;
  const place = `${loc.city.name}, ${loc.state.code}`;
  return {
    title: `${cat.name} in ${place}${page > 1 ? ` (Page ${page})` : ""}`,
    description: `Find the best ${cat.name.toLowerCase()} in ${place}. Compare ${count} local businesses by rating, reviews and hours on ${BRAND_NAME}.`,
    alternates: { canonical: `/states/${state}/${city}/${child}${page > 1 ? `?page=${page}` : ""}` },
    // noindex thin pages (fewer than 3 listings) and filtered variants.
    robots: count < THIN_PAGE_MIN || Object.keys(sp).some((k) => k !== "page") ? { index: false, follow: true } : undefined,
  };
}

export default function CityCategoryPage({ params, searchParams }: PageProps<"/states/[state]/[city]/[child]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <CityCategory params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CityCategory({ params, searchParams }: Pick<PageProps<"/states/[state]/[city]/[child]">, "params" | "searchParams">) {
  const [{ state, city, child }, sp] = await Promise.all([params, searchParams]);
  const [loc, cat] = await Promise.all([getCity(state, city), getCategory(child)]);
  if (!loc || !cat) notFound();
  return (
    <ListingTemplate
      scope={{
        category: { id: cat.id, slug: cat.slug, name: cat.name, parent: cat.parent },
        state: loc.state,
        city: loc.city,
      }}
      searchParams={sp}
      basePath={`/states/${state}/${city}/${child}`}
      crumbs={[
        { name: "States", href: "/states" },
        { name: loc.state.name, href: `/states/${loc.state.slug}` },
        { name: loc.city.name, href: `/states/${loc.state.slug}/${loc.city.slug}` },
        { name: cat.name },
      ]}
      heading={({ category, place }) => `${category} in ${place}`}
    />
  );
}
