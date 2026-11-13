import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/listing/pagination";
import { ADMIN_PAGE_SIZE, type RawSP } from "@/lib/data/admin";
import { RowCheckbox, SelectAllCheckbox } from "./bulk";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  /** Hide in the mobile card view (e.g. the title column already shown as the card heading). */
  hideOnMobile?: boolean;
  cell: (row: T) => React.ReactNode;
};

/** Builds an admin URL preserving current params, with overrides (undefined removes a key). */
export function hrefWith(basePath: string, sp: RawSP, overrides: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) qs.set(k, val);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === "") qs.delete(k);
    else qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/**
 * Server-rendered data table: sortable headers (?sort=&dir=), table on desktop,
 * stacked cards on mobile, optional bulk selection, and numbered pagination.
 */
export function AdminTable<T extends { id: string }>({
  rows,
  columns,
  basePath,
  sp,
  total,
  page,
  title,
  actions,
  selectable,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  basePath: string;
  sp: RawSP;
  total: number;
  page: number;
  title?: (row: T) => React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  selectable?: boolean;
  empty: React.ReactNode;
}) {
  if (!rows.length) return <>{empty}</>;
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) ?? "";
  const dir = (Array.isArray(sp.dir) ? sp.dir[0] : sp.dir) === "asc" ? "asc" : "desc";
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <div className="grid gap-4">
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3">
                  <SelectAllCheckbox ids={rows.map((r) => r.id)} />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-4 py-3 font-semibold", c.className)} aria-sort={c.sortable && sort === c.key ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                  {c.sortable ? (
                    <Link
                      href={hrefWith(basePath, sp, { sort: c.key, dir: sort === c.key && dir === "desc" ? "asc" : "desc", page: undefined })}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {c.label}
                      {sort === c.key ? dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 opacity-50" />}
                    </Link>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="align-top transition-colors hover:bg-surface">
                {selectable && (
                  <td className="px-4 py-3">
                    <RowCheckbox id={row.id} />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-start gap-3">
              {selectable && <RowCheckbox id={row.id} />}
              <div className="min-w-0 flex-1 font-semibold">{title ? title(row) : columns[0]?.cell(row)}</div>
            </div>
            <dl className="grid gap-2 text-sm">
              {columns
                .filter((c, i) => !c.hideOnMobile && !(i === 0 && !title))
                .map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">{c.label}</dt>
                    <dd className="min-w-0 text-right">{c.cell(row)}</dd>
                  </div>
                ))}
            </dl>
            {actions && <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">{actions(row)}</div>}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString("en-US")} result{total === 1 ? "" : "s"}
        </p>
        <Pagination page={page} totalPages={totalPages} hrefFor={(p) => hrefWith(basePath, sp, { page: p === 1 ? undefined : p })} />
      </div>
    </div>
  );
}
