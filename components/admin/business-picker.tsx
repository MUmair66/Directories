"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Search, Trash2 } from "lucide-react";
import { searchBusinessesForPicker } from "@/app/actions/admin/businesses";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";

export type PickedBusiness = { businessId: string; name?: string; blurb?: string };
type Hit = { id: string; name: string; cityName: string; stateCode: string | null; avgRating: number; reviewCount: number };

/** Search approved businesses, add them as ranked items with an optional blurb. */
export function BusinessPicker({ id, value, onChange }: { id: string; value: PickedBusiness[]; onChange: (v: PickedBusiness[]) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchBusinessesForPicker({ q: term });
      if (!cancelled) {
        setHits(res.ok && res.data ? res.data : []);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const visibleHits = q.trim().length >= 2 ? hits : [];

  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const [item] = next.splice(i, 1);
    next.splice(i + d, 0, item!);
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Label htmlFor={id} className="sr-only">
          Search businesses to add
        </Label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search approved businesses by name…" className="pl-9" autoComplete="off" />
        {q.trim().length >= 2 && (visibleHits.length > 0 || loading) && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-card-hover" role="listbox">
            {loading && <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>}
            {visibleHits.map((h) => {
              const added = value.some((v) => v.businessId === h.id);
              return (
                <li key={h.id} role="option" aria-selected={added}>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => {
                      onChange([...value, { businessId: h.id, name: `${h.name} (${h.cityName}${h.stateCode ? `, ${h.stateCode}` : ""})`, blurb: "" }]);
                      setQ("");
                      setHits([]);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <span>
                      <span className="font-medium">{h.name}</span>
                      <span className="text-muted-foreground"> · {h.cityName}{h.stateCode ? `, ${h.stateCode}` : ""}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{added ? "Added" : `${Number(h.avgRating).toFixed(1)}★ (${h.reviewCount})`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">No businesses selected. Search above to add ranked entries.</p>
      ) : (
        <ol className="grid gap-2">
          {value.map((v, i) => (
            <li key={v.businessId} className="grid gap-2 rounded-md border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{v.name ?? v.businessId}</span>
                <Button type="button" size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp aria-hidden />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  <ArrowDown aria-hidden />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${v.name ?? "business"}`}>
                  <Trash2 className="text-danger" aria-hidden />
                </Button>
              </div>
              <Label htmlFor={`${id}-blurb-${i}`} className="sr-only">
                Why this business made the list
              </Label>
              <Textarea id={`${id}-blurb-${i}`} rows={2} value={v.blurb ?? ""} placeholder="Why this business made the list (optional)" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, blurb: e.target.value } : x)))} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
