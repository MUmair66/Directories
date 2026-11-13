import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container } from "@/components/ui/primitives";
import { PageHero } from "@/components/content/blocks";
import { BlogList, BlogListSkeleton } from "@/components/content/blog-list";

export async function generateMetadata({ searchParams }: PageProps<"/blog">): Promise<Metadata> {
  const sp = await searchParams;
  const page = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;
  const hasQuery = !!sp.q;
  return pageMeta({
    title: page > 1 ? `Blog: Page ${page}` : "Blog: Tips for Local Businesses and Customers",
    description: `Guides on hiring local pros, growing a small business and local SEO from the ${BRAND_NAME} team.`,
    path: page > 1 ? `/blog?page=${page}` : "/blog",
    noindex: hasQuery,
  });
}

export default function BlogPage({ searchParams }: PageProps<"/blog">) {
  return (
    <>
      <PageHero top={<Breadcrumbs items={[{ name: "Blog" }]} />} title="Blog" subtitle="Practical advice for hiring local pros and growing your business." />
      <Container className="py-12">
        <Suspense fallback={<BlogListSkeleton />}>
          <BlogList searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
