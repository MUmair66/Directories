import Link from "next/link";
import { Suspense } from "react";
import { Bell, Building2, Inbox, LifeBuoy, ShieldCheck, Star } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { AutoRefresh, LocalDate } from "@/components/dashboard/helpers";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { MarkAllReadButton } from "@/components/dashboard/simple-actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

const ICONS = { review: Star, lead: Inbox, ticket: LifeBuoy, listing_status: Building2, claim: ShieldCheck } as const;

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Notifications />
    </Suspense>
  );
}

async function Notifications() {
  const user = await requireUser();
  const items = await getNotifications(user.id);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <AutoRefresh />
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Notifications" }]}
        action={<MarkAllReadButton disabled={!unread} />}
      />
      {items.length === 0 ? (
        <EmptyState icon={<Bell />} title="No notifications yet" description="New reviews, leads, ticket replies and listing updates show up here." action={<Link href="/dashboard/security#notifications" className="text-sm font-semibold text-primary hover:underline">Notification settings</Link>} />
      ) : (
        <Card className="divide-y divide-border">
          {items.map((n) => {
            const Icon = ICONS[n.type as keyof typeof ICONS] ?? Bell;
            const body = (
              <div className={cn("flex gap-3 p-4", !n.readAt && "bg-secondary/40")}>
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.readAt && "font-semibold")}>
                    {n.title}
                    {!n.readAt && <span className="sr-only"> (unread)</span>}
                  </p>
                  {n.body && <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="text-xs text-muted-foreground">
                    <LocalDate value={n.createdAt} withTime />
                  </p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block hover:bg-muted">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </Card>
      )}
    </>
  );
}
