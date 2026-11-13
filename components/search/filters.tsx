"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Grid3x3, List, Map as MapIcon, SlidersHorizontal, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/overlays";
import { Label, NativeSelect } from "@/components/ui/primitives";

export type FilterOptions = {
  categories: { slug: string; name: string; count: number; children: { slug: string; name: string; count: number }[] }[];
  states: { slug: string; name: string; code: string }[];
  cities?: { slug: string; name: string }[];
  /** Filters fixed by the page itself (e.g. the category on a category page) are hidden. */
  locked: { category?: boolean; state?: boolean; city?: boolean };
  hasLocation: boolean;
};

const POSTED = [
  ["", "Any time"],
  ["24h", "Last 24 hours"],
  ["3d", "Last 3 days"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
] as const;

export const SORT_LABELS: Record<string, string> = {
  relevance: "Relevance",
  rating: "Highest rated",
  reviews: "Most reviewed",
  newest: "Newest",
  name: "A to Z",
  distance: "Distance",
  recent_reviews: "Recent reviews",
};

/** Updates URL query params (resets page) without scrolling. */
function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { params, update, pending };
}

function FilterFields({ options }: { options: FilterOptions }) {
  const { params, update } = useQueryUpdater();
  const category = params.get("category") ?? "";
  const rating = params.get("rating") ?? "";

  return (
    <div className="grid gap-6">
      {!options.locked.category && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">Category</legend>
          <NativeSelect aria-label="Category" value={category} onChange={(e) => update({ category: e.target.value || null })}>
            <option value="">All categories</option>
            {options.categories.map((p) => (
              <optgroup key={p.slug} label={p.name}>
                <option value={p.slug}>All {p.name}</option>
                {p.children.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </fieldset>
      )}

      {!options.locked.state && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">State</legend>
          <NativeSelect aria-label="State" value={params.get("state") ?? ""} onChange={(e) => update({ state: e.target.value || null, city: null })}>
            <option value="">All regions</option>
            {options.states.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </fieldset>
      )}

      {!options.locked.city && options.cities && options.cities.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">City</legend>
          <NativeSelect aria-label="City" value={params.get("city") ?? ""} onChange={(e) => update({ city: e.target.value || null })}>
            <option value="">All cities</option>
            {options.cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </fieldset>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">Minimum rating</legend>
        <div className="flex flex-wrap gap-2">
          {["", "4", "3", "2"].map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={rating === r}
              onClick={() => update({ rating: r || null })}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors",
                rating === r ? "border-primary bg-secondary text-secondary-foreground" : "border-border hover:bg-muted",
              )}
            >
              {r ? (
                <>
                  {r}+ <Star className="size-3.5 fill-rating text-rating" aria-hidden />
                </>
              ) : (
                "Any"
              )}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3">
        {(
          [
            ["open_now", "Open now"],
            ["verified", "Verified only"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2.5">
            <Checkbox id={`f-${key}`} checked={params.get(key) === "1"} onCheckedChange={(v) => update({ [key]: v ? "1" : null })} />
            <Label htmlFor={`f-${key}`}>{label}</Label>
          </div>
        ))}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">Date posted</legend>
        <NativeSelect aria-label="Date posted" value={params.get("posted") ?? ""} onChange={(e) => update({ posted: e.target.value || null })}>
          {POSTED.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </fieldset>
    </div>
  );
}

/** Desktop sidebar filters. */
export function FilterSidebar({ options }: { options: FilterOptions }) {
  return (
    <aside className="hidden lg:block" aria-label="Filters">
      <div className="sticky top-36 rounded-lg border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
          <SlidersHorizontal className="size-4" aria-hidden /> Filters
        </h2>
        <FilterFields options={options} />
      </div>
    </aside>
  );
}

/** Toolbar: mobile filter drawer, sort, view toggle, reset. */
export function ListingToolbar({ options, total }: { options: FilterOptions; total: number }) {
  const { params, update, pending } = useQueryUpdater();
  const [open, setOpen] = useState(false);
  const view = params.get("view") ?? "grid";
  const sort = params.get("sort") ?? "relevance";
  const sorts = ["relevance", "rating", "reviews", "newest", "name", ...(options.hasLocation ? ["distance"] : [])];
  const views = [
    ["grid", "Grid", Grid3x3],
    ["list", "List", List],
    ["map", "Map", MapIcon],
  ] as const;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="lg:hidden">
            <SlidersHorizontal aria-hidden /> Filters
          </Button>
        </DialogTrigger>
        <SheetContent side="bottom" title="Filters">
          <div className="p-4">
            <FilterFields options={options} />
          </div>
          <div className="sticky bottom-0 mt-auto flex gap-2 border-t border-border bg-card p-4">
            <Button variant="outline" className="flex-1" onClick={() => update({ category: options.locked.category ? params.get("category") : null, state: null, city: null, rating: null, open_now: null, verified: null, posted: null })}>
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>
              Show {total.toLocaleString("en-US")} results
            </Button>
          </div>
        </SheetContent>
      </Dialog>

      <label htmlFor="sort" className="sr-only">
        Sort by
      </label>
      <NativeSelect id="sort" value={sort} onChange={(e) => update({ sort: e.target.value === "relevance" ? null : e.target.value })} className="h-9 w-auto">
        {sorts.map((s) => (
          <option key={s} value={s}>
            Sort: {SORT_LABELS[s]}
          </option>
        ))}
      </NativeSelect>

      <div className="ml-auto inline-flex rounded-md border border-border bg-card p-0.5" role="group" aria-label="View">
        {views.map(([v, label, Icon]) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => update({ view: v === "grid" ? null : v, page: params.get("page") })}
            className={cn("inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium", view === v ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted")}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Active filter chips with Clear all. */
export function ActiveFilters({ labels }: { labels: Record<string, string> }) {
  const { params, update } = useQueryUpdater();
  const keys = ["q", "location", "category", "state", "city", "rating", "open_now", "verified", "posted"].filter((k) => params.get(k));
  if (!keys.length) return null;
  const text = (k: string) => {
    const v = params.get(k)!;
    if (k === "rating") return `${v}+ stars`;
    if (k === "open_now") return "Open now";
    if (k === "verified") return "Verified";
    if (k === "posted") return POSTED.find(([p]) => p === v)?.[1] ?? v;
    if (k === "q") return `“${v}”`;
    return labels[`${k}:${v}`] ?? v;
  };
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {keys.map((k) => (
        <button key={k} type="button" onClick={() => update({ [k]: null })} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-blue-100 dark:hover:bg-blue-950">
          {text(k)}
          <X className="size-3.5" aria-label="Remove filter" />
        </button>
      ))}
      <button type="button" onClick={() => update(Object.fromEntries(keys.map((k) => [k, null])))} className="text-sm font-semibold text-primary hover:underline">
        Clear all
      </button>
    </div>
  );
}

const chipBase =
  "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const chipIdle = "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted";
const chipOn = "border-primary bg-secondary text-secondary-foreground";

function ToggleChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cn(chipBase, pressed ? chipOn : chipIdle)}>
      {children}
      {pressed && <X className="size-3.5" aria-hidden />}
    </button>
  );
}

const selectChip =
  "h-9 w-auto shrink-0 rounded-full py-0 pl-3.5 pr-8 text-sm font-medium shadow-none bg-[right_0.6rem_center] hover:border-primary/40 sm:text-sm";

/**
 * Horizontal filter chip row (Yelp-style): All filters sheet, category, quick toggles, sort and view.
 * Every control reads and writes the same URL params as the sidebar filters.
 */
export function FilterBar({ options, total }: { options: FilterOptions; total: number }) {
  const { params, update, pending } = useQueryUpdater();
  const [open, setOpen] = useState(false);
  const rawView = params.get("view");
  const view = rawView === "grid" || rawView === "map" ? rawView : "list";
  const sort = params.get("sort") ?? "relevance";
  const rating = params.get("rating");
  const category = params.get("category") ?? "";
  const sorts = ["relevance", "rating", "reviews", "newest", "name", ...(options.hasLocation ? ["distance"] : [])];
  const panelKeys = ["state", "city", "posted", "rating", "open_now", "verified", ...(options.locked.category ? [] : ["category"])];
  const activeCount = panelKeys.filter((k) => params.get(k)).length;
  const toggle = (key: string, value: string) => update({ [key]: params.get(key) === value ? null : value });
  const views = [
    ["list", "List", List],
    ["grid", "Grid", Grid3x3],
    ["map", "Map", MapIcon],
  ] as const;

  return (
    <div className={cn("flex items-center gap-3 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <div
        role="toolbar"
        aria-label="Filter results"
        className="-mx-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button type="button" className={cn(chipBase, activeCount ? chipOn : chipIdle, "font-semibold")}>
              <SlidersHorizontal className="size-4" aria-hidden />
              Filters
              {activeCount > 0 && <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{activeCount}</span>}
            </button>
          </DialogTrigger>
          <SheetContent side="right" title="All filters">
            <div className="p-4">
              <FilterFields options={options} />
            </div>
            <div className="sticky bottom-0 mt-auto flex gap-2 border-t border-border bg-card p-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => update({ category: options.locked.category ? params.get("category") : null, state: null, city: null, rating: null, open_now: null, verified: null, posted: null })}
              >
                Reset
              </Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Show {total.toLocaleString("en-US")} results
              </Button>
            </div>
          </SheetContent>
        </Dialog>

        <span className="h-6 w-px shrink-0 bg-border" aria-hidden />

        {!options.locked.category && (
          <>
            <label htmlFor="chip-category" className="sr-only">
              Category
            </label>
            <NativeSelect id="chip-category" value={category} onChange={(e) => update({ category: e.target.value || null })} className={cn(selectChip, category && chipOn, "w-44 truncate")}>
              <option value="">All categories</option>
              {options.categories.map((p) => (
                <optgroup key={p.slug} label={p.name}>
                  <option value={p.slug}>All {p.name}</option>
                  {p.children.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          </>
        )}

        <ToggleChip pressed={params.get("open_now") === "1"} onClick={() => toggle("open_now", "1")}>
          Open now
        </ToggleChip>
        <ToggleChip pressed={!!rating} onClick={() => update({ rating: rating ? null : "4" })}>
          <Star className="size-3.5 fill-rating text-rating" aria-hidden />
          {rating ? `${rating}+ rated` : "4+ rated"}
        </ToggleChip>
        <ToggleChip pressed={params.get("verified") === "1"} onClick={() => toggle("verified", "1")}>
          Verified
        </ToggleChip>
        <ToggleChip pressed={params.get("posted") === "30d"} onClick={() => toggle("posted", "30d")}>
          New this month
        </ToggleChip>

        <label htmlFor="chip-sort" className="sr-only">
          Sort by
        </label>
        <NativeSelect id="chip-sort" value={sort} onChange={(e) => update({ sort: e.target.value === "relevance" ? null : e.target.value })} className={cn(selectChip, sort !== "relevance" && chipOn, "w-48")}>
          {sorts.map((s) => (
            <option key={s} value={s}>
              Sort: {SORT_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="inline-flex shrink-0 rounded-full border border-border bg-card p-0.5" role="group" aria-label="Results view">
        {views.map(([v, label, Icon]) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            aria-label={`${label} view`}
            onClick={() => update({ view: v === "list" ? null : v, page: params.get("page") })}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors",
              view === v ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden xl:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
