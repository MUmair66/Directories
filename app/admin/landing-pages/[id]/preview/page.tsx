import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/data/admin";
import { getLandingForPreview } from "@/lib/data/landing";
import { Skeleton } from "@/components/ui/primitives";
import { LandingView } from "@/components/landing/landing-view";

export const metadata = { title: "Preview landing page", robots: { index: false } };
type Props = { params: Promise<{ id: string }> };

export default function PreviewLandingPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px] rounded-lg" />}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const page = await getLandingForPreview(id);
  if (!page) notFound();
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900">
        <span>
          <strong>Preview</strong> ({page.status === "published" ? "live" : "draft"}) of /{page.slug}. The form is disabled here.
        </span>
        <Link href={`/admin/landing-pages/${page.id}`} className="font-semibold underline">
          Back to editor
        </Link>
      </div>
      <LandingView page={page} preview />
    </div>
  );
}
