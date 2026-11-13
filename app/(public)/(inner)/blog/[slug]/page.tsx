import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { getBlogPost, getLatestPostSlugs, getRelatedPosts } from "@/lib/data/content";
import { withToc } from "@/lib/toc";
import { pageMeta } from "@/lib/meta";
import { BRAND_NAME, absoluteUrl } from "@/lib/site";
import { initials } from "@/lib/text";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Container, Skeleton } from "@/components/ui/primitives";
import { ShareButtons } from "@/components/content/share-buttons";
import { ListYourBusinessCta, PostCard, TableOfContents, formatDate, isoDate } from "@/components/content/blocks";

import { staticParams } from "@/lib/static-params";

export async function generateStaticParams() {
  // Cache Components needs at least one param; the placeholder renders the 404 page.
  return staticParams(async () => (await getLatestPostSlugs(50)).map((slug) => ({ slug })), [{ slug: "__placeholder__" }]);
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  return pageMeta({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || `${post.title}, from the ${BRAND_NAME} blog.`,
    path: `/blog/${slug}`,
    image: post.coverUrl,
    type: "article",
    publishedTime: isoDate(post.publishedAt),
  });
}

async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const [{ html, toc }, related] = [withToc(post.content), await getRelatedPosts({ id: post.id, categoryId: post.categoryId })];
  const url = absoluteUrl(`/blog/${post.slug}`);
  const authorName = post.author?.name ?? `${BRAND_NAME} Team`;
  const authorImage = post.author?.photoUrl || post.author?.image;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt ?? undefined,
          image: post.coverUrl ? [post.coverUrl] : undefined,
          datePublished: isoDate(post.publishedAt),
          dateModified: isoDate(post.updatedAt),
          author: { "@type": "Person", name: authorName },
          publisher: { "@type": "Organization", name: BRAND_NAME, logo: { "@type": "ImageObject", url: absoluteUrl("/icon") } },
          mainEntityOfPage: url,
        }}
      />
      <header className="border-b border-border bg-surface">
        <Container className="grid max-w-4xl gap-4 py-10">
          <Breadcrumbs
            items={[
              { name: "Blog", href: "/blog" },
              ...(post.category ? [{ name: post.category.name, href: `/blog/category/${post.category.slug}` }] : []),
              { name: post.title },
            ]}
          />
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-muted-foreground">{post.excerpt}</p>}
          <p className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>By {authorName}</span>
            {post.publishedAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" aria-hidden />
                <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" aria-hidden /> {post.readMinutes} min read
            </span>
          </p>
        </Container>
      </header>

      <Container className="py-10">
        {post.coverUrl && (
          <div className="relative mx-auto mb-10 aspect-[16/9] max-w-5xl overflow-hidden rounded-xl bg-muted">
            <Image src={post.coverUrl} alt={post.title} fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />
          </div>
        )}
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            {toc.length > 2 && <TableOfContents items={toc} className="mb-8 lg:hidden" />}
            <article className="prose-content max-w-3xl text-lg" dangerouslySetInnerHTML={{ __html: html }} />
            <div className="mt-10 border-t border-border pt-6">
              <ShareButtons url={url} title={post.title} />
            </div>
            <section aria-label="About the author" className="mt-8 flex gap-4 rounded-lg border border-border bg-card p-6">
              {authorImage ? (
                <Image src={authorImage} alt={authorName} width={56} height={56} className="size-14 rounded-full object-cover" />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white" aria-hidden>
                  {initials(authorName)}
                </span>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Written by</p>
                <p className="font-bold">{authorName}</p>
                <p className="mt-1 text-sm text-muted-foreground">Part of the {BRAND_NAME} editorial team, writing about local businesses and the people who rely on them.</p>
              </div>
            </section>
            <div className="mt-10">
              <ListYourBusinessCta />
            </div>
          </div>
          <aside className="hidden lg:block">
            <TableOfContents items={toc} />
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mx-auto mt-16 max-w-6xl" aria-labelledby="related-heading">
            <h2 id="related-heading" className="mb-6 text-2xl font-bold">
              Related articles
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
            <p className="mt-6">
              <Link href="/blog" className="font-semibold text-primary hover:underline">
                See all articles →
              </Link>
            </p>
          </section>
        )}
      </Container>
    </>
  );
}

export default function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Suspense
      fallback={
        <Container className="grid max-w-4xl gap-4 py-10">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="aspect-[16/9] w-full" />
        </Container>
      }
    >
      <Article params={params} />
    </Suspense>
  );
}
