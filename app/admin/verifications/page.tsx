import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";
import { listDocumentVerifications, listParams, requireStaff, type RawSP } from "@/lib/data/admin";
import { approveVerification, rejectVerification } from "@/app/actions/admin/moderation";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { FilterTabs, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";
import { DocumentLink } from "@/components/admin/document-link";
import { formatPhone } from "@/lib/text";

export const metadata = { title: "Verifications" };
type Props = { searchParams: Promise<RawSP> };
type Row = Awaited<ReturnType<typeof listDocumentVerifications>>["rows"][number];

export default function VerificationsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Document verifications"
        description="Owners who chose document upload instead of an SMS or email code. Approve to add the Verified badge."
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Verifications" }]}
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <Verifications searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Verifications({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const { rows, total, status } = await listDocumentVerifications(p);
  const columns: Column<Row>[] = [
    {
      key: "business",
      label: "Business",
      cell: (v) => (
        <div>
          <Link href={`/dashboard/businesses/${v.businessId}/edit`} className="font-semibold hover:text-primary">
            {v.businessName}
          </Link>
          <p className="text-xs text-muted-foreground">{v.businessPhone ? formatPhone(v.businessPhone) : "No phone"}</p>
        </div>
      ),
    },
    { key: "owner", label: "Submitted by", cell: (v) => <div className="text-sm">{v.userName}<p className="text-xs text-muted-foreground">{v.userEmail}</p></div> },
    { key: "doc", label: "Document", cell: (v) => (v.documentKey ? <DocumentLink kind="verification" id={v.id} name={v.documentName ?? "Document"} /> : "—") },
    { key: "status", label: "Status", cell: (v) => <div><StatusBadge status={v.status} />{v.rejectionReason && <p className="mt-1 text-xs text-danger">{v.rejectionReason}</p>}</div> },
    { key: "date", label: "Submitted", cell: (v) => <span className="text-xs">{fmtDate(v.createdAt, true)}</span> },
  ];
  return (
    <>
      <Toolbar>
        <FilterTabs
          basePath="/admin/verifications"
          sp={sp}
          param="status"
          value={status === "pending" ? undefined : status}
          options={[
            { value: undefined, label: "Pending" },
            { value: "verified", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </Toolbar>
      <AdminTable
        rows={rows}
        columns={columns}
        basePath="/admin/verifications"
        sp={sp}
        total={total}
        page={p.page}
        title={(v) => v.businessName}
        actions={(v) =>
          v.status === "pending" ? (
            <>
              <ActionButton size="sm" action={approveVerification} input={{ id: v.id }}>
                Approve
              </ActionButton>
              <ActionButton size="sm" variant="outline" action={rejectVerification} input={{ id: v.id }} reason={{ title: `Reject verification for ${v.businessName}`, label: "Reason shown to the owner", confirmLabel: "Reject", destructive: true }}>
                Reject
              </ActionButton>
            </>
          ) : null
        }
        empty={
          <EmptyState
            icon={<BadgeCheck />}
            title="No document verifications here"
            description="Most owners verify instantly by SMS or email code. Document uploads that need a manual check appear here."
            action={
              <Button asChild variant="outline">
                <Link href="/admin/businesses">Go to businesses</Link>
              </Button>
            }
          />
        }
      />
    </>
  );
}
