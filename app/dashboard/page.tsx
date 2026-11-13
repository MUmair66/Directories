import Link from "next/link";
import { Suspense } from "react";
import { Bell, Building2, CheckCircle2, Circle, Clock, ExternalLink, Eye, Globe, Inbox, LayoutTemplate, MessageSquare, Phone, Plus, Star, StarHalf, UserRound } from "lucide-react";
import { listOwnerLandingPages } from "@/lib/data/landing";
import { requireUser } from "@/lib/auth";
import {
  COMPLETENESS_LABELS,
  completenessScore,
  getAccount,
  getOverviewTotals,
  getOwnerBusinesses,
  getRecentActivity,
  getStatsSeries,
  type Completeness,
} from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/primitives";
import { Sparkline } from "@/components/dashboard/charts";
import { AutoRefresh, LocalDate } from "@/components/dashboard/helpers";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { BusinessStatusBadge } from "@/components/dashboard/badges";

export const metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <Suspense fallback={<PageSkeleton cards={8} />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await requireUser();
  const [account, totals, series, businesses, activity, landing] = await Promise.all([
    getAccount(user.id),
    getOverviewTotals(user.id),
    getStatsSeries(user.id),
    getOwnerBusinesses(user.id),
    getRecentActivity(user.id),
    listOwnerLandingPages(user.id),
  ]);
  const firstName = account?.firstName || user.name.split(" ")[0] || "there";
  const sum = (k: keyof (typeof series)[number]) => series.reduce((a, p) => a + Number(p[k] ?? 0), 0);
  const kpis = [
    { label: "Profile views", icon: Eye, value: sum("views"), series: series.map((p) => p.views) },
    { label: "Call clicks", icon: Phone, value: sum("calls"), series: series.map((p) => p.calls) },
    { label: "Website clicks", icon: Globe, value: sum("websiteClicks"), series: series.map((p) => p.websiteClicks) },
    { label: "Messages received", icon: MessageSquare, value: sum("messages"), series: series.map((p) => p.messages) },
  ];

  return (
    <>
      <AutoRefresh />
      <PageHeader
        title={`Hello, ${firstName}`}
        description={account?.lastLoginAt ? undefined : "Welcome to your dashboard."}
        crumbs={[{ label: "Dashboard" }]}
        action={
          <Button asChild>
            <Link href="/dashboard/businesses/new">
              <Plus /> Add Business
            </Link>
          </Button>
        }
      />
      {account?.lastLoginAt && (
        <p className="-mt-4 mb-6 text-sm text-muted-foreground">
          Last login: <LocalDate value={account.lastLoginAt} withTime />
        </p>
      )}

      {totals.pending > 0 && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <strong>
              {totals.pending} listing{totals.pending > 1 ? "s are" : " is"} waiting for admin approval.
            </strong>{" "}
            {totals.pending > 1 ? "They go" : "It goes"} live on the website as soon as our team approves {totals.pending > 1 ? "them" : "it"}. We&apos;ll notify you.
          </p>
        </div>
      )}

      <nav aria-label="Quick actions" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["/dashboard/businesses/new", Plus, "Add a business", "Free listing, reviewed by our team"],
            ["/dashboard/profile", UserRound, "Optimize your profile", "Photo, phone and address"],
            ["/dashboard/leads", Inbox, "Check leads", "Messages from customers"],
            ["/dashboard/landing-pages", LayoutTemplate, "Landing pages", landing.length ? `${landing.length} page${landing.length > 1 ? "s" : ""} for your business` : "Built for you by our team"],
          ] as const
        ).map(([href, Icon, title, sub]) => (
          <Link key={href} href={href} className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition group-hover:bg-primary group-hover:text-white">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{title}</span>
              <span className="block truncate text-xs text-muted-foreground">{sub}</span>
            </span>
          </Link>
        ))}
      </nav>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total listings" icon={Building2} value={totals.total} hint={`${totals.approved} approved · ${totals.pending} pending`} />
        <StatCard label="Average rating" icon={StarHalf} value={totals.reviews ? totals.avgRating.toFixed(1) : "—"} hint={totals.reviews ? "Across all listings" : "No reviews yet"} />
        <StatCard label="Total reviews" icon={Star} value={totals.reviews} hint="All time" />
        <StatCard label="Drafts" icon={Circle} value={totals.drafts} hint={totals.drafts ? "Finish and submit for review" : "Nothing waiting"} />
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{k.label}</p>
              <k.icon className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{k.value.toLocaleString("en-US")}</p>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
            <Sparkline data={k.series} label={k.label} />
          </Card>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Listing completeness</CardTitle>
          </CardHeader>
          <CardContent>
            {businesses.length === 0 ? (
              <EmptyState
                icon={<Building2 />}
                title="No businesses yet"
                description="Add your first business to start getting calls and messages."
                action={
                  <Button asChild>
                    <Link href="/dashboard/businesses/new">Add your first business</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-4">
                {businesses.slice(0, 6).map((b) => (
                  <CompletenessRow key={b.id} id={b.id} name={b.name} status={b.status} c={b.completeness} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          {landing.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Your landing pages</CardTitle>
                <Link href="/dashboard/landing-pages" className="text-sm font-semibold text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3">
                  {landing.slice(0, 3).map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                        <LayoutTemplate className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.status === "published" ? `${p.views.toLocaleString("en-US")} views · ${p.leads} leads` : "Being prepared"}
                        </p>
                      </div>
                      {p.status === "published" && (
                        <a href={`/${p.slug}`} target="_blank" rel="noopener" aria-label={`Open ${p.title}`} className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="size-4" aria-hidden />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent activity</CardTitle>
              <Link href="/dashboard/notifications" className="text-sm font-semibold text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">New reviews, leads, ticket replies and listing updates will appear here.</p>
              ) : (
                <ul className="grid gap-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                        <Bell className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{a.link ? <Link href={a.link} className="hover:text-primary">{a.title}</Link> : a.title}</p>
                        {a.body && <p className="line-clamp-1 text-sm text-muted-foreground">{a.body}</p>}
                        <p className="text-xs text-muted-foreground">
                          <LocalDate value={a.createdAt} withTime />
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Account details</CardTitle>
              <Link href="/dashboard/profile" className="text-sm font-semibold text-primary hover:underline">
                Edit
              </Link>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {(
                  [
                    ["Name", account?.name],
                    ["Username", account?.displayUsername || account?.username],
                    ["Email", account?.email],
                    ["Phone", account?.phone],
                    ["Address", account?.address],
                    ["City", account?.city],
                    ["State", account?.state],
                    ["Country", account?.country],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="truncate">
                      {value || (
                        <Link href="/dashboard/profile" className="font-medium text-primary hover:underline">
                          Add
                        </Link>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, icon: Icon, value, hint }: { label: string; icon: typeof Eye; value: number | string; hint: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

function CompletenessRow({ id, name, status, c }: { id: string; name: string; status: string; c: Completeness }) {
  const score = completenessScore(c);
  const missing = (Object.keys(COMPLETENESS_LABELS) as (keyof Completeness)[]).filter((k) => !c[k]);
  return (
    <li className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/businesses/${id}/edit`} className="font-semibold hover:text-primary">
            {name}
          </Link>
          <BusinessStatusBadge status={status} />
        </div>
        <span className="text-sm font-semibold tabular-nums">{score}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`${name} completeness`}>
        <div className={score === 100 ? "h-full bg-success" : "h-full bg-primary"} style={{ width: `${score}%` }} />
      </div>
      {missing.length > 0 ? (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {missing.map((k) => (
            <li key={k} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Circle className="size-3.5" aria-hidden /> {COMPLETENESS_LABELS[k].label}
              </span>
              <Link href={`/dashboard/businesses/${id}/edit?tab=${COMPLETENESS_LABELS[k].tab}`} className="shrink-0 font-semibold text-primary hover:underline">
                Fix now
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="size-4" aria-hidden /> Your listing is complete.
        </p>
      )}
    </li>
  );
}
