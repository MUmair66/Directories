import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RawSP } from "@/lib/data/admin";
import { hrefWith } from "./table";

/** GET search form (?q=) that keeps the other filters. */
export function SearchForm({ basePath, sp, placeholder, keep = [] }: { basePath: string; sp: RawSP; placeholder: string; keep?: string[] }) {
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";
  return (
    <form action={basePath} role="search" className="relative w-full sm:max-w-xs">
      <label htmlFor="admin-q" className="sr-only">
        {placeholder}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id="admin-q"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
      />
      {keep.map((k) => {
        const v = Array.isArray(sp[k]) ? sp[k]![0] : sp[k];
        return v ? <input key={k} type="hidden" name={k} value={v} /> : null;
      })}
    </form>
  );
}

/** Filter tabs as links (keeps q, resets page). */
export function FilterTabs({
  basePath,
  sp,
  param,
  value,
  options,
}: {
  basePath: string;
  sp: RawSP;
  param: string;
  value: string | undefined;
  options: { value: string | undefined; label: string; count?: number }[];
}) {
  return (
    <nav aria-label="Filters" className="flex max-w-full gap-1 overflow-x-auto rounded-md bg-muted p-1">
      {options.map((o) => {
        const active = (value ?? "") === (o.value ?? "");
        return (
          <Link
            key={o.label}
            href={hrefWith(basePath, sp, { [param]: o.value, page: undefined })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-3 text-sm font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="rounded-full bg-background px-1.5 text-xs tabular-nums text-muted-foreground">{o.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">{children}</div>;
}

const STATUS_TONES: Record<string, string> = {
  approved: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  verified: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  published: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  resolved: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  pending_review: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  pending: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  open: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  new: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  awaiting_reply: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  contacted: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  rejected: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  suspended: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  spam: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  hidden: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  critical: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  high: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_TONES[status] ?? "bg-muted text-foreground")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/** Deterministic date formatting (UTC) for server-rendered admin tables. */
export function fmtDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}), timeZone: "UTC" });
}
