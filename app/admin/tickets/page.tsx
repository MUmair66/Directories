import Link from "next/link";
import { Suspense } from "react";
import { LifeBuoy } from "lucide-react";
import { listParams, listStaff, listTickets, requireStaff, type RawSP } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { FilterTabs, SearchForm, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";

export const metadata = { title: "Support tickets" };
type Props = { searchParams: Promise<RawSP> };

export default function AdminTicketsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader title="Support tickets" description="Sorted by priority, then newest." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Tickets" }]} />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <Tickets searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Tickets({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const [{ rows, total }, staff] = await Promise.all([listTickets(p), listStaff()]);
  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "subject",
      label: "Ticket",
      cell: (t) => (
        <div>
          <Link href={`/admin/tickets/${t.id}`} className="font-semibold hover:text-primary">
            #{t.number} {t.subject}
          </Link>
          <p className="text-xs text-muted-foreground">
            {t.userName} · {t.userEmail}
          </p>
        </div>
      ),
    },
    { key: "category", label: "Category", cell: (t) => <span className="capitalize">{t.category}</span> },
    { key: "priority", label: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
    { key: "status", label: "Status", cell: (t) => <StatusBadge status={t.status} /> },
    { key: "assigned", label: "Assigned", cell: (t) => (t.assignedTo ? staffName.get(t.assignedTo) ?? "Staff" : <span className="text-muted-foreground">Unassigned</span>) },
    { key: "activity", label: "Last activity", cell: (t) => <span className="whitespace-nowrap text-xs">{fmtDate(t.lastReplyAt ?? t.createdAt, true)}</span> },
  ];
  return (
    <>
      <Toolbar>
        <FilterTabs
          basePath="/admin/tickets"
          sp={sp}
          param="status"
          value={p.status}
          options={[
            { value: undefined, label: "Active" },
            { value: "open", label: "Open" },
            { value: "awaiting_reply", label: "Awaiting reply" },
            { value: "resolved", label: "Resolved" },
            { value: "closed", label: "Closed" },
            { value: "all", label: "All" },
          ]}
        />
        <SearchForm basePath="/admin/tickets" sp={sp} placeholder="Search subject or #number" keep={["status"]} />
      </Toolbar>
      <AdminTable
        rows={rows}
        columns={columns}
        basePath="/admin/tickets"
        sp={sp}
        total={total}
        page={p.page}
        actions={(t) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/tickets/${t.id}`}>Open</Link>
          </Button>
        )}
        empty={
          <EmptyState
            icon={<LifeBuoy />}
            title="Inbox zero"
            description="No tickets match this view."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/tickets?status=all">Show all tickets</Link>
              </Button>
            }
          />
        }
      />
    </>
  );
}
