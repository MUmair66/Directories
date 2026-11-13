import Link from "next/link";
import { Search } from "lucide-react";
import { getBlogCategories, getBlogPosts } from "@/lib/data/content";
import { Pagination } from "@/components/listing/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { PostCard } from "./blocks";

/** Blog grid with full-text search, category chips and ?page= pagination. Rendered inside <Suspense>. */
export async function BlogList({ searchParams, categorySlug }: { searchParams: Promise<Record<string, string | string[] | undefined>>; categorySlug?: string }) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);
  const [{ items, totalPages }, categories] = await Promise.all([getBlogPosts({ q, categorySlug, page }), getBlogCategories()]);
  const base = categorySlug ? `/blog/category/${categorySlug}` : "/blog";
  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Blog categories">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href="/blog" className={cn("inline-flex rounded-full px-4 py-1.5 text-sm font-medium", !categorySlug ? "bg-primary text-white" : "bg-muted hover:bg-secondary")}>
                All
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/blog/category/${c.slug}`}
                  aria-current={c.slug === categorySlug ? "page" : undefined}
                  className={cn("inline-flex rounded-full px-4 py-1.5 text-sm font-medium", c.slug === categorySlug ? "bg-primary text-white" : "bg-muted hover:bg-secondary")}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form action={base} role="search" className="flex w-full gap-2 md:w-80">
          <label htmlFor="blog-q" className="sr-only">
            Search articles
          </label>
          <Input id="blog-q" name="q" defaultValue={q} placeholder="Search articles…" />
          <Button type="submit" size="icon" aria-label="Search">
            <Search />
          </Button>
        </form>
      </div>

      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <PostCard key={p.id} post={p} priority={i < 3} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? `No articles match “${q}”` : "No articles yet"}
          description={q ? "Try a different search or browse all articles." : "New articles are on the way. Check back soon."}
          action={
            q ? (
              <Button asChild variant="outline">
                <Link href={base}>Clear search</Link>
              </Button>
            ) : undefined
          }
        />
      )}
      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}

export function BlogListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-80 rounded-lg" />
      ))}
    </div>
  );
}
