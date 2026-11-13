import Link from "next/link";
import { Suspense } from "react";
import { Building2, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { completenessScore, getOwnerBusinesses } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Input, NativeSelect } from "@/components/ui/primitives";
import { BusinessAvatar } from "@/components/listing/business-avatar";
import { BusinessStatusBadge, VerificationBadge } from "@/components/dashboard/badges";
import { BusinessActions } from "@/components/dashboard/business/business-actions";
import { LocalDate } from "@/components/dashboard/helpers";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "My Businesses" };

export default function BusinessesPage({ searchParams }: PageProps<"/dashboard/businesses">) {
  return (
    <>
      <PageHeader
        title="My Businesses"
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Businesses" }]}
        action={
          <Button asChild>
            <Link href="/dashboard/businesses/new">
              <Plus /> Add Business
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <BusinessList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const STATUSES = [
  ["all", "All statuses"],
  ["draft", "Draft"],
  ["pending_review", "Pending review"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["suspended", "Suspended"],
] as const;

async function BusinessList({ searchParams }: { searchParams: PageProps<"/dashboard/businesses">["searchParams"] }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const user = await requireUser();
  const rows = await getOwnerBusinesses(user.id, { status, q, includeDeleted: true });
  const filtered = status !== "all" || !!q;

  return (
    <div className="grid gap-4">
      {sp.submitted === "1" && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200" role="status">
          Your listing was submitted. We&apos;ll email you as soon as it&apos;s approved.
        </p>
      )}
      <form className="flex flex-wrap gap-2" role="search">
        <label htmlFor="biz-q" className="sr-only">
          Search by name
        </label>
        <Input id="biz-q" name="q" defaultValue={q} placeholder="Search by name" className="max-w-xs" />
        <label htmlFor="biz-status" className="sr-only">
          Status
        </label>
        <NativeSelect id="biz-status" name="status" defaultValue={status} className="w-48">
          {STATUSES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {filtered && (
          <Button asChild variant="ghost">
            <Link href="/dashboard/businesses">Reset</Link>
          </Button>
        )}
      </form>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState icon={<Building2 />} title="No matching businesses" description="Try a different name or status." action={<Button asChild variant="outline"><Link href="/dashboard/businesses">Clear filters</Link></Button>} />
        ) : (
          <EmptyState
            icon={<Building2 />}
            title="Add your first business"
            description="List your business for free and start getting calls, messages and reviews."
            action={
              <Button asChild>
                <Link href="/dashboard/businesses/new">Add your first business</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-card lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">Business</th>
                  <th scope="col" className="px-4 py-3">Categories</th>
                  <th scope="col" className="px-4 py-3">Location</th>
                  <th scope="col" className="px-4 py-3">Created</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Complete</th>
                  <th scope="col" className="px-4 py-3 text-right">Views (30d)</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((b) => (
                  <tr key={b.id} className={b.deletedAt ? "opacity-60" : undefined}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <BusinessAvatar name={b.name} src={b.logoUrl} size={40} />
                        <div className="min-w-0">
                          <p className="font-semibold">{b.name}</p>
                          {b.status === "approved" && !b.deletedAt ? (
                            <a href={`/biz/${b.slug}`} target="_blank" rel="noopener" className="block max-w-56 truncate text-xs text-primary hover:underline">
                              {SITE_URL.replace(/^https?:\/\//, "")}/biz/{b.slug}
                            </a>
                          ) : (
                            <p className="max-w-56 truncate text-xs text-muted-foreground">/biz/{b.slug}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-muted-foreground">{b.categories ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.cityName ? `${b.cityName}${b.stateCode ? `, ${b.stateCode}` : ""}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground"><LocalDate value={b.createdAt} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        {b.deletedAt ? <Badge tone="danger">Deleted</Badge> : <BusinessStatusBadge status={b.status} />}
                        <VerificationBadge status={b.verificationStatus} />
                        {b.status === "rejected" && b.rejectionReason && <p className="max-w-48 text-xs text-danger">Reason: {b.rejectionReason}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{completenessScore(b.completeness)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{b.views30.toLocaleString("en-US")}</td>
                    <td className="px-4 py-3 text-right">
                      <BusinessActions b={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="grid gap-3 lg:hidden">
            {rows.map((b) => (
              <li key={b.id} className={`rounded-lg border border-border bg-card p-4 shadow-card ${b.deletedAt ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <BusinessAvatar name={b.name} src={b.logoUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{b.categories ?? "No category"}</p>
                    <p className="text-sm text-muted-foreground">{b.cityName ? `${b.cityName}${b.stateCode ? `, ${b.stateCode}` : ""}` : ""}</p>
                  </div>
                  <BusinessActions b={b} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {b.deletedAt ? <Badge tone="danger">Deleted</Badge> : <BusinessStatusBadge status={b.status} />}
                  <VerificationBadge status={b.verificationStatus} />
                  <Badge tone="outline">{completenessScore(b.completeness)}% complete</Badge>
                  <Badge tone="outline">{b.views30} views</Badge>
                </div>
                {b.status === "rejected" && b.rejectionReason && <p className="mt-2 text-sm text-danger">Reason: {b.rejectionReason}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
