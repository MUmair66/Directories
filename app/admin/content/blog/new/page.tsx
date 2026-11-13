import { Suspense } from "react";
import { listBlogCategories, requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { BlogPostForm } from "@/components/admin/content-forms";

export const metadata = { title: "New post" };

export default function NewBlogPostPage() {
  return (
    <>
      <PageHeader title="New post" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Blog", href: "/admin/content/blog" }, { label: "New" }]} />
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireStaff();
  return <BlogPostForm categories={await listBlogCategories()} />;
}
