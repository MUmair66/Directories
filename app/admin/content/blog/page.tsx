import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { listBlogCategories, listBlogPosts, listParams, requireStaff, type RawSP } from "@/lib/data/admin";
import { deleteBlogCategory, deleteBlogPost } from "@/app/actions/admin/content";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from "@/components/ui/primitives";
import { AdminTable, type Column } from "@/components/admin/table";
import { SearchForm, StatusBadge, Toolbar, fmtDate } from "@/components/admin/toolbar";
import { ActionButton } from "@/components/admin/action-button";
import { BlogCategoryDialog } from "@/components/admin/content-dialogs";

export const metadata = { title: "Blog" };
type Props = { searchParams: Promise<RawSP> };

export default function BlogAdminPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Blog"
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Content", href: "/admin/content" }, { label: "Blog" }]}
        action={
          <Button asChild>
            <Link href="/admin/content/blog/new">
              <Plus aria-hidden /> New post
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <Blog searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Blog({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const p = listParams(sp);
  const [{ rows, total }, categories] = await Promise.all([listBlogPosts(p), listBlogCategories()]);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "title", label: "Title", cell: (r) => <Link href={`/admin/content/blog/${r.id}`} className="font-semibold hover:text-primary">{r.title}</Link> },
    { key: "category", label: "Category", cell: (r) => r.category ?? <span className="text-muted-foreground">Uncategorized</span> },
    { key: "status", label: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "published", label: "Published", cell: (r) => <span className="text-xs">{fmtDate(r.publishedAt)}</span> },
  ];
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div>
        <Toolbar>
          <SearchForm basePath="/admin/content/blog" sp={sp} placeholder="Search posts" />
        </Toolbar>
        <AdminTable
          rows={rows}
          columns={columns}
          basePath="/admin/content/blog"
          sp={sp}
          total={total}
          page={p.page}
          actions={(r) => (
            <>
              <Button asChild size="icon-sm" variant="ghost" aria-label={`Edit ${r.title}`}>
                <Link href={`/admin/content/blog/${r.id}`}>
                  <Pencil aria-hidden />
                </Link>
              </Button>
              {r.status === "published" && (
                <Button asChild size="icon-sm" variant="ghost" aria-label={`View ${r.title}`}>
                  <Link href={`/blog/${r.slug}`} target="_blank">
                    <ExternalLink aria-hidden />
                  </Link>
                </Button>
              )}
              <ActionButton size="icon-sm" variant="ghost" action={deleteBlogPost} input={{ id: r.id }} confirm={{ title: `Delete “${r.title}”?`, description: "The post is removed permanently.", confirmLabel: "Delete" }} aria-label={`Delete ${r.title}`}>
                <Trash2 className="text-danger" aria-hidden />
              </ActionButton>
            </>
          )}
          empty={
            <EmptyState
              icon={<Newspaper />}
              title="No posts yet"
              description="Write helpful guides for local customers and business owners."
              action={
                <Button asChild>
                  <Link href="/admin/content/blog/new">Write the first post</Link>
                </Button>
              }
            />
          }
        />
      </div>
      <Card className="h-fit">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <BlogCategoryDialog />
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {c.name} <span className="text-xs text-muted-foreground">/{c.slug}</span>
                  </span>
                  <BlogCategoryDialog item={c} />
                  <ActionButton size="icon-sm" variant="ghost" action={deleteBlogCategory} input={{ id: c.id }} confirm={{ title: `Delete ${c.name}?`, description: "Posts in this category become uncategorized.", confirmLabel: "Delete" }} aria-label={`Delete ${c.name}`}>
                    <Trash2 className="text-danger" aria-hidden />
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
