"use client";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ListingCard } from "@/lib/search";
import type { PinMarker } from "./map-canvas";
import { Skeleton } from "@/components/ui/primitives";

const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false, loading: () => <Skeleton className="size-full rounded-none" /> });

type Ctx = { activeId: string | null; setActiveId: (id: string | null) => void };
const ActiveContext = createContext<Ctx>({ activeId: null, setActiveId: () => {} });

/** Shares the hovered/selected result between the list and the sticky map. */
export function ResultsHoverProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const value = useMemo(() => ({ activeId, setActiveId }), [activeId]);
  return <ActiveContext.Provider value={value}>{children}</ActiveContext.Provider>;
}

/** Wraps a result row: hovering or focusing it highlights its pin on the map. */
export function HoverRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeId, setActiveId } = useContext(ActiveContext);
  return (
    <div
      onMouseEnter={() => setActiveId(id)}
      onMouseLeave={() => setActiveId(null)}
      onFocus={() => setActiveId(id)}
      className={activeId === id ? "rounded-xl ring-2 ring-primary/70 ring-offset-2 ring-offset-background" : "rounded-xl"}
    >
      {children}
    </div>
  );
}

/** Sticky map for the split results view: pins for the current page, fitted to the results. */
export function ResultsMap({ items, center, zoom, startIndex = 1 }: { items: ListingCard[]; center: [number, number]; zoom: number; /** Number of the first result, shown on its pin. */ startIndex?: number }) {
  const { activeId, setActiveId } = useContext(ActiveContext);
  const markers = useMemo<PinMarker[]>(
    () =>
      items
        .map((b, i) => ({ b, label: String(startIndex + i) }))
        .filter(({ b }) => b.lat != null && b.lng != null && !b.hideAddress)
        .map(({ b, label }) => ({ id: b.id, slug: b.slug, name: b.name, lat: b.lat!, lng: b.lng!, avgRating: b.avgRating, reviewCount: b.reviewCount, label })),
    [items, startIndex],
  );
  const onSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      document.querySelector(`[data-business-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [setActiveId],
  );
  return <MapCanvas center={center} zoom={zoom} markers={markers} activeId={activeId} onSelect={onSelect} fitToMarkers />;
}
