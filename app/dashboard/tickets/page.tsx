import Link from "next/link";
import { Suspense } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTickets } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Input, NativeSelect } from "@/components/ui/primitives";
import { PriorityBadge, TicketStatusBadge } from "@/components/dashboard/badges";
import { AutoRefresh, LocalDate } from "@/components/dashboard/helpers";
import { PageSkeleton } from "@/components/dashboard/skeletons";

export const metadata = { title: "Support Tickets" };

export default function TicketsPage({ searchParams }: PageProps<"/dashboard/tickets">) {
  return (
    <>
      <PageHeader
        title="Support Tickets"
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Support Tickets" }]}
        action={
          <Button asChild>
            <Link href="/dashboard/tickets/new">
              <Plus /> New ticket
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <Tickets searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const CATEGORY: Record<string, string> = { listing: "Listing", billing: "Billing", technical: "Technical", claim: "Claim", other: "Other" };

async function Tickets({ searchParams }: { searchParams: PageProps<"/dashboard/tickets">["searchParams"] }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && ["open", "awaiting_reply", "resolved", "closed"].includes(sp.status) ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : undefined;
  const user = await requireUser();
  const tickets = await getTickets(user.id, { status, q });
  const filtered = !!(status || q);

  return (
    <div className="grid gap-4">
      <AutoRefresh />
      <form className="flex flex-wrap gap-2" role="search" aria-label="Filter tickets">
        <label htmlFor="tq" className="sr-only">Search tickets</label>
        <Input id="tq" name="q" defaultValue={q} placeholder="Search subject or #number" className="max-w-xs" />
        <label htmlFor="ts" className="sr-only">Status</label>
        <NativeSelect id="ts" name="status" defaultValue={status ?? ""} className="w-48">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="awaiting_reply">Awaiting your reply</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </NativeSelect>
        <Button type="submit" variant="outline">Filter</Button>
        {filtered && (
          <Button asChild variant="ghost">
            <Link href="/dashboard/tickets">Reset</Link>
          </Button>
        )}
      </form>
      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy />}
          title={filtered ? "No tickets match" : "No support tickets"}
          description={filtered ? "Try a different search or status." : "Need help with a listing, a claim or billing? Our team usually replies within 1 business day."}
          action={
            <Button asChild>
              <Link href="/dashboard/tickets/new">New ticket</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">Ticket</th>
                  <th scope="col" className="px-4 py-3">Subject</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Priority</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Created</th>
                  <th scope="col" className="px-4 py-3">Last reply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-muted-foreground">#{t.number}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/tickets/${t.id}`} className="font-semibold hover:text-primary">
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{CATEGORY[t.category]}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><TicketStatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground"><LocalDate value={t.createdAt} /></td>
                    <td className="px-4 py-3 text-muted-foreground"><LocalDate value={t.lastReplyAt} withTime /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/dashboard/tickets/${t.id}`} className="block rounded-lg border border-border bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{t.number}</span>
                    <TicketStatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 font-semibold">{t.subject}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <PriorityBadge priority={t.priority} /> {CATEGORY[t.category]} · <LocalDate value={t.createdAt} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
