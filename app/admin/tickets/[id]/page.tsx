import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Paperclip } from "lucide-react";
import { getTicketAdmin, listStaff, requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { StatusBadge, fmtDate } from "@/components/admin/toolbar";
import { TicketControls, TicketReplyForm } from "@/components/admin/ticket-tools";
import { sanitizeHtml } from "@/lib/sanitize";
import { formatPhone } from "@/lib/text";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ticket" };
type Props = { params: Promise<{ id: string }> };

export default function AdminTicketPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
      <Ticket params={params} />
    </Suspense>
  );
}

async function Ticket({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [t, staff] = await Promise.all([getTicketAdmin(id), listStaff()]);
  if (!t) notFound();
  return (
    <>
      <PageHeader title={`#${t.number} ${t.subject}`} crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Tickets", href: "/admin/tickets" }, { label: `#${t.number}` }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid content-start gap-4">
          <ol className="grid gap-3" aria-label="Conversation">
            {t.messages.map((m) => (
              <li key={m.id} className={cn("flex", m.isStaff ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[90%] rounded-lg border p-4 shadow-card sm:max-w-[80%]", m.isStaff ? "border-primary/30 bg-secondary" : "border-border bg-card")}>
                  <p className="mb-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{m.isStaff ? `${m.author?.name ?? "Staff"} (staff)` : (m.author?.name ?? t.user.name)}</span> · {fmtDate(m.createdAt, true)}
                  </p>
                  <div className="prose-content text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.body) }} />
                  {m.attachments.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {m.attachments.map((a) => (
                        <li key={a.id} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs">
                          <Paperclip className="size-3.5" aria-hidden /> {a.fileName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <Card>
            <CardContent className="pt-6">
              <TicketReplyForm ticketId={t.id} />
            </CardContent>
          </Card>
        </div>
        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex gap-2">
                <StatusBadge status={t.status} />
                <StatusBadge status={t.priority} />
              </div>
              <p>
                <span className="text-muted-foreground">From:</span> {t.user.name}
                <br />
                <a href={`mailto:${t.email ?? t.user.email}`} className="text-primary hover:underline">
                  {t.email ?? t.user.email}
                </a>
                {t.phone && (
                  <>
                    <br />
                    <a href={`tel:${t.phone}`} className="hover:text-primary">{formatPhone(t.phone)}</a>
                  </>
                )}
              </p>
              <p className="capitalize">
                <span className="normal-case text-muted-foreground">Category:</span> {t.category}
              </p>
              {t.business && (
                <p>
                  <span className="text-muted-foreground">Business:</span>{" "}
                  <Link href={`/dashboard/businesses/${t.business.id}/edit`} className="text-primary hover:underline">
                    {t.business.name}
                  </Link>
                </p>
              )}
              <p className="text-xs text-muted-foreground">Opened {fmtDate(t.createdAt, true)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Manage</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketControls ticketId={t.id} status={t.status} priority={t.priority} assignedTo={t.assignedTo} staff={staff} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
