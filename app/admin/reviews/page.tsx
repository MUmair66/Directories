import Link from "next/link";
import { Suspense } from "react";
import { MessageSquareWarning } from "lucide-react";
import { listParams, listReviews, requireStaff, type RawSP } from "@/lib/data/admin";
import { moderateReview } from "@/app/actions/admin/moderation";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { FilterTabs, SearchForm, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";
import { Stars } from "@/components/listing/stars";

export const metadata = { title: "Reviews" };
type Props = { searchParams: Promise<RawSP> };
type Row = Awaited<ReturnType<typeof listReviews>>["rows"][number];

export default function AdminReviewsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader title="Reviews" description="Reported reviews, hidden reviews and spam. Ratings recalculate on every change." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Reviews" }]} />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <Reviews searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Reviews({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const { rows, total, view } = await listReviews(p);
  const columns: Column<Row>[] = [
    {
      key: "review",
      label: "Review",
      hideOnMobile: true,
      cell: (r) => (
        <div className="grid max-w-xl gap-1">
          <Stars rating={r.rating} size={14} />
          <p className="line-clamp-4 whitespace-pre-line text-sm">{r.body}</p>
          {r.reports.length > 0 && (
            <ul className="mt-1 grid gap-1">
              {r.reports.map((rep, i) => (
                <li key={i} className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                  Reported: {rep.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      key: "business",
      label: "Business",
      cell: (r) => (
        <Link href={`/biz/${r.businessSlug}#reviews`} target="_blank" className="font-medium hover:text-primary">
          {r.businessName}
        </Link>
      ),
    },
    { key: "author", label: "Author", cell: (r) => <div className="text-sm">{r.userName}<p className="text-xs text-muted-foreground">{r.userEmail}</p></div> },
    { key: "status", label: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "date", label: "Posted", cell: (r) => <span className="whitespace-nowrap text-xs">{fmtDate(r.createdAt)}</span> },
  ];
  return (
    <>
      <Toolbar>
        <FilterTabs
          basePath="/admin/reviews"
          sp={sp}
          param="filter"
          value={view === "reported" ? undefined : view}
          options={[
            { value: undefined, label: "Reported" },
            { value: "all", label: "All" },
            { value: "hidden", label: "Hidden" },
            { value: "spam", label: "Spam" },
          ]}
        />
        <SearchForm basePath="/admin/reviews" sp={sp} placeholder="Search text or business" keep={["filter"]} />
      </Toolbar>
      <AdminTable
        rows={rows}
        columns={columns}
        basePath="/admin/reviews"
        sp={sp}
        total={total}
        page={p.page}
        title={(r) => (
          <div className="grid gap-1 font-normal">
            <Stars rating={r.rating} size={14} />
            <p className="line-clamp-4 text-sm">{r.body}</p>
            {r.reports.map((rep, i) => (
              <p key={i} className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                Reported: {rep.reason}
              </p>
            ))}
          </div>
        )}
        actions={(r) => (
          <>
            {r.reports.length > 0 && (
              <ActionButton size="sm" variant="outline" action={moderateReview} input={{ id: r.id, decision: "dismiss" as const }}>
                Keep
              </ActionButton>
            )}
            {r.status === "published" ? (
              <ActionButton size="sm" variant="outline" action={moderateReview} input={{ id: r.id, decision: "hide" as const }}>
                Hide
              </ActionButton>
            ) : (
              <ActionButton size="sm" variant="outline" action={moderateReview} input={{ id: r.id, decision: "publish" as const }}>
                Publish
              </ActionButton>
            )}
            {r.status !== "spam" && (
              <ActionButton size="sm" variant="outline" action={moderateReview} input={{ id: r.id, decision: "spam" as const }}>
                Spam
              </ActionButton>
            )}
            <ActionButton
              size="sm"
              variant="destructive"
              action={moderateReview}
              input={{ id: r.id, decision: "delete" as const }}
              confirm={{ title: "Delete this review?", description: "The review is removed from the listing and its rating is recalculated.", confirmLabel: "Delete review" }}
            >
              Delete
            </ActionButton>
          </>
        )}
        empty={
          <EmptyState
            icon={<MessageSquareWarning />}
            title={view === "reported" ? "No reported reviews" : "No reviews here"}
            description={view === "reported" ? "Reports from users and owners land here for a decision." : "Try another filter or search."}
            action={
              <Button asChild variant="outline">
                <Link href="/admin/reviews?filter=all">Browse all reviews</Link>
              </Button>
            }
          />
        }
      />
    </>
  );
}
