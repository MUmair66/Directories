import Link from "next/link";
import { Suspense } from "react";
import { FolderTree, Star, Trash2 } from "lucide-react";
import { listCategoriesAdmin, requireStaff, type AdminCategory } from "@/lib/data/admin";
import { deleteCategory } from "@/app/actions/admin/taxonomy";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ActionButton } from "@/components/admin/action-button";
import { CategoryDialog, MergeCategoryDialog } from "@/components/admin/category-form";
import { CategoryIcon } from "@/components/listing/category-icon";

export const metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
      <Categories />
    </Suspense>
  );
}

async function Categories() {
  await requireStaff();
  const tree = await listCategoriesAdmin();
  const parents = tree.map((p) => ({ id: p.id, name: p.name }));
  const mergeOptions = tree.flatMap((p) => [{ id: p.id, name: p.name, group: "" }, ...p.children.map((c) => ({ id: c.id, name: c.name, group: p.name }))]);
  const childCount = tree.reduce((n, p) => n + p.children.length, 0);

  const actions = (c: Omit<AdminCategory, "children">, hasChildren: boolean) => (
    <div className="flex items-center gap-0.5">
      <CategoryDialog category={c} parents={parents} trigger="edit" />
      <MergeCategoryDialog source={c} options={mergeOptions} />
      {!hasChildren && c.businesses === 0 && (
        <ActionButton
          size="icon-sm"
          variant="ghost"
          action={deleteCategory}
          input={{ id: c.id }}
          confirm={{ title: `Delete ${c.name}?`, description: "This category has no listings. It will be removed permanently.", confirmLabel: "Delete" }}
          aria-label={`Delete ${c.name}`}
          title="Delete"
        >
          <Trash2 className="text-danger" aria-hidden />
        </ActionButton>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description={`${tree.length} groups · ${childCount} subcategories. Changing a slug adds a 301 redirect.`}
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Categories" }]}
        action={<CategoryDialog parents={parents} />}
      />
      {tree.length === 0 ? (
        <EmptyState icon={<FolderTree />} title="No categories yet" description="Run the seed script or add your first category group." action={<CategoryDialog parents={parents} />} />
      ) : (
        <ul className="grid gap-4">
          {tree.map((p) => (
            <li key={p.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <CategoryIcon name={p.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="flex items-center gap-2 font-bold">
                      {p.name}
                      {p.featured && <Star className="size-4 fill-rating text-rating" aria-label="Featured" />}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      <Link href={`/categories/${p.slug}`} target="_blank" className="hover:text-primary">
                        /categories/{p.slug}
                      </Link>{" "}
                      · {p.businesses} direct listings · order {p.sortOrder}
                    </p>
                  </div>
                  <CategoryDialog parents={parents} defaultParentId={p.id} trigger="add-child" />
                  {actions(p, p.children.length > 0)}
                </div>
                {p.children.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {p.children.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-2 pl-6 sm:pl-16">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.slug} · {c.businesses} listing{c.businesses === 1 ? "" : "s"}
                          </p>
                        </div>
                        {actions(c, false)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No subcategories yet.</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
