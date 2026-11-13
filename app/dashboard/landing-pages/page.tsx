import Link from "next/link";
import { Suspense } from "react";
import { Eye, ExternalLink, Inbox, LayoutTemplate, LifeBuoy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOwnerLandingPages } from "@/lib/data/landing";
import { SITE_URL } from "@/lib/site";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { CopyUrlButton } from "@/components/dashboard/copy-url-button";

export const metadata = { title: "Landing Pages" };

/** Owners see the landing pages our team built for their businesses. They can't create or edit them. */
export default function OwnerLandingPages() {
  return (
    <>
      <PageHeader
        title="Landing Pages"
        description="High-converting pages our team designs for your business. Leads from these pages arrive in your Leads inbox."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Landing Pages" }]}
      />
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <Pages />
      </Suspense>
    </>
  );
}

async function Pages() {
  const user = await requireUser();
  const pages = await listOwnerLandingPages(user.id);
  if (!pages.length) {
    return (
      <EmptyState
        icon={<LayoutTemplate />}
        title="No landing pages yet"
        description="Landing pages are created for you by our team. Once a page is ready for your business it will show up here with its link, views and leads."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/tickets/new">
              <LifeBuoy aria-hidden /> Request a landing page
            </Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {pages.map((p) => {
        const live = p.status === "published";
        const url = `${SITE_URL}/${p.slug}`;
        return (
          <li key={p.id}>
            <Card className="flex h-full flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">{p.title}</h2>
                  <p className="text-sm text-muted-foreground">{p.businessName}</p>
                </div>
                <Badge tone={live ? "success" : "warning"}>{live ? "Live" : "Being prepared"}</Badge>
              </div>
              <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">{url}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="size-4" aria-hidden /> Views
                  </dt>
                  <dd className="text-2xl font-bold tabular-nums">{p.views.toLocaleString("en-US")}</dd>
                </div>
                <div className="rounded-md border border-border p-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Inbox className="size-4" aria-hidden /> Leads
                  </dt>
                  <dd className="text-2xl font-bold tabular-nums">{p.leads}</dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-wrap gap-2">
                {live ? (
                  <>
                    <Button asChild size="sm">
                      <a href={`/${p.slug}`} target="_blank" rel="noopener">
                        <ExternalLink aria-hidden /> Open page
                      </a>
                    </Button>
                    <CopyUrlButton url={url} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Our team is still working on this page. You&apos;ll get a notification when it goes live.</p>
                )}
                {p.leads > 0 && (
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/dashboard/leads">View leads</Link>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Want changes to text, photos or colors? <Link href="/dashboard/tickets/new" className="font-semibold text-primary hover:underline">Open a support ticket</Link>.</p>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
