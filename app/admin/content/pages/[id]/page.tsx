import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPage, requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { LegalPageForm } from "@/components/admin/content-dialogs";

export const metadata = { title: "Edit page" };
type Props = { params: Promise<{ id: string }> };

export default function EditLegalPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const page = await getPage(id);
  if (!page) notFound();
  return (
    <>
      <PageHeader title={page.title} description={`Public URL: /${page.slug}`} crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Pages", href: "/admin/content/pages" }, { label: "Edit" }]} />
      <LegalPageForm page={{ id: page.id, title: page.title, content: page.content, metaDescription: page.metaDescription ?? "" }} />
    </>
  );
}
