import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Numbered pagination with first/last/prev/next. Uses SEO-friendly ?page=N links. */
export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const windowSize = 2;
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= windowSize) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted";
  const disabled = "pointer-events-none opacity-40";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
      <Link href={hrefFor(1)} aria-label="First page" className={cn(item, "hidden sm:inline-flex", page === 1 && disabled)} aria-disabled={page === 1}>
        <ChevronsLeft className="size-4" />
      </Link>
      <Link href={hrefFor(Math.max(1, page - 1))} rel="prev" aria-label="Previous page" className={cn(item, page === 1 && disabled)} aria-disabled={page === 1}>
        <ChevronLeft className="size-4" />
      </Link>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">…</span>
        ) : (
          <Link key={p} href={hrefFor(p)} aria-current={p === page ? "page" : undefined} className={cn(item, p === page && "border-primary bg-primary text-primary-foreground hover:bg-primary", Math.abs(p - page) > 1 && p !== 1 && p !== totalPages && "hidden sm:inline-flex")}>
            {p}
          </Link>
        ),
      )}
      <Link href={hrefFor(Math.min(totalPages, page + 1))} rel="next" aria-label="Next page" className={cn(item, page === totalPages && disabled)} aria-disabled={page === totalPages}>
        <ChevronRight className="size-4" />
      </Link>
      <Link href={hrefFor(totalPages)} aria-label="Last page" className={cn(item, "hidden sm:inline-flex", page === totalPages && disabled)} aria-disabled={page === totalPages}>
        <ChevronsRight className="size-4" />
      </Link>
    </nav>
  );
}
