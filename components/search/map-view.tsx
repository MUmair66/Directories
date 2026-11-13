"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ListingCard, MapMarker } from "@/lib/search";
import { BusinessCard } from "@/components/listing/business-card";
import { Skeleton } from "@/components/ui/primitives";

const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false, loading: () => <Skeleton className="size-full rounded-none" /> });

/**
 * Split-screen map view. Moving the map reloads results for the visible area;
 * hovering a card highlights its marker.
 */
export function MapView({
  initialItems,
  center,
  zoom,
  scope,
}: {
  initialItems: ListingCard[];
  center: [number, number];
  zoom: number;
  /** IDs fixed by the page (category page, etc.), sent with each map query. */
  scope: { categoryId?: string };
}) {
  const params = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    (bbox: string) => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      const qs = new URLSearchParams(params.toString());
      qs.set("bbox", bbox);
      qs.delete("page");
      // The map area replaces the text location once the user pans.
      qs.set("ignoreLocation", "1");
      if (scope.categoryId) qs.set("categoryId", scope.categoryId);
      setLoading(true);
      fetch(`/api/map?${qs}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { markers: MapMarker[]; items: ListingCard[]; total: number }) => {
          setMarkers(d.markers ?? []);
          setItems(d.items ?? []);
          setTotal(d.total ?? 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [params, scope.categoryId],
  );

  useEffect(() => () => abort.current?.abort(), []);

  const onSelect = useCallback((id: string) => {
    setActiveId(id);
    listRef.current?.querySelector(`[data-business-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <div className="isolate grid overflow-hidden rounded-xl border border-border bg-card lg:h-[calc(100dvh-13rem)] lg:grid-cols-[minmax(0,420px)_1fr]">
      <div ref={listRef} className="order-2 grid max-h-[60dvh] content-start gap-4 overflow-y-auto p-4 lg:order-1 lg:max-h-none">
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {total === null ? "Move the map to search this area" : `${total.toLocaleString("en-US")} businesses in this area`}
        </p>
        {items.map((b) => (
          <div key={b.id} onMouseEnter={() => setActiveId(b.id)} onMouseLeave={() => setActiveId(null)} onFocus={() => setActiveId(b.id)} className={activeId === b.id ? "rounded-lg ring-2 ring-primary" : undefined}>
            <BusinessCard b={b} layout="grid" />
          </div>
        ))}
        {!loading && total === 0 && <p className="text-sm text-muted-foreground">No businesses here. Zoom out or move the map.</p>}
      </div>
      <div className="order-1 h-[45dvh] lg:order-2 lg:h-full">
        <MapCanvas center={center} zoom={zoom} markers={markers} activeId={activeId} onSelect={onSelect} onMove={load} />
      </div>
    </div>
  );
}
