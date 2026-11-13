"use client";
import { useId, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";

export type CategoryOption = { id: string; name: string; children: { id: string; name: string }[] };

/** Searchable multi-select grouped by parent category (max 5). First pick is the primary category. */
export function CategoryPicker({ id, options, value, onChange, max = 5, invalid }: { id: string; options: CategoryOption[]; value: string[]; onChange: (ids: string[]) => void; max?: number; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const listId = useId();
  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of options) {
      m.set(p.id, p.name);
      for (const c of p.children) m.set(c.id, c.name);
    }
    return m;
  }, [options]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options
      .map((p) => ({ ...p, children: p.name.toLowerCase().includes(term) ? p.children : p.children.filter((c) => c.name.toLowerCase().includes(term)) }))
      .filter((p) => p.children.length);
  }, [options, q]);

  const toggle = (cid: string) => {
    if (value.includes(cid)) onChange(value.filter((v) => v !== cid));
    else if (value.length < max) onChange([...value, cid]);
  };

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border bg-card px-3 text-left text-sm",
              invalid ? "border-danger" : "border-input",
            )}
          >
            <span className={value.length ? "" : "text-muted-foreground"}>{value.length ? `${value.length} of ${max} selected` : "Search and choose categories"}</span>
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(32rem,calc(100vw-2rem))] p-0">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <label htmlFor={`${id}-q`} className="sr-only">
              Search categories
            </label>
            <input id={`${id}-q`} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…" className="h-10 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <div id={listId} role="listbox" aria-multiselectable="true" className="max-h-80 overflow-y-auto p-1">
            {filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">No categories match “{q}”.</p>}
            {filtered.map((p) => (
              <div key={p.id} role="group" aria-label={p.name}>
                <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.name}</p>
                {p.children.map((c) => {
                  const selected = value.includes(c.id);
                  const disabled = !selected && value.length >= max;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={disabled}
                      onClick={() => toggle(c.id)}
                      className={cn("flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-40", selected && "font-semibold text-primary")}
                    >
                      {c.name}
                      {selected && <Check className="size-4" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Selected categories">
          {value.map((cid, i) => (
            <li key={cid} className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-sm text-secondary-foreground">
              {nameOf.get(cid) ?? "Unknown"}
              {i === 0 && <span className="text-xs opacity-70">(primary)</span>}
              <button type="button" onClick={() => toggle(cid)} className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900" aria-label={`Remove ${nameOf.get(cid)}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
