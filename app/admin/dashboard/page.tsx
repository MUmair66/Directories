import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Building2, CalendarPlus, ExternalLink, Inbox, LayoutTemplate, LifeBuoy, MessageSquareWarning, Plus, Send, ShieldCheck, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/components/admin/toolbar";
import { getOverview, requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { SignupsChart } from "@/components/admin/signups-chart";

export const metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader
        title="Admin overview"
        description="Directory health and everything waiting for review."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/" target="_blank" rel="noopener">
                <ExternalLink aria-hidden /> View website
              </a>
            </Button>
            <Button asChild>
              <Link href="/admin/landing-pages/new">
                <Plus aria-hidden /> New landing page
              </Link>
            </Button>
          </div>
        }
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  await requireStaff();
  const { stats, signups, topCategories, pending } = await getOverview();
  const totals = [
    { label: "Total listings", value: stats.businesses, sub: `${(stats.approved ?? 0).toLocaleString("en-US")} approved`, icon: Building2 },
    { label: "New listings today", value: stats.new_today, icon: CalendarPlus },
    { label: "Users", value: stats.users, sub: `${(stats.signups_30d ?? 0).toLocaleString("en-US")} in 30 days`, icon: Users },
    { label: "Reviews", value: stats.reviews, icon: Star },
    { label: "Landing pages live", value: stats.landing_live, sub: `${(stats.landing_total ?? 0).toLocaleString("en-US")} total`, icon: LayoutTemplate },
    { label: "Leads, last 30 days", value: stats.leads_30d, sub: "Messages and landing page requests", icon: Send },
  ];
  const queues = [
    { label: "Listings pending review", value: stats.pending_listings, href: "/admin/businesses?status=pending_review", icon: Building2 },
    { label: "Ownership claims", value: stats.pending_claims, href: "/admin/claims", icon: ShieldCheck },
    { label: "Document verifications", value: stats.pending_verifications, href: "/admin/verifications", icon: BadgeCheck },
    { label: "Reported reviews", value: stats.reported_reviews, href: "/admin/reviews", icon: MessageSquareWarning },
    { label: "Open tickets", value: stats.open_tickets, href: "/admin/tickets", icon: LifeBuoy },
    { label: "Unread messages", value: stats.unread_inbox, href: "/admin/inbox", icon: Inbox },
  ];
  const maxCat = Math.max(1, ...topCategories.map((c) => c.total));
  return (
    <div className="grid gap-6">
      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {totals.map((t) => (
          <Card key={t.label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{t.label}</p>
                <p className="mt-1 font-heading text-3xl font-bold tabular-nums">{(t.value ?? 0).toLocaleString("en-US")}</p>
                {t.sub && <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>}
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <t.icon className="size-5" aria-hidden />
              </span>
            </div>
          </Card>
        ))}
      </section>

      <section aria-labelledby="queues-heading">
        <h2 id="queues-heading" className="mb-3 text-lg font-bold">
          Review queues
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {queues.map((q) => (
            <li key={q.label}>
              <Link href={q.href} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40">
                <q.icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1 text-sm font-medium">{q.label}</span>
                <span className={q.value ? "rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-white" : "text-sm text-muted-foreground"}>{q.value ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Waiting for approval</CardTitle>
          <Link href="/admin/businesses?status=pending_review" className="text-sm font-semibold text-primary hover:underline">
            Open queue
          </Link>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listings waiting. New submissions from owners appear here and stay off the website until approved.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <Building2 className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[b.cityName, b.stateCode].filter(Boolean).join(", ") || "No location"} · by {b.ownerName ?? "unknown"} · submitted {fmtDate(b.submittedAt)}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/businesses?status=pending_review&q=${encodeURIComponent(b.name)}`}>Review</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Signups, last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SignupsChart data={signups} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top categories</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length ? (
              <ol className="grid gap-3">
                {topCategories.map((c) => (
                  <li key={c.slug} className="grid gap-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <Link href={`/categories/${c.slug}`} className="truncate font-medium hover:text-primary">
                        {c.name}
                      </Link>
                      <span className="tabular-nums text-muted-foreground">{c.total.toLocaleString("en-US")}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted" aria-hidden>
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Category counts appear after the next count refresh (every 15 minutes).</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}
