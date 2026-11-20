import Link from "next/link";
import { List, Map as MapIcon, Maximize2, SearchX } from "lucide-react";
import { getCategoryTree, getListings, getNearbyCities, getReviewSnippets, getStates, getTopCities } from "@/lib/data/public";
import { resolveFilters, type ListingScope } from "@/lib/data/listing";
import { searchBusinesses } from "@/lib/search";
import { parseSearchParams, type RawSearchParams } from "@/lib/validations/search";
import { PAGE_SIZE, absoluteUrl } from "@/lib/site";
import { pluralize } from "@/lib/text";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { BusinessCard } from "@/components/listing/business-card";
import { ResultRow } from "@/components/listing/result-row";
import { Pagination } from "@/components/listing/pagination";
import { Button } from "@/components/ui/button";
import { Container, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ActiveFilters, FilterBar, type FilterOptions } from "./filters";
import { MapView } from "./map-view";
import { LoadMore } from "./load-more";
import { HoverRow, ResultsHoverProvider, ResultsMap } from "./results-map";

/** Height of the sticky site header (h-16) plus the sticky filter row. */
const STICKY_OFFSET = "lg:top-[8.5rem]";

/**
 * One shared template for /search, subcategory, state, city and city + category pages.
 * Rendered inside <Suspense> by each page (it reads searchParams).
 *
 * Views: default is a numbered result list with a sticky map (split view on desktop);
 * `view=grid` shows cards; `view=map` is the full map that searches as you move it.
 */
export async function ListingTemplate({
  scope,
  searchParams,
  basePath,
  heading,
  crumbs,
  intro,
  dynamic = false,
}: {
  scope: ListingScope;
  searchParams: RawSearchParams;
  basePath: string;
  heading: (ctx: { category?: string; place?: string }) => string;
  crumbs: Crumb[];
  intro?: React.ReactNode;
  /** /search: uncached query. Directory pages use the cached getListings. */
  dynamic?: boolean;
}) {
  const p = parseSearchParams(searchParams);
  const rawView = Array.isArray(searchParams.view) ? searchParams.view[0] : searchParams.view;
  const view: "list" | "grid" | "map" = rawView === "grid" || rawView === "map" ? rawView : "list";
  const { input, labels, center, category, state, city, locationLabel, hasLocation } = await resolveFilters(scope, p, PAGE_SIZE);

  const [{ items, total }, tree, states, cities] = await Promise.all([
    dynamic ? searchBusinesses(input) : getListings(input),
    getCategoryTree(),
    getStates(),
    state && !scope.city ? getTopCities(state.id, 200) : Promise.resolve([]),
  ]);
  const snippets = view === "list" && items.length ? await getReviewSnippets(items.map((b) => b.id)) : {};

  const place = city ? `${city.name}, ${state?.code ?? ""}`.replace(/, $/, "") : state ? state.name : locationLabel;
  const h1 = heading({ category: category?.name, place });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showDistance = hasLocation;
  const firstIndex = (p.page - 1) * PAGE_SIZE;

  const options: FilterOptions = {
    categories: tree.map((c) => ({ slug: c.slug, name: c.name, count: c.count, children: c.children })),
    states: states.map((s) => ({ slug: s.slug, name: s.name, code: s.code })),
    cities: cities.map((c) => ({ slug: c.slug, name: c.name })),
    locked: { category: !!scope.category, state: !!scope.state, city: !!scope.city },
    hasLocation,
  };

  const scopeParams: Record<string, string> = {};
  if (scope.category) scopeParams.scopeCategory = scope.category.slug;
  if (scope.state) scopeParams.scopeState = scope.state.slug;
  if (scope.city) scopeParams.scopeCity = scope.city.slug;

  const current = pickParams(searchParams);
  const hrefWith = (changes: Record<string, string | null>) => {
    const qs = new URLSearchParams(current);
    for (const [k, v] of Object.entries(changes)) {
      if (v == null) qs.delete(k);
      else qs.set(k, v);
    }
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const hrefFor = (page: number) => {
    const qs = new URLSearchParams(current);
    if (page > 1) qs.set("page", String(page));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const pageInfo = total > 0 ? `${(firstIndex + 1).toLocaleString("en-US")}–${Math.min(firstIndex + items.length, total).toLocaleString("en-US")} of ${pluralize(total, "result")}` : "No results";

  return (
    <>
      <Container className="grid gap-3 pb-1 pt-5">
        <Breadcrumbs items={crumbs} />
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{h1}</h1>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pageInfo}
          </p>
        </div>
        {intro && p.page === 1 && <div className="max-w-3xl text-muted-foreground">{intro}</div>}
      </Container>

      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <Container>
          <FilterBar options={options} total={total} />
        </Container>
      </div>

      <Container className="grid gap-5 py-5">
        <ActiveFilters labels={labels} />

        {view === "map" ? (
          <>
            <MapView initialItems={items} center={[center.lat, center.lng]} zoom={center.zoom} scope={{ categoryId: input.categoryId }} />
            <FloatingToggle href={hrefWith({ view: null })} label="Show list" icon="list" />
          </>
        ) : items.length === 0 ? (
          <NoResults lat={city?.lat ?? state?.lat ?? center.lat} lng={city?.lng ?? state?.lng ?? center.lng} excludeCityId={city?.id} categoryName={category?.name} tree={tree} categorySlug={category?.slug} />
        ) : view === "grid" ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((b, i) => (
                <BusinessCard key={b.id} b={b} layout="grid" showDistance={showDistance} priority={i < 2} />
              ))}
            </div>
            <div className="hidden sm:block">
              <Pagination page={p.page} totalPages={totalPages} hrefFor={hrefFor} />
            </div>
            <LoadMore startPage={p.page} totalPages={totalPages} scope={scopeParams} layout="grid" showDistance={showDistance} />
          </>
        ) : (
          <ResultsHoverProvider>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,42%)] xl:grid-cols-[minmax(0,1fr)_minmax(380px,44%)]">
              <div className="grid min-w-0 content-start gap-4">
                <h2 className="sr-only">Results</h2>
                <ol className="grid gap-4">
                  {items.map((b, i) => (
                    <li key={b.id}>
                      <HoverRow id={b.id}>
                        <ResultRow b={b} index={firstIndex + i + 1} snippet={snippets[b.id]} showDistance={showDistance} priority={i < 2} />
                      </HoverRow>
                    </li>
                  ))}
                </ol>
                <div className="hidden sm:block">
                  <Pagination page={p.page} totalPages={totalPages} hrefFor={hrefFor} />
                </div>
                <LoadMore startPage={p.page} totalPages={totalPages} scope={scopeParams} layout="list" showDistance={showDistance} perPage={PAGE_SIZE} />
              </div>

              <aside className="hidden lg:block" aria-label="Map of these results">
                <div className={`sticky ${STICKY_OFFSET} h-[calc(100dvh-10rem)] min-h-[420px] overflow-hidden rounded-xl border border-border bg-muted shadow-card`}>
                  <ResultsMap items={items} center={[center.lat, center.lng]} zoom={center.zoom} startIndex={firstIndex + 1} />
                  <Link
                    href={hrefWith({ view: "map", page: null })}
                    className="absolute right-3 top-3 z-[500] inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-sm font-semibold text-foreground shadow-card-hover ring-1 ring-border hover:bg-muted"
                  >
                    <Maximize2 className="size-4" aria-hidden /> Search this area
                  </Link>
                </div>
              </aside>
            </div>
            <FloatingToggle href={hrefWith({ view: "map", page: null })} label="Show map" icon="map" />
          </ResultsHoverProvider>
        )}

        <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-8 text-center text-white dark:to-brand-deep sm:flex-row sm:text-left">
          <div>
            <h2 className="text-xl font-bold">Own a business in this list?</h2>
            <p className="text-purple-100">Claim or add your listing free and start getting calls and messages from local customers.</p>
          </div>
          <Button asChild variant="white" size="lg">
            <Link href="/dashboard/businesses/new">List your business</Link>
          </Button>
        </div>
      </Container>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: h1,
          numberOfItems: total,
          itemListElement: items.map((b, i) => ({
            "@type": "ListItem",
            position: firstIndex + i + 1,
            url: absoluteUrl(`/biz/${b.slug}`),
            name: b.name,
          })),
        }}
      />
    </>
  );
}

