import type { Metadata } from "next";
import { getCategoryTree } from "@/lib/data/public";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container } from "@/components/ui/primitives";
import { CategoryDirectory } from "@/components/listing/category-filter";

export const metadata: Metadata = {
  title: "All Business Categories",
  description: `Browse every business category on ${BRAND_NAME}, from home improvement and legal services to restaurants, health and auto repair.`,
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const tree = await getCategoryTree();
  return (
    <Container className="grid gap-6 py-8">
      <Breadcrumbs items={[{ name: "Categories" }]} />
      <div>
        <h1 className="text-3xl font-bold">All categories</h1>
        <p className="mt-1 text-muted-foreground">
          {tree.length} category groups and {tree.reduce((n, c) => n + c.children.length, 0)} specialties.
        </p>
      </div>
      <CategoryDirectory tree={tree} />
    </Container>
  );
}
