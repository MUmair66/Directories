import Link from "next/link";
import { Suspense } from "react";
import { Inbox, Mail, MailOpen, Trash2 } from "lucide-react";
import { ADMIN_PAGE_SIZE, listContactSubmissions, listParams, listPricingLeads, requireStaff, type RawSP } from "@/lib/data/admin";
import { deleteSubmission, markSubmissionRead } from "@/app/actions/admin/tickets";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { FilterTabs, SearchForm, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";
import { LeadStatusSelect } from "@/components/admin/ticket-tools";
import { Pagination } from "@/components/listing/pagination";
import { hrefWith } from "@/components/admin/table";
import { formatPhone } from "@/lib/text";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inbox" };
type Props = { searchParams: Promise<RawSP> };

export default function AdminInboxPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader title="Inbox" description="Contact form messages and pricing-plan leads." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Inbox" }]} />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <InboxView searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function InboxView({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const tab = p.one("tab") === "pricing" ? "pricing" : "contact";
  return (
    <>
      <Toolbar>
        <div className="flex flex-wrap gap-2">
          <FilterTabs basePath="/admin/inbox" sp={{}} param="tab" value={tab === "contact" ? undefined : "pricing"} options={[{ value: undefined, label: "Contact messages" }, { value: "pricing", label: "Pricing leads" }]} />
          {tab === "contact" && <FilterTabs basePath="/admin/inbox" sp={sp} param="filter" value={p.filter} options={[{ value: undefined, label: "All" }, { value: "unread", label: "Unread" }]} />}
        </div>
        <SearchForm basePath="/admin/inbox" sp={sp} placeholder="Search name, email or message" keep={["tab", "filter"]} />
      </Toolbar>
      {tab === "contact" ? <Contact sp={sp} /> : <Pricing sp={sp} />}
    </>
  );
}

async function Contact({ sp }: { sp: RawSP }) {
  const p = listParams(sp);
  const { rows, total } = await listContactSubmissions(p);
  if (!rows.length) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="No messages"
        description="Contact and FAQ form submissions land here."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/inbox">Clear filters</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <ul className="grid gap-3">
        {rows.map((m) => (
          <li key={m.id}>
            <Card className={cn("p-4", !m.readAt && "border-l-4 border-l-primary")}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {m.firstName} {m.lastName}
                    {m.company && <span className="font-normal text-muted-foreground"> · {m.company}</span>}
                    {!m.readAt && (
                      <Badge tone="primary" className="ml-2">
                        New
                      </Badge>
                    )}
                    {m.kind === "faq" && (
                      <Badge tone="outline" className="ml-2">
                        FAQ form
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm">
                    <a href={`mailto:${m.email}`} className="text-primary hover:underline">
                      {m.email}
                    </a>
                    {m.phone && (
                      <>
                        {" "}
                        · <a href={`tel:${m.phone}`}>{formatPhone(m.phone)}</a>
                      </>
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{fmtDate(m.createdAt, true)}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                <ActionButton size="sm" variant="outline" action={markSubmissionRead} input={{ id: m.id, read: !m.readAt }}>
                  {m.readAt ? <Mail aria-hidden /> : <MailOpen aria-hidden />} {m.readAt ? "Mark unread" : "Mark read"}
                </ActionButton>
                <Button asChild size="sm" variant="ghost">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}`}>Reply by email</a>
                </Button>
                <ActionButton size="sm" variant="ghost" action={deleteSubmission} input={{ id: m.id }} confirm={{ title: "Delete this message?", description: `From ${m.firstName} ${m.lastName}. This can't be undone.`, confirmLabel: "Delete" }}>
                  <Trash2 className="text-danger" aria-hidden /> Delete
                </ActionButton>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Pagination page={p.page} totalPages={Math.ceil(total / ADMIN_PAGE_SIZE)} hrefFor={(n) => hrefWith("/admin/inbox", sp, { page: n === 1 ? undefined : n })} />
      </div>
    </>
  );
}

async function Pricing({ sp }: { sp: RawSP }) {
  const p = listParams(sp);
  const { rows, total } = await listPricingLeads(p);
  if (!rows.length) return <EmptyState icon={<Inbox />} title="No pricing leads yet" description="Leads from plan buttons on the pricing page show up here." />;
  return (
    <>
      <ul className="grid gap-3">
        {rows.map((l) => {
          const meta = (l.meta ?? {}) as { plan?: string; billing?: string; company?: string | null };
          return (
            <li key={l.id}>
              <Card className="flex flex-wrap items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {l.name}
                    {meta.company && <span className="font-normal text-muted-foreground"> · {meta.company}</span>}
                  </p>
                  <p className="text-sm">
                    {l.email && (
                      <a href={`mailto:${l.email}`} className="text-primary hover:underline">
                        {l.email}
                      </a>
                    )}
                    {l.phone && <> · {formatPhone(l.phone)}</>}
                  </p>
                  <p className="mt-1 text-sm">
                    <Badge tone="primary">{meta.plan ?? "Plan"}</Badge> <span className="text-muted-foreground capitalize">{meta.billing}</span>
                  </p>
                  {l.message && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{l.message}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted-foreground">{fmtDate(l.createdAt, true)}</span>
                  <LeadStatusSelect id={l.id} status={l.status} />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      <div className="mt-6">
        <Pagination page={p.page} totalPages={Math.ceil(total / ADMIN_PAGE_SIZE)} hrefFor={(n) => hrefWith("/admin/inbox", sp, { page: n === 1 ? undefined : n })} />
      </div>
    </>
  );
}
