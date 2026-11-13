import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Paperclip } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTicket } from "@/lib/data/dashboard";
import { sanitizeHtml } from "@/lib/sanitize";
import { PageHeader } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/primitives";
import { PriorityBadge, TicketStatusBadge } from "@/components/dashboard/badges";
import { AutoRefresh, LocalDate } from "@/components/dashboard/helpers";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { TicketReply } from "@/components/dashboard/tickets/ticket-reply";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ticket" };

export default function TicketPage({ params }: PageProps<"/dashboard/tickets/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Ticket params={params} />
    </Suspense>
  );
}

async function Ticket({ params }: { params: PageProps<"/dashboard/tickets/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await getTicket(id, user.id);
  if (!t) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <AutoRefresh />
      <PageHeader
        title={t.subject}
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Support Tickets", href: "/dashboard/tickets" }, { label: `#${t.number}` }]}
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-mono">#{t.number}</span>
        <TicketStatusBadge status={t.status} />
        <PriorityBadge priority={t.priority} />
        <span className="capitalize">{t.category}</span>
        {t.business && <span>· {t.business.name}</span>}
      </div>

      <ol className="grid gap-4" aria-label="Conversation">
        {t.messages.map((m) => {
          const mine = !m.isStaff;
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <Card className={cn("max-w-[90%] p-4 sm:max-w-[80%]", mine ? "border-primary/30 bg-secondary" : "bg-card")}>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  {mine ? "You" : `${m.author?.name ?? "Support"} (Support team)`} · <LocalDate value={m.createdAt} withTime />
                </p>
                <div className="prose-content text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.body) }} />
                {m.attachments.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      <li key={a.id}>
                        <a href={`/dashboard/tickets/attachments/${a.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium hover:text-primary">
                          <Paperclip className="size-3.5" aria-hidden /> {a.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="mt-6 p-5">
        <TicketReply ticketId={t.id} closed={t.status === "closed"} />
      </Card>
    </div>
  );
}