/** Mobile list/map switch, floating above the content. */
function FloatingToggle({ href, label, icon }: { href: string; label: string; icon: "map" | "list" }) {
  const Icon = icon === "map" ? MapIcon : List;
  return (
    <Link
      href={href}
      scroll={false}
      className="fixed bottom-5 left-1/2 z-40 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-card-hover ring-1 ring-white/10 hover:bg-slate-800 lg:hidden"
    >
      <Icon className="size-4" aria-hidden /> {label}
    </Link>
  );
}

function pickParams(sp: RawSearchParams) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value && k !== "page") out[k] = value;
  }
  return out;
}

async function NoResults({
  lat,
  lng,
  excludeCityId,
  categoryName,
  categorySlug,
  tree,
}: {
  lat: number;
  lng: number;
  excludeCityId?: string;
  categoryName?: string;
  categorySlug?: string;
  tree: Awaited<ReturnType<typeof getCategoryTree>>;
}) {
  const nearby = await getNearbyCities(lat, lng, excludeCityId, 8);
  const parent = tree.find((t) => t.slug === categorySlug || t.children.some((c) => c.slug === categorySlug));
  const related = (parent?.children ?? tree.slice(0, 8)).filter((c) => c.slug !== categorySlug && c.count > 0).slice(0, 8);
  return (
    <div className="grid gap-6">
      <EmptyState
        icon={<SearchX />}
        title="No businesses match these filters"
        description={`Try removing a filter, searching a nearby city${categoryName ? `, or a related category to ${categoryName}` : ""}.`}
        action={
          <Button asChild>
            <Link href="/dashboard/businesses/new">List your business free</Link>
          </Button>
        }
      />
      {nearby.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold">Nearby cities</h2>
          <ul className="flex flex-wrap gap-2">
            {nearby.map((c) => (
              <li key={c.id}>
                <Link href={categorySlug ? `/states/${c.state_slug}/${c.slug}/${categorySlug}` : `/states/${c.state_slug}/${c.slug}`} className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                  {c.name}, {c.code}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold">Related categories</h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((c) => (
              <li key={c.slug}>
                <Link href={`/search?category=${c.slug}`} className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <Container className="grid gap-5 py-6" aria-busy="true" aria-label="Loading results">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-9 w-96 max-w-full" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_42%]">
        <div className="grid gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
        <Skeleton className="hidden h-[70dvh] rounded-xl lg:block" />
      </div>
    </Container>
  );
}
