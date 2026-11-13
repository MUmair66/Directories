import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogCategories, getBlogCategory } from "@/lib/data/content";
import { pageMeta } from "@/lib/meta";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container, Skeleton } from "@/components/ui/primitives";
import { PageHero } from "@/components/content/blocks";
import { BlogList, BlogListSkeleton } from "@/components/content/blog-list";

import { staticParams } from "@/lib/static-params";

export async function generateStaticParams() {
  return staticParams(async () => (await getBlogCategories()).map((c) => ({ slug: c.slug })), [{ slug: "small-business-tips" }]);
}

export async function generateMetadata({ params, searchParams }: PageProps<"/blog/category/[slug]">): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await getBlogCategory(slug);
  if (!cat) return { title: "Category not found", robots: { index: false } };
  const page = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;
  return pageMeta({
    title: page > 1 ? `${cat.name} Articles: Page ${page}` : `${cat.name} Articles`,
    description: `Articles about ${cat.name.toLowerCase()}: tips, guides and how-tos.`,
    path: page > 1 ? `/blog/category/${slug}?page=${page}` : `/blog/category/${slug}`,
    noindex: !!sp.q,
  });
}

async function Header({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getBlogCategory(slug);
  if (!cat) notFound();
  return (
    <PageHero
      top={<Breadcrumbs items={[{ name: "Blog", href: "/blog" }, { name: cat.name }]} />}
      title={`${cat.name} articles`}
      subtitle={`Our latest writing on ${cat.name.toLowerCase()}.`}
    />
  );
}

async function List({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  return <BlogList searchParams={searchParams} categorySlug={slug} />;
}

export default function BlogCategoryPage({ params, searchParams }: PageProps<"/blog/category/[slug]">) {
  return (
    <>
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-none" />}>
        <Header params={params} />
      </Suspense>
      <Container className="py-12">
        <Suspense fallback={<BlogListSkeleton />}>
          <List params={params} searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
