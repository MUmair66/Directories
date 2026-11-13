import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ListingSkeleton, ListingTemplate } from "@/components/search/listing-template";
import { parseSearchParams } from "@/lib/validations/search";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const p = parseSearchParams(await searchParams);
  const what = p.q ? `"${p.q}"` : "Businesses";
  const where = p.location ? ` near ${p.location}` : "";
  return {
    title: `${what}${where}: Search Results`,
    description: `Search results for ${what.toLowerCase()}${where}. Compare ratings, hours and reviews, then call or message directly.`,
    // Search query pages are never indexed.
    robots: { index: false, follow: true },
    alternates: { canonical: "/search" },
  };
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchResults({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  await connection(); // results are per-request (never prerendered)
  return (
    <ListingTemplate
      dynamic
      scope={{}}
      searchParams={sp}
      basePath="/search"
      crumbs={[{ name: "Search" }]}
      heading={({ category, place }) => {
        const q = typeof sp.q === "string" ? sp.q : undefined;
        const what = category ?? (q ? `“${q}”` : "Businesses");
        return place ? `${what} in ${place}` : what === "Businesses" ? "All businesses" : `${what} results`;
      }}
    />
  );
}
