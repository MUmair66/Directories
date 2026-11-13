"use client";
import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type Ctx = { selected: Set<string>; toggle: (id: string) => void; setMany: (ids: string[], on: boolean) => void; clear: () => void };
const BulkContext = createContext<Ctx | null>(null);

/** Selection state for bulk actions. Wrap a table and its BulkBar. */
export function BulkProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const ctx: Ctx = {
    selected,
    toggle: (id) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setMany: (ids, on) =>
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (on) next.add(id);
          else next.delete(id);
        }
        return next;
      }),
    clear: () => setSelected(new Set()),
  };
  return <BulkContext.Provider value={ctx}>{children}</BulkContext.Provider>;
}

export function useBulk() {
  return useContext(BulkContext);
}

const box = "size-5 cursor-pointer rounded-sm border border-input accent-[var(--primary)]";

export function RowCheckbox({ id }: { id: string }) {
  const ctx = useBulk();
  if (!ctx) return null;
  return <input type="checkbox" className={box} aria-label="Select row" checked={ctx.selected.has(id)} onChange={() => ctx.toggle(id)} />;
}

export function SelectAllCheckbox({ ids }: { ids: string[] }) {
  const ctx = useBulk();
  if (!ctx) return null;
  const all = ids.length > 0 && ids.every((id) => ctx.selected.has(id));
  return <input type="checkbox" className={box} aria-label="Select all on this page" checked={all} onChange={() => ctx.setMany(ids, !all)} />;
}

/** Sticky bar shown while rows are selected. Children receive the selected IDs. */
export function BulkBar({ children, className }: { children: (ids: string[], clear: () => void) => React.ReactNode; className?: string }) {
  const ctx = useBulk();
  if (!ctx || ctx.selected.size === 0) return null;
  const ids = [...ctx.selected];
  return (
    <div role="region" aria-label="Bulk actions" className={cn("sticky top-20 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-secondary p-3 shadow-card", className)}>
      <span className="mr-2 text-sm font-semibold text-secondary-foreground">{ids.length} selected</span>
      {children(ids, ctx.clear)}
      <button type="button" onClick={ctx.clear} className="ml-auto text-sm font-medium text-secondary-foreground underline-offset-2 hover:underline">
        Clear
      </button>
    </div>
  );
}
