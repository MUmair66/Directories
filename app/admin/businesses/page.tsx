import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Building2, Download, ExternalLink, Pencil, Star, StarOff, Trash2 } from "lucide-react";
import { BUSINESS_STATUSES, listBusinesses, listParams, requireStaff, type RawSP } from "@/lib/data/admin";
import { deleteBusinesses, moderateBusinesses, setFeatured } from "@/app/actions/admin/businesses";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { AdminTable, hrefWith, type Column } from "@/components/admin/table";
import { FilterTabs, SearchForm, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";
import { BulkProvider } from "@/components/admin/bulk";
import { BusinessBulkBar, ImportDialog, MergeDialog } from "@/components/admin/business-tools";

export const metadata = { title: "Businesses" };

type Props = { searchParams: Promise<RawSP> };

export default function AdminBusinessesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Businesses"
        description="Moderate new listings, feature the best ones and clean up duplicates."
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Businesses" }]}
        action={
          <div className="flex flex-wrap gap-2">
            <ImportDialog />
            <Suspense fallback={null}>
              <ExportButton searchParams={searchParams} />
            </Suspense>
          </div>
        }
      />
      <Suspense fallback={<Skeleton className="h-[480px] rounded-lg" />}>
        <BusinessList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExportButton({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <Button asChild variant="outline">
      <a href={hrefWith("/admin/businesses/export", sp, { page: undefined, sort: undefined, dir: undefined })}>
        <Download aria-hidden /> Export CSV
      </a>
    </Button>
  );
}

type Row = Awaited<ReturnType<typeof listBusinesses>>["rows"][number];

async function BusinessList({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const { rows, total, statusCounts } = await listBusinesses(p);
  const all = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: "Business",
      sortable: true,
      cell: (b) => (
        <div className="min-w-48">
          <Link href={`/dashboard/businesses/${b.id}/edit`} className="font-semibold hover:text-primary">
            {b.name}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>/biz/{b.slug}</span>
            {b.verificationStatus === "verified" && <BadgeCheck className="size-3.5 text-primary" aria-label="Verified" />}
            {b.featured && <Star className="size-3.5 fill-rating text-rating" aria-label="Featured" />}
          </div>
          {b.rejectionReason && b.status !== "approved" && <p className="mt-1 max-w-xs text-xs text-danger">{b.rejectionReason}</p>}
        </div>
      ),
    },
    { key: "status", label: "Status", sortable: true, cell: (b) => <StatusBadge status={b.status} /> },
    { key: "location", label: "Location", cell: (b) => (b.cityName ? `${b.cityName}${b.stateCode ? `, ${b.stateCode}` : ""}` : "—") },
    { key: "owner", label: "Owner", cell: (b) => (b.ownerEmail ? <span className="text-xs">{b.ownerEmail}</span> : <span className="text-xs text-muted-foreground">Unclaimed</span>) },
    { key: "reviews", label: "Reviews", sortable: true, className: "text-right", cell: (b) => <span className="tabular-nums">{b.reviewCount ? `${Number(b.avgRating).toFixed(1)} · ${b.reviewCount}` : "0"}</span> },
    { key: "created", label: "Created", sortable: true, cell: (b) => <span className="whitespace-nowrap text-xs">{fmtDate(b.createdAt)}</span> },
  ];

  return (
    <BulkProvider>
      <Toolbar>
        <FilterTabs
          basePath="/admin/businesses"
          sp={sp}
          param="status"
          value={p.status}
          options={[
            { value: undefined, label: "All", count: all },
            ...BUSINESS_STATUSES.map((st) => ({ value: st, label: st === "pending_review" ? "Pending review" : st[0]!.toUpperCase() + st.slice(1), count: statusCounts[st] ?? 0 })),
          ]}
        />
        <SearchForm basePath="/admin/businesses" sp={sp} placeholder="Search name, slug or phone" keep={["status", "filter"]} />
      </Toolbar>
      <BusinessBulkBar />
      <div className="mt-3">
        <AdminTable
          rows={rows}
          columns={columns}
          basePath="/admin/businesses"
          sp={sp}
          total={total}
          page={p.page}
          selectable
          title={(b) => b.name}
          actions={(b) => (
            <>
              {b.status !== "approved" && (
                <ActionButton size="sm" action={moderateBusinesses} input={{ ids: [b.id], decision: "approve" as const }}>
                  Approve
                </ActionButton>
              )}
              {b.status === "pending_review" && (
                <ActionButton size="sm" variant="outline" action={moderateBusinesses} input={{ ids: [b.id], decision: "request_changes" as const }} reason={{ title: `Request changes to ${b.name}`, label: "What should the owner change?", confirmLabel: "Send request" }}>
                  Request changes
                </ActionButton>
              )}
              {(b.status === "pending_review" || b.status === "approved") && (
                <ActionButton
                  size="sm"
                  variant="outline"
                  action={moderateBusinesses}
                  input={{ ids: [b.id], decision: b.status === "approved" ? ("suspend" as const) : ("reject" as const) }}
                  reason={{ title: `${b.status === "approved" ? "Suspend" : "Reject"} ${b.name}`, label: "Reason shown to the owner", confirmLabel: b.status === "approved" ? "Suspend" : "Reject", destructive: true }}
                >
                  {b.status === "approved" ? "Suspend" : "Reject"}
                </ActionButton>
              )}
              <ActionButton size="icon-sm" variant="ghost" action={setFeatured} input={{ ids: [b.id], featured: !b.featured }} aria-label={b.featured ? "Remove from featured" : "Feature"} title={b.featured ? "Remove from featured" : "Feature"}>
                {b.featured ? <StarOff aria-hidden /> : <Star aria-hidden />}
              </ActionButton>
              <Button asChild size="icon-sm" variant="ghost" aria-label={`Edit ${b.name}`} title="Edit">
                <Link href={`/dashboard/businesses/${b.id}/edit`}>
                  <Pencil aria-hidden />
                </Link>
              </Button>
              {b.status === "approved" && (
                <Button asChild size="icon-sm" variant="ghost" aria-label={`View ${b.name}`} title="View public page">
                  <Link href={`/biz/${b.slug}`} target="_blank">
                    <ExternalLink aria-hidden />
                  </Link>
                </Button>
              )}
              <MergeDialog sourceId={b.id} sourceName={b.name} />
              <ActionButton
                size="icon-sm"
                variant="ghost"
                action={deleteBusinesses}
                input={{ ids: [b.id] }}
                confirm={{ title: `Delete ${b.name}?`, description: "The listing is hidden immediately and can be restored for 30 days.", confirmLabel: "Delete" }}
                aria-label={`Delete ${b.name}`}
                title="Delete"
              >
                <Trash2 aria-hidden className="text-danger" />
              </ActionButton>
            </>
          )}
          empty={
            <EmptyState
              icon={<Building2 />}
              title={p.q ? "No listings match your search" : "Nothing in this queue"}
              description={p.q ? "Try a different name, slug or phone number." : "New submissions will appear here for review."}
              action={
                <Button asChild variant="outline">
                  <Link href="/admin/businesses">View all listings</Link>
                </Button>
              }
            />
          }
        />
      </div>
    </BulkProvider>
  );
}
