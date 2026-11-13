import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { asc, isNull } from "drizzle-orm";
import { getCategory, getCategoryTree, getListings } from "@/lib/data/public";
import { db, schema as s } from "@/lib/db";
import { findRedirect } from "@/lib/redirects";
import { staticParams } from "@/lib/static-params";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { BusinessCard } from "@/components/listing/business-card";
import { CategoryIcon } from "@/components/listing/category-icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/primitives";

export async function generateStaticParams() {
  return staticParams(
    async () => (await db.select({ parent: s.categories.slug }).from(s.categories).where(isNull(s.categories.parentId)).orderBy(asc(s.categories.sortOrder))),
    [{ parent: "home-improvement-and-contractors" }],
  );
}

export async function generateMetadata({ params }: PageProps<"/categories/[parent]">): Promise<Metadata> {
  const { parent } = await params;
  const cat = await getCategory(parent);
  if (!cat || cat.parentId) return { title: "Category not found" };
  return {
    title: cat.metaTitle || `${cat.name} Near You: Find Local ${cat.name}`,
    description: cat.metaDescription || `Find trusted ${cat.name.toLowerCase()} businesses near you. Compare ratings, read reviews and contact local pros on ${BRAND_NAME}.`,
    alternates: { canonical: `/categories/${cat.slug}` },
    openGraph: { title: `${cat.name} | ${BRAND_NAME}`, url: `/categories/${cat.slug}` },
  };
}

export default function ParentCategoryPage({ params }: PageProps<"/categories/[parent]">) {
  return (
    <Suspense fallback={<Container className="py-8"><Skeleton className="h-64" /></Container>}>
      <ParentCategory params={params} />
    </Suspense>
  );
}

function faqsFor(name: string) {
  const lower = name.toLowerCase();
  return [
    { question: `How do I find the best ${lower} near me?`, answer: `Search ${BRAND_NAME} by city or ZIP, then sort by Highest rated or Most reviewed. Check the Verified badge, recent reviews and business hours before you call.` },
    { question: `Are the ${lower} listings free to contact?`, answer: `Yes. You can call, message or get directions to any business on ${BRAND_NAME} at no cost.` },
    { question: `How do I list my business under ${name}?`, answer: `Create a free account, click Add Business, and choose up to 5 categories. Most owners finish in under 5 minutes.` },
  ];
}

async function ParentCategory({ params }: { params: PageProps<"/categories/[parent]">["params"] }) {
  const { parent } = await params;
  const cat = await getCategory(parent);
  if (!cat) {
    const to = await findRedirect(`/categories/${parent}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  // A child slug under /categories: send people to its listing page.
  if (cat.parentId && cat.parent) permanentRedirect(`/category/${cat.parent.slug}/${cat.slug}`);
  const [tree, top] = await Promise.all([getCategoryTree(), getListings({ categoryId: cat.id, sort: "rating", perPage: 6, minRating: 1 })]);
  const node = tree.find((t) => t.id === cat.id);
  const faqs = faqsFor(cat.name);

  return (
    <>
      <section className="border-b border-border bg-surface">
        <Container className="grid gap-5 py-10">
          <Breadcrumbs items={[{ name: "Categories", href: "/categories" }, { name: cat.name }]} />
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <CategoryIcon name={cat.icon} className="size-7" />
            </span>
            <div>
              <h1 className="text-3xl font-bold">{cat.name}</h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                {cat.intro || `Browse ${(node?.count ?? 0).toLocaleString("en-US")} ${cat.name.toLowerCase()} businesses across the US. Pick a specialty below or search by city.`}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 py-10">
        <section aria-labelledby="sub-heading">
          <h2 id="sub-heading" className="mb-5 text-2xl font-bold">
            Specialties
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(node?.children ?? []).map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${cat.slug}/${c.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{c.count.toLocaleString("en-US")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {top.items.length > 0 && (
          <section aria-labelledby="top-heading">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 id="top-heading" className="text-2xl font-bold">
                Top-rated {cat.name}
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href={`/search?category=${cat.slug}&sort=rating`}>See all</Link>
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {top.items.map((b) => (
                <BusinessCard key={b.id} b={b} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="faq-heading" className="max-w-3xl">
          <h2 id="faq-heading" className="mb-3 text-2xl font-bold">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
            }}
          />
        </section>
      </Container>
    </>
  );
}
