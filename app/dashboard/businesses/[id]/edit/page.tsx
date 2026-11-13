import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ExternalLink, History } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getBusinessHistory, getEditableForUser, getFormOptions, toFormBusiness } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { FormSkeleton } from "@/components/dashboard/skeletons";
import { EditTabs } from "@/components/dashboard/business/edit-tabs";
import { BusinessStatusBadge, VerificationBadge } from "@/components/dashboard/badges";
import { LocalDate } from "@/components/dashboard/helpers";

export const metadata = { title: "Edit Business" };

export default function EditBusinessPage({ params }: PageProps<"/dashboard/businesses/[id]/edit">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditLoader params={params} />
    </Suspense>
  );
}

const ACTION_LABELS: Record<string, string> = {
  "business.create": "Created",
  "business.submit": "Submitted for review",
  "business.update.details": "Edited details",
  "business.update.location": "Edited location",
  "business.update.hours": "Edited hours",
  "business.update.media": "Edited media",
  "business.update.seo": "Edited SEO and social",
  "business.verify.sms": "Verified by SMS",
  "business.verify.email": "Verified by email",
  "business.verify.document_submitted": "Submitted verification document",
  "business.delete": "Deleted",
  "business.restore": "Restored",
  "business.duplicate": "Duplicated",
};

async function EditLoader({ params }: { params: PageProps<"/dashboard/businesses/[id]/edit">["params"] }) {
  const { id } = await params;
  const user = await requireUser();
  const raw = await getEditableForUser(id, user);
  if (!raw) notFound();
  const [options, history] = await Promise.all([getFormOptions(), getBusinessHistory(raw.id)]);
  const business = toFormBusiness(raw);
  const staffEdit = raw.ownerId !== user.id;

  return (
    <>
      <PageHeader
        title={business.name}
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: staffEdit ? "Admin edit" : "My Businesses", href: staffEdit ? "/admin/businesses" : "/dashboard/businesses" }, { label: "Edit" }]}
        action={
          business.status === "approved" ? (
            <Button asChild variant="outline">
              <a href={`/biz/${business.slug}`} target="_blank" rel="noopener">
                <ExternalLink /> View live page
              </a>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/dashboard/businesses/${business.id}/preview`}>Preview</Link>
            </Button>
          )
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <BusinessStatusBadge status={business.status} />
        <VerificationBadge status={business.verificationStatus} />
        {staffEdit && <span className="text-sm text-muted-foreground">Editing as staff. Changes are logged.</span>}
      </div>
      {business.status === "approved" && !staffEdit && (
        <p className="mb-6 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          Most edits go live right away. Changes to the business name, categories or address are reviewed by our team before they appear.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <EditTabs business={business} categories={options.categories} states={options.states} />
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" aria-hidden /> Change history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes yet.</p>
            ) : (
              <ol className="grid gap-3">
                {history.map((h) => (
                  <li key={h.id} className="border-l-2 border-border pl-3 text-sm">
                    <p className="font-medium">{ACTION_LABELS[h.action] ?? h.action.replace(/^business\./, "").replace(/[._]/g, " ")}</p>
                    {h.diff && !["business.create"].includes(h.action) && (
                      <p className="text-xs text-muted-foreground">{Object.keys(h.diff).filter((k) => k !== "from").join(", ")}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <LocalDate value={h.createdAt} withTime />
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
