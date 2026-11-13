import Link from "next/link";
import { Suspense } from "react";
import { FileClock } from "lucide-react";
import { listAudit, listParams, requireStaff, type RawSP } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, NativeSelect, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { fmtDate } from "@/components/admin/toolbar";

export const metadata = { title: "Audit log" };
type Props = { searchParams: Promise<RawSP> };

export default function AuditLogPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader title="Audit log" description="Every admin action, newest first." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Audit log" }]} />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <Log searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Log({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const { rows, total, entities } = await listAudit(p);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "when", label: "When", cell: (r) => <span className="whitespace-nowrap text-xs">{fmtDate(r.createdAt, true)} UTC</span> },
    { key: "actor", label: "Actor", cell: (r) => <span className="text-sm">{r.actorName ?? "System"}<span className="block text-xs text-muted-foreground">{r.actorEmail}</span></span> },
    { key: "action", label: "Action", cell: (r) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.action}</code> },
    {
      key: "entity",
      label: "Entity",
      cell: (r) => (
        <span className="text-xs">
          {r.entityType}
          {r.entityId && <span className="block max-w-48 truncate text-muted-foreground" title={r.entityId}>{r.entityId}</span>}
        </span>
      ),
    },
    {
      key: "diff",
      label: "Details",
      cell: (r) =>
        r.diff ? (
          <details className="max-w-md text-xs">
            <summary className="cursor-pointer text-primary">View changes</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-surface p-2">{JSON.stringify(r.diff, null, 2)}</pre>
          </details>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "ip", label: "IP", cell: (r) => <span className="text-xs text-muted-foreground">{r.ip ?? "—"}</span> },
  ];
  const entity = p.one("entity") ?? "";
  return (
    <>
      <form action="/admin/audit-log" className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="audit-q" className="sr-only">
          Search actions, IDs or actor email
        </label>
        <input id="audit-q" name="q" defaultValue={p.q ?? ""} placeholder="Search action, entity ID or email" className="h-10 rounded-md border border-input bg-card px-3 text-sm sm:w-72" />
        <label htmlFor="audit-entity" className="sr-only">
          Entity type
        </label>
        <NativeSelect id="audit-entity" name="entity" defaultValue={entity} className="sm:w-48">
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>
      <AdminTable
        rows={rows}
        columns={columns}
        basePath="/admin/audit-log"
        sp={sp}
        total={total}
        page={p.page}
        title={(r) => <code className="text-xs">{r.action}</code>}
        empty={
          <EmptyState
            icon={<FileClock />}
            title="No entries"
            description="Admin actions are recorded here automatically."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/audit-log">Clear filters</Link>
              </Button>
            }
          />
        }
      />
    </>
  );
}
