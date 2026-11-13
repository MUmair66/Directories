import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBlogPost, listBlogCategories, requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { BlogPostForm } from "@/components/admin/content-forms";

export const metadata = { title: "Edit post" };
type Props = { params: Promise<{ id: string }> };

export default function EditBlogPostPage({ params }: Props) {
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
  const [post, categories] = await Promise.all([getBlogPost(id), listBlogCategories()]);
  if (!post) notFound();
  return (
    <>
      <PageHeader title={post.title} crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Blog", href: "/admin/content/blog" }, { label: "Edit" }]} />
      <BlogPostForm
        categories={categories}
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          content: post.content,
          coverUrl: post.coverUrl ?? "",
          categoryId: post.categoryId ?? "",
          metaTitle: post.metaTitle ?? "",
          metaDescription: post.metaDescription ?? "",
          status: post.status,
        }}
      />
    </>
  );
}
