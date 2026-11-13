"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ListingCard } from "@/lib/search";
import { BusinessCard } from "@/components/listing/business-card";
import { ResultRow } from "@/components/listing/result-row";
import { Button } from "@/components/ui/button";

/** Mobile "Load more": appends the next pages below the server-rendered page. */
export function LoadMore({
  startPage,
  totalPages,
  scope,
  layout,
  showDistance,
  perPage,
}: {
  startPage: number;
  totalPages: number;
  scope: Record<string, string>;
  layout: "grid" | "list";
  showDistance: boolean;
  /** Page size, used to keep result numbers continuous in the list layout. */
  perPage?: number;
}) {
  const params = useSearchParams();
  const [page, setPage] = useState(startPage);
  const [items, setItems] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (page >= totalPages && !items.length) return null;

  async function more() {
    setLoading(true);
    setError(false);
    const qs = new URLSearchParams(params.toString());
    qs.set("page", String(page + 1));
    for (const [k, v] of Object.entries(scope)) qs.set(k, v);
    try {
      const res = await fetch(`/api/listings?${qs}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { items: ListingCard[] };
      setItems((prev) => [...prev, ...data.items]);
      setPage((p) => p + 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const offset = perPage ? startPage * perPage : null;
  return (
    <div className={layout === "list" ? "grid gap-4 sm:hidden" : "grid gap-5 sm:hidden"}>
      {items.map((b, i) =>
        layout === "list" ? (
          <ResultRow key={b.id} b={b} index={offset != null ? offset + i + 1 : undefined} showDistance={showDistance} />
        ) : (
          <BusinessCard key={b.id} b={b} layout={layout} showDistance={showDistance} />
        ),
      )}
      {page < totalPages && (
        <Button variant="outline" onClick={more} loading={loading} className="w-full">
          {error ? "Couldn't load. Try again" : "Load more"}
        </Button>
      )}
    </div>
  );
}
