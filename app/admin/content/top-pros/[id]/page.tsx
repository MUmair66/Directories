import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTopProsPage, locationOptions, requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { TopProsForm } from "@/components/admin/content-forms";

export const metadata = { title: "Edit Top Pros page" };
type Props = { params: Promise<{ id: string }> };

export default function EditTopProsPage({ params }: Props) {
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
  const [page, { states, categories }] = await Promise.all([getTopProsPage(id), locationOptions()]);
  if (!page) notFound();
  return (
    <>
      <PageHeader title={page.title} crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Top Pros", href: "/admin/content/top-pros" }, { label: "Edit" }]} />
      <TopProsForm
        states={states}
        categories={categories}
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          stateId: page.stateId ?? "",
          cityId: page.cityId ?? "",
          categoryId: page.categoryId ?? "",
          intro: page.intro ?? "",
          criteria: page.criteria ?? "",
          faqs: page.faqs,
          coverUrl: page.coverUrl ?? "",
          metaTitle: page.metaTitle ?? "",
          metaDescription: page.metaDescription ?? "",
          status: page.status,
          items: page.items.map((i) => ({ businessId: i.businessId, name: `${i.name} (${i.cityName})`, blurb: i.blurb ?? "" })),
        }}
      />
    </>
  );
}
