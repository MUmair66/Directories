import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { listParams, requireStaff, type RawSP } from "@/lib/data/admin";
import { listLandingPagesAdmin } from "@/lib/data/landing";
import { deleteLandingPage } from "@/app/actions/admin/landing";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { SearchForm, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";

export const metadata = { title: "Landing pages" };
type Props = { searchParams: Promise<RawSP> };

export default function LandingPagesAdmin({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Landing pages"
        description="Custom marketing pages for any business, at your own URL (e.g. /11538-best-painting-services-westlake-oh#Intro)."
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Landing pages" }]}
        action={
          <Button asChild>
            <Link href="/admin/landing-pages/new">
              <Plus aria-hidden /> New landing page
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

const STATUS_TABS = [
  ["", "All"],
  ["published", "Live"],
  ["draft", "Drafts"],
] as const;

async function List({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const { rows, total } = await listLandingPagesAdmin(p);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "title",
      label: "Page",
      cell: (r) => (
        <div className="grid gap-0.5">
          <Link href={`/admin/landing-pages/${r.id}`} className="font-semibold hover:text-primary">
            {r.title}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">/{r.slug}</span>
        </div>
      ),
    },
    {
      key: "business",
      label: "Business",
      cell: (r) => (
        <span className="text-sm">
          {r.businessName}
          {r.businessCity ? <span className="text-muted-foreground"> · {r.businessCity}</span> : null}
        </span>
      ),
    },
    { key: "views", label: "Views", className: "text-right", cell: (r) => <span className="tabular-nums">{r.views.toLocaleString("en-US")}</span> },
    { key: "leads", label: "Leads", className: "text-right", cell: (r) => <span className="tabular-nums">{r.leads}</span> },
    { key: "status", label: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "updated", label: "Updated", cell: (r) => <span className="text-xs">{fmtDate(r.updatedAt)}</span> },
  ];
  return (
    <>
      <Toolbar>
        <nav aria-label="Filter by status" className="flex w-fit gap-1 rounded-lg bg-muted p-1 text-sm">
          {STATUS_TABS.map(([v, l]) => (
            <Link
              key={v}
              href={v ? `/admin/landing-pages?status=${v}` : "/admin/landing-pages"}
              aria-current={(p.status ?? "") === v ? "page" : undefined}
              className="rounded-md px-3 py-1.5 font-medium text-muted-foreground aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
            >
              {l}
            </Link>
          ))}
        </nav>
        <SearchForm basePath="/admin/landing-pages" sp={sp} placeholder="Search title, URL or business" keep={["status"]} />
      </Toolbar>
      <AdminTable
        rows={rows}
        columns={columns}
        basePath="/admin/landing-pages"
        sp={sp}
        total={total}
        page={p.page}
        actions={(r) => (
          <>
            <Button asChild size="icon-sm" variant="ghost" aria-label={`Edit ${r.title}`}>
              <Link href={`/admin/landing-pages/${r.id}`}>
                <Pencil aria-hidden />
              </Link>
            </Button>
            {r.status === "published" && (
              <Button asChild size="icon-sm" variant="ghost" aria-label={`View ${r.title}`}>
                <a href={`/${r.slug}`} target="_blank" rel="noopener">
                  <ExternalLink aria-hidden />
                </a>
              </Button>
            )}
            <ActionButton
              size="icon-sm"
              variant="ghost"
              action={deleteLandingPage}
              input={{ id: r.id }}
              confirm={{ title: `Delete “${r.title}”?`, description: "The page goes offline immediately and is purged after 30 days.", confirmLabel: "Delete" }}
              aria-label={`Delete ${r.title}`}
            >
              <Trash2 className="text-danger" aria-hidden />
            </ActionButton>
          </>
        )}
        empty={
          <EmptyState
            icon={<LayoutTemplate />}
            title="No landing pages yet"
            description="Pick any business, choose your own URL, then change colors, text, images and sections."
            action={
              <Button asChild>
                <Link href="/admin/landing-pages/new">Create the first landing page</Link>
              </Button>
            }
          />
        }
      />
    </>
  );
}
