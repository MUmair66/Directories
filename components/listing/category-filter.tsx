"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CategoryNode } from "@/lib/data/public";
import { CategoryIcon } from "./category-icon";
import { EmptyState } from "@/components/ui/primitives";

/** All-categories grid with a live name filter (parents and subcategories). */
export function CategoryDirectory({ tree }: { tree: CategoryNode[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tree;
    return tree
      .map((p) => {
        const parentHit = p.name.toLowerCase().includes(needle);
        const children = parentHit ? p.children : p.children.filter((c) => c.name.toLowerCase().includes(needle));
        return parentHit || children.length ? { ...p, children } : null;
      })
      .filter((p): p is CategoryNode => !!p);
  }, [q, tree]);

  return (
    <div className="grid gap-6">
      <div className="relative max-w-md">
        <label htmlFor="cat-filter" className="sr-only">
          Filter categories
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="cat-filter"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter categories, e.g. plumbers"
          className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {filtered.length} category groups shown
      </p>
      {filtered.length === 0 ? (
        <EmptyState icon={<Search />} title="No categories found" description={`Nothing matches “${q}”. Try a broader word.`} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-card p-5 shadow-card">
              <Link href={`/categories/${p.slug}`} className="group flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <CategoryIcon name={p.icon} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold leading-snug group-hover:text-primary">{p.name}</span>
                  <span className="text-sm text-muted-foreground">{p.count.toLocaleString("en-US")} listings</span>
                </span>
              </Link>
              <ul className="mt-4 grid gap-1.5 border-t border-border pt-4 text-sm">
                {p.children.slice(0, q ? undefined : 8).map((c) => (
                  <li key={c.slug} className="flex justify-between gap-2">
                    <Link href={`/category/${p.slug}/${c.slug}`} className="truncate text-foreground hover:text-primary">
                      {c.name}
                    </Link>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{c.count.toLocaleString("en-US")}</span>
                  </li>
                ))}
                {!q && p.children.length > 8 && (
                  <li>
                    <Link href={`/categories/${p.slug}`} className="font-semibold text-primary hover:underline">
                      View all {p.children.length}
                    </Link>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
