import Link from "next/link";
import { Suspense } from "react";
import { Download, Inbox } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLeads, getNotifyPrefs, getOwnerBusinessOptions } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Input, NativeSelect } from "@/components/ui/primitives";
import { AutoRefresh } from "@/components/dashboard/helpers";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { LeadsTable } from "@/components/dashboard/leads-table";

export const metadata = { title: "Leads" };

type SP = PageProps<"/dashboard/leads">["searchParams"];

function parse(sp: Awaited<SP>) {
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const businessId = str(sp.business);
  return {
    businessId: businessId && /^[0-9a-f-]{36}$/i.test(businessId) ? businessId : undefined,
    status: ["new", "contacted", "closed"].includes(str(sp.status) ?? "") ? str(sp.status) : undefined,
    source: ["message", "landing_page", "pricing", "api"].includes(str(sp.source) ?? "") ? str(sp.source) : undefined,
    q: str(sp.q)?.slice(0, 80),
  };
}

export default function LeadsPage({ searchParams }: PageProps<"/dashboard/leads">) {
  return (
    <>
      <PageHeader
        title="Leads"
        description="Messages customers send from your business profile."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Leads" }]}
        action={
          <Suspense fallback={null}>
            <ExportButton searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <Leads searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExportButton({ searchParams }: { searchParams: SP }) {
  const f = parse(await searchParams);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <Button asChild variant="outline">
      <a href={`/dashboard/leads/export${qs ? `?${qs}` : ""}`} download>
        <Download /> Export CSV
      </a>
    </Button>
  );
}

async function Leads({ searchParams }: { searchParams: SP }) {
  const f = parse(await searchParams);
  const user = await requireUser();
  const [leads, businesses, notify] = await Promise.all([getLeads(user.id, f), getOwnerBusinessOptions(user.id), getNotifyPrefs(user.id)]);
  const filtered = !!(f.businessId || f.status || f.source || f.q);
  return (
    <div className="grid gap-4">
      <AutoRefresh />
      <form className="flex flex-wrap gap-2" role="search" aria-label="Filter leads">
        <label className="sr-only" htmlFor="lq">Search leads</label>
        <Input id="lq" name="q" defaultValue={f.q} placeholder="Search name, email or message" className="max-w-xs" />
        <label className="sr-only" htmlFor="lb">Business</label>
        <NativeSelect id="lb" name="business" defaultValue={f.businessId ?? ""} className="w-52">
          <option value="">All businesses</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </NativeSelect>
        <label className="sr-only" htmlFor="ls">Status</label>
        <NativeSelect id="ls" name="status" defaultValue={f.status ?? ""} className="w-40">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </NativeSelect>
        <label className="sr-only" htmlFor="lsrc">Source</label>
        <NativeSelect id="lsrc" name="source" defaultValue={f.source ?? ""} className="w-44">
          <option value="">All sources</option>
          <option value="message">Profile message</option>
          <option value="api">API</option>
        </NativeSelect>
        <Button type="submit" variant="outline">Filter</Button>
        {filtered && (
          <Button asChild variant="ghost">
            <Link href="/dashboard/leads">Reset</Link>
          </Button>
        )}
      </form>
      {leads.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={filtered ? "No leads match these filters" : "No leads yet"}
          description={filtered ? "Try different filters." : "When customers message you from your business profile, they'll appear here."}
          action={
            filtered ? (
              <Button asChild variant="outline"><Link href="/dashboard/leads">Clear filters</Link></Button>
            ) : (
              <Button asChild><Link href="/dashboard/businesses">View my businesses</Link></Button>
            )
          }
        />
      ) : (
        <LeadsTable leads={leads} notify={notify} />
      )}
    </div>
  );
}
