import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { sql } from "drizzle-orm";
import { getCategory } from "@/lib/data/public";
import { db } from "@/lib/db";
import { findRedirect } from "@/lib/redirects";
import { staticParams } from "@/lib/static-params";
import { BRAND_NAME } from "@/lib/site";
import { ListingSkeleton, ListingTemplate } from "@/components/search/listing-template";

export async function generateStaticParams() {
  return staticParams(
    async () => {
      const r = await db.execute(sql`
        select p.slug as parent, c.slug as child from categories c join categories p on p.id = c.parent_id
        join listing_counts lc on lc.category_id = c.id and lc.state_id is null and lc.city_id is null
        order by lc.total desc limit 100`);
      return r.rows as { parent: string; child: string }[];
    },
    [{ parent: "home-improvement-and-contractors", child: "plumbers" }],
  );
}

export async function generateMetadata({ params, searchParams }: PageProps<"/category/[parent]/[child]">): Promise<Metadata> {
  const [{ parent, child }, sp] = await Promise.all([params, searchParams]);
  const cat = await getCategory(child);
  if (!cat || cat.parent?.slug !== parent) return { title: "Category not found" };
  const page = Number(sp.page) > 1 ? Number(sp.page) : 1;
  const path = `/category/${parent}/${child}${page > 1 ? `?page=${page}` : ""}`;
  return {
    title: cat.metaTitle || `${cat.name} Near You${page > 1 ? ` (Page ${page})` : ""}`,
    description: cat.metaDescription || `Compare local ${cat.name.toLowerCase()}: ratings, reviews, hours and phone numbers. Find the right ${cat.name.toLowerCase()} on ${BRAND_NAME}.`,
    // Self-referencing canonical, including ?page=N.
    alternates: { canonical: path },
    robots: Object.keys(sp).some((k) => k !== "page") ? { index: false, follow: true } : undefined,
  };
}

export default function ChildCategoryPage({ params, searchParams }: PageProps<"/category/[parent]/[child]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ChildCategory params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ChildCategory({ params, searchParams }: Pick<PageProps<"/category/[parent]/[child]">, "params" | "searchParams">) {
  const [{ parent, child }, sp] = await Promise.all([params, searchParams]);
  const cat = await getCategory(child);
  if (!cat || !cat.parent) {
    const to = await findRedirect(`/category/${parent}/${child}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  if (cat.parent.slug !== parent) permanentRedirect(`/category/${cat.parent.slug}/${cat.slug}`);
  return (
    <ListingTemplate
      scope={{ category: { id: cat.id, slug: cat.slug, name: cat.name, parent: cat.parent } }}
      searchParams={sp}
      basePath={`/category/${parent}/${child}`}
      crumbs={[{ name: "Categories", href: "/categories" }, { name: cat.parent.name, href: `/categories/${cat.parent.slug}` }, { name: cat.name }]}
      heading={({ category, place }) => (place ? `${category} in ${place}` : `${category} near you`)}
      intro={cat.intro ? <p>{cat.intro}</p> : undefined}
    />
  );
}
