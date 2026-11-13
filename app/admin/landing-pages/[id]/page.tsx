import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/data/admin";
import { getLandingForEdit } from "@/lib/data/landing";
import { SITE_URL } from "@/lib/site";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { LandingEditor } from "@/components/admin/landing-editor";

export const metadata = { title: "Edit landing page" };
type Props = { params: Promise<{ id: string }> };

export default function EditLandingPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px] rounded-lg" />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const page = await getLandingForEdit(id);
  if (!page) notFound();
  return (
    <>
      <PageHeader
        title={page.title}
        description={page.business ? `Landing page for ${page.business.name}` : undefined}
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Landing pages", href: "/admin/landing-pages" }, { label: "Edit" }]}
      />
      <LandingEditor
        siteUrl={SITE_URL}
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status,
          seoTitle: page.seoTitle ?? "",
          seoDescription: page.seoDescription ?? "",
          businessId: page.businessId,
          businessName: page.business?.name ?? "(deleted business)",
          businessApproved: page.business?.status === "approved",
          content: page.content,
        }}
      />
    </>
  );
}
