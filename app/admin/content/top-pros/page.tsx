import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { listParams, listTopPros, requireStaff, type RawSP } from "@/lib/data/admin";
import { deleteTopPros } from "@/app/actions/admin/content";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { SearchForm, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";

export const metadata = { title: "Top Pros" };
type Props = { searchParams: Promise<RawSP> };

export default function TopProsAdminPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Top Pros"
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Content", href: "/admin/content" }, { label: "Top Pros" }]}
        action={
          <Button asChild>
            <Link href="/admin/content/top-pros/new">
              <Plus aria-hidden /> New page
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const { rows, total } = await listTopPros(p);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "title", label: "Title", cell: (r) => <Link href={`/admin/content/top-pros/${r.id}`} className="font-semibold hover:text-primary">{r.title}</Link> },
    { key: "items", label: "Businesses", className: "text-right", cell: (r) => <span className="tabular-nums">{r.items}</span> },
    { key: "status", label: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "updated", label: "Updated", cell: (r) => <span className="text-xs">{fmtDate(r.updatedAt)}</span> },
  ];
  return (
    <>
      <Toolbar>
        <SearchForm basePath="/admin/content/top-pros" sp={sp} placeholder="Search titles" />
      </Toolbar>
      <AdminTable
        rows={rows}
        columns={columns}
        basePath="/admin/content/top-pros"
        sp={sp}
        total={total}
        page={p.page}
        actions={(r) => (
          <>
            <Button asChild size="icon-sm" variant="ghost" aria-label={`Edit ${r.title}`}>
              <Link href={`/admin/content/top-pros/${r.id}`}>
                <Pencil aria-hidden />
              </Link>
            </Button>
            {r.status === "published" && (
              <Button asChild size="icon-sm" variant="ghost" aria-label={`View ${r.title}`}>
                <Link href={`/top-pros/${r.slug}`} target="_blank">
                  <ExternalLink aria-hidden />
                </Link>
              </Button>
            )}
            <ActionButton size="icon-sm" variant="ghost" action={deleteTopPros} input={{ id: r.id }} confirm={{ title: `Delete “${r.title}”?`, description: "The page is removed permanently.", confirmLabel: "Delete" }} aria-label={`Delete ${r.title}`}>
              <Trash2 className="text-danger" aria-hidden />
            </ActionButton>
          </>
        )}
        empty={
          <EmptyState
            icon={<Trophy />}
            title="No Top Pros pages yet"
            description="Create “Best [Category] in [City], [ST]” articles that rank top-rated listings."
            action={
              <Button asChild>
                <Link href="/admin/content/top-pros/new">Create the first page</Link>
              </Button>
            }
          />
        }
      />
    </>
  );
}
