"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, LocateFixed, MapPin, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/lib/search";

type Props = { variant?: "hero" | "compact"; defaultWhat?: string; defaultWhere?: string };

function useSuggestions(kind: "what" | "where", query: string) {
  const [items, setItems] = useState<Suggestion[]>([]);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/autocomplete?type=${kind}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then(setItems)
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [kind, query]);
  return items;
}

const ICONS = { category: Tag, business: Building2, city: MapPin, state: MapPin, zip: MapPin };

function Combo({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
  onPick,
  icon,
  className,
  inputClassName,
  trailing,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: Suggestion[];
  onPick: (s: Suggestion) => void;
  icon: React.ReactNode;
  className?: string;
  inputClassName?: string;
  trailing?: React.ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const show = open && suggestions.length > 0;
  return (
    <div className={cn("relative flex min-w-0 flex-1 items-center", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="pointer-events-none absolute left-3 text-muted-foreground [&_svg]:size-5">{icon}</span>
      <input
        id={id}
        role="combobox"
        aria-expanded={show}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(suggestions.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(-1, a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            onPick(suggestions[active]!);
            setOpen(false);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className={cn("h-12 w-full bg-transparent pl-11 pr-3 text-base text-foreground outline-none placeholder:text-muted-foreground", inputClassName)}
      />
      {trailing}
      {show && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-border bg-popover py-1 text-left shadow-card-hover">
          {suggestions.map((s, i) => {
            const Icon = ICONS[s.type];
            return (
              <li
                key={`${s.type}-${s.href}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(s);
                  setOpen(false);
                }}
                className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-foreground", i === active ? "bg-muted" : "hover:bg-muted")}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                {s.sublabel && <span className="shrink-0 text-xs text-muted-foreground">{s.sublabel}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** What + Where search with autocomplete and "Use my location". */
export function SearchBar({ variant = "compact", defaultWhat, defaultWhere }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [what, setWhat] = useState(defaultWhat ?? params.get("q") ?? "");
  const [where, setWhere] = useState(defaultWhere ?? params.get("location") ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const category = useRef<string | null>(null);
  const whatItems = useSuggestions("what", what);
  const whereItems = useSuggestions("where", coords ? "" : where);
  const hero = variant === "hero";

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const qs = new URLSearchParams();
    if (category.current) qs.set("category", category.current);
    else if (what.trim()) qs.set("q", what.trim());
    if (coords) {
      qs.set("lat", coords.lat.toFixed(5));
      qs.set("lng", coords.lng.toFixed(5));
      qs.set("sort", "distance");
    } else if (where.trim()) qs.set("location", where.trim());
    router.push(`/search?${qs.toString()}`);
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setWhere("Current location");
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000, maximumAge: 600000 },
    );
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn(
        "flex w-full flex-col rounded-xl border border-border bg-card text-foreground sm:flex-row sm:items-center",
        hero ? "gap-0 p-2 shadow-card-hover sm:rounded-full sm:pl-2" : "shadow-sm",
      )}
    >
      <Combo
        label="What are you looking for?"
        placeholder={hero ? "Plumbers, lawyers, restaurants…" : "What"}
        value={what}
        onChange={(v) => {
          setWhat(v);
          category.current = null;
        }}
        suggestions={whatItems}
        onPick={(s) => {
          if (s.type === "business") return router.push(s.href);
          setWhat(s.value);
          category.current = new URL(s.href, "http://x").searchParams.get("category");
        }}
        icon={<Search />}
        inputClassName={hero ? "" : "h-10"}
      />
      <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
      <span className="mx-3 h-px bg-border sm:hidden" aria-hidden />
      <Combo
        label="Where? City, state or ZIP"
        placeholder={hero ? "City, state or ZIP" : "Where"}
        value={where}
        onChange={(v) => {
          setWhere(v);
          setCoords(null);
        }}
        suggestions={whereItems}
        onPick={(s) => {
          setWhere(s.value);
          setCoords(null);
        }}
        icon={<MapPin />}
        inputClassName={cn(hero ? "pr-11" : "h-10 pr-10")}
        trailing={
          <button
            type="button"
            onClick={locate}
            className="absolute right-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
            aria-label="Use my location"
            title="Use my location"
          >
            <LocateFixed className={cn("size-5", locating && "animate-pulse text-primary")} />
          </button>
        }
      />
      <Button type="submit" size={hero ? "lg" : "default"} className={cn("m-1 shrink-0", hero && "sm:rounded-full sm:px-8")}>
        <Search aria-hidden />
        <span className={hero ? "" : "sm:sr-only lg:not-sr-only"}>Search</span>
      </Button>
    </form>
  );
}
