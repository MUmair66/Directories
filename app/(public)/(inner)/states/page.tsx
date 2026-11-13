import type { Metadata } from "next";
import Link from "next/link";
import { getStates } from "@/lib/data/public";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Business Directory by State",
  description: `Browse local businesses in all 50 states and Washington, D.C. on ${BRAND_NAME}.`,
  alternates: { canonical: "/states" },
};

export default async function StatesPage() {
  const states = await getStates();
  return (
    <Container className="grid gap-6 py-8">
      <Breadcrumbs items={[{ name: "States" }]} />
      <div>
        <h1 className="text-3xl font-bold">Browse by state</h1>
        <p className="mt-1 text-muted-foreground">All 50 states and Washington, D.C.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {states.map((st) => (
          <li key={st.id}>
            <Link href={`/states/${st.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-bold text-white">{st.code}</span>
                <span className="truncate font-medium">{st.name}</span>
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">{st.count.toLocaleString("en-US")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
