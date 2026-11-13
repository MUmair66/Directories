import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { listClaims, listParams, requireStaff, type RawSP } from "@/lib/data/admin";
import { approveClaim, rejectClaim } from "@/app/actions/admin/moderation";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { FilterTabs, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";
import { DocumentLink } from "@/components/admin/document-link";
import { Pagination } from "@/components/listing/pagination";
import { hrefWith } from "@/components/admin/table";
import { ADMIN_PAGE_SIZE } from "@/lib/data/admin";
import { formatPhone } from "@/lib/text";

export const metadata = { title: "Claims" };
type Props = { searchParams: Promise<RawSP> };

export default function ClaimsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader title="Ownership claims" description="Check each claimant's documents before transferring a listing." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Claims" }]} />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <Claims searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Claims({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const { rows, total, status } = await listClaims(p);
  return (
    <>
      <Toolbar>
        <FilterTabs
          basePath="/admin/claims"
          sp={sp}
          param="status"
          value={status === "pending" ? undefined : status}
          options={[
            { value: undefined, label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </Toolbar>
      {rows.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title={status === "pending" ? "No claims waiting" : `No ${status} claims`}
          description="When someone claims a listing, their request and documents show up here."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/businesses">Go to businesses</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4">
          {rows.map((c) => (
            <li key={c.id}>
              <Card className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_auto]">
                <div className="grid content-start gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business</p>
                  <Link href={`/biz/${c.business.slug}`} target="_blank" className="font-semibold hover:text-primary">
                    {c.business.name}
                  </Link>
                  {c.business.claimed && <p className="text-xs text-amber-700 dark:text-amber-300">Already claimed by another owner. Approving transfers ownership.</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-muted-foreground">Submitted {fmtDate(c.createdAt, true)}</span>
                  </div>
                  {c.rejectionReason && <p className="text-xs text-danger">Reason: {c.rejectionReason}</p>}
                </div>
                <div className="grid content-start gap-1 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Claimant</p>
                  <p className="font-medium">{c.name}</p>
                  <p>
                    <a className="hover:text-primary" href={`mailto:${c.email}`}>
                      {c.email}
                    </a>{" "}
                    · <a href={`tel:${c.phone}`} className="hover:text-primary">{formatPhone(c.phone)}</a>
                  </p>
                  <p className="text-xs text-muted-foreground">Account: {c.user.email}</p>
                  {c.details && <p className="mt-1 whitespace-pre-line rounded-md bg-surface p-2 text-sm">{c.details}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.documents.length ? c.documents.map((d) => <DocumentLink key={d.id} kind="claim" id={d.id} name={d.fileName} />) : <span className="text-xs text-muted-foreground">No documents</span>}
                  </div>
                </div>
                {c.status === "pending" && (
                  <div className="flex flex-row flex-wrap items-start gap-2 lg:flex-col">
                    <ActionButton
                      action={approveClaim}
                      input={{ id: c.id }}
                      confirm={{ title: "Approve this claim?", description: `${c.name} becomes the owner of ${c.business.name}. Other pending claims for this business are rejected.`, confirmLabel: "Approve & transfer", destructive: false }}
                    >
                      Approve
                    </ActionButton>
                    <ActionButton variant="outline" action={rejectClaim} input={{ id: c.id }} reason={{ title: "Reject claim", label: "Reason emailed to the claimant", confirmLabel: "Reject claim", destructive: true }}>
                      Reject
                    </ActionButton>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <Pagination page={p.page} totalPages={Math.ceil(total / ADMIN_PAGE_SIZE)} hrefFor={(n) => hrefWith("/admin/claims", sp, { page: n === 1 ? undefined : n })} />
      </div>
    </>
  );
}
