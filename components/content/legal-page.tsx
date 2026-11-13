import { notFound } from "next/navigation";
import { getCmsPage } from "@/lib/data/content";
import { withToc } from "@/lib/toc";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container } from "@/components/ui/primitives";
import { PageHero, TableOfContents, formatDate } from "./blocks";

/** Long-form legal page (terms, privacy) with a sticky table of contents. */
export async function LegalPage({ slug }: { slug: "terms" | "privacy" }) {
  const page = await getCmsPage(slug);
  if (!page) notFound();
  const { html, toc } = withToc(page.content, [2]);
  return (
    <>
      <PageHero top={<Breadcrumbs items={[{ name: page.title }]} />} title={page.title} subtitle={`Last updated ${formatDate(page.updatedAt)}`} />
      <Container className="grid gap-10 py-12 lg:grid-cols-[260px_1fr]">
        <TableOfContents items={toc} className="h-fit" />
        <article className="prose-content max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} />
      </Container>
    </>
  );
}
