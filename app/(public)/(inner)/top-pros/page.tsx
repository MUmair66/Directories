import Link from "next/link";
import { getLatestTopPros, getTopProsStates } from "@/lib/data/content";
import { pageMeta } from "@/lib/meta";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container } from "@/components/ui/primitives";
import { PageHero } from "@/components/content/blocks";
import { TopProsLinkList } from "@/components/content/top-pros";
import { cn } from "@/lib/utils";

export const metadata = pageMeta({
  title: "Top Pros: The Best Local Businesses by City",
  description: `Hand-picked lists of the best-rated local businesses in every state and city, curated by the ${BRAND_NAME} team.`,
  path: "/top-pros",
});

export default async function TopProsIndex() {
  const [states, latest] = await Promise.all([getTopProsStates(), getLatestTopPros(9)]);
  return (
    <>
      <PageHero top={<Breadcrumbs items={[{ name: "Top Pros" }]} />} title="Top Pros" subtitle="The best-rated local businesses, ranked city by city. Choose a state to get started." />
      <Container className="grid gap-14 py-12">
        <section aria-labelledby="states-heading">
          <h2 id="states-heading" className="mb-6 text-2xl font-bold">
            Browse by state
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {states.map((st) => (
              <li key={st.id}>
                <Link
                  href={`/top-pros/${st.slug}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary",
                    st.count === 0 && "opacity-70",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-md bg-ink text-xs font-bold text-white">{st.code}</span>
                    <span className="font-medium">{st.name}</span>
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">{st.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        {latest.length > 0 && (
          <section aria-labelledby="latest-heading">
            <h2 id="latest-heading" className="mb-6 text-2xl font-bold">
              Latest lists
            </h2>
            <TopProsLinkList items={latest} />
          </section>
        )}
      </Container>
    </>
  );
}
