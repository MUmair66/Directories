import { Suspense } from "react";
import { locationOptions, requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { TopProsForm } from "@/components/admin/content-forms";

export const metadata = { title: "New Top Pros page" };

export default function NewTopProsPage() {
  return (
    <>
      <PageHeader title="New Top Pros page" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Top Pros", href: "/admin/content/top-pros" }, { label: "New" }]} />
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireStaff();
  const { states, categories } = await locationOptions();
  return <TopProsForm states={states} categories={categories} />;
}
