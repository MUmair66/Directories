import Link from "next/link";
import { BadgeCheck, CheckCircle2, Phone, Star } from "lucide-react";
import type { TopProsBusiness, TopProsSummary } from "@/lib/data/content";
import type { getTopProsArticle } from "@/lib/data/content";
import { decodeEntities, excerpt, formatPhone, telHref } from "@/lib/text";
import { BRAND_NAME, absoluteUrl } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { BusinessAvatar } from "@/components/listing/business-avatar";
import { RatingSummary } from "@/components/listing/stars";
import { FaqList, ListYourBusinessCta, PageHero, formatDate, isoDate } from "./blocks";

export function TopProsLinkList({ items }: { items: TopProsSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/top-pros/${p.slug}`} className="flex h-full items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover">
            <Star className="mt-0.5 size-5 shrink-0 fill-rating text-rating" aria-hidden />
            <span>
              <span className="block font-semibold leading-snug hover:text-primary">{p.title}</span>
              {p.categoryName && <span className="text-sm text-muted-foreground">{p.categoryName}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RankedBusiness({ b }: { b: TopProsBusiness }) {
  const name = decodeEntities(b.name);
  return (
    <li className="relative flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-card sm:flex-row">
      <span className="absolute -left-3 -top-3 flex size-9 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-white shadow-card" aria-label={`Rank ${b.rank}`}>
        {b.rank}
      </span>
      <BusinessAvatar name={name} src={b.logoUrl} size={72} />
      <div className="grid min-w-0 flex-1 gap-2">
        <h3 className="flex items-center gap-1.5 text-xl font-bold">
          <Link href={`/biz/${b.slug}`} className="hover:text-primary">
            {name}
          </Link>
          {b.verified && <BadgeCheck className="size-5 text-primary" aria-label="Verified" />}
        </h3>
        <RatingSummary rating={b.avgRating} count={b.reviewCount} />
        <p className="text-sm text-muted-foreground">
          {b.cityName}
          {b.stateCode ? `, ${b.stateCode}` : ""}
        </p>
        <p className="text-sm leading-relaxed">{b.blurb || excerpt(b.description, 240)}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {b.phone && (
            <Button asChild size="sm">
              <a href={telHref(b.phone)}>
                <Phone /> {formatPhone(b.phone)}
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/biz/${b.slug}`}>View profile</Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

/** "Best [Category] in [City], [ST]" article. */
export function TopProsArticle({ data, related }: { data: NonNullable<Awaited<ReturnType<typeof getTopProsArticle>>>; related: TopProsSummary[] }) {
  const { page, items } = data;
  const url = absoluteUrl(`/top-pros/${page.slug}`);
  const crumbs = [
    { name: "Top Pros", href: "/top-pros" },
    ...(page.state ? [{ name: page.state.name, href: `/top-pros/${page.state.slug}` }] : []),
    ...(page.state && page.city ? [{ name: page.city.name, href: `/top-pros/${page.state.slug}/${page.city.slug}` }] : []),
    { name: page.title },
  ];
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: page.title,
            image: page.coverUrl ? [page.coverUrl] : undefined,
            datePublished: isoDate(page.publishedAt),
            dateModified: isoDate(page.updatedAt),
            author: { "@type": "Organization", name: BRAND_NAME },
            publisher: { "@type": "Organization", name: BRAND_NAME },
            mainEntityOfPage: url,
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: page.title,
            itemListElement: items.map((b) => ({ "@type": "ListItem", position: b.rank, url: absoluteUrl(`/biz/${b.slug}`), name: decodeEntities(b.name) })),
          },
        ]}
      />
      <PageHero top={<Breadcrumbs items={crumbs} />} title={page.title}>
        {page.publishedAt && <p className="text-sm text-muted-foreground">Updated {formatDate(page.updatedAt ?? page.publishedAt)}</p>}
      </PageHero>
      <Container className="grid max-w-4xl gap-12 py-12">
        {page.intro && <div className="prose-content text-lg" dangerouslySetInnerHTML={{ __html: page.intro }} />}

        <section aria-labelledby="ranked-heading">
          <h2 id="ranked-heading" className="mb-6 text-2xl font-bold">
            {items.length ? `Our top ${items.length} picks` : "Our picks"}
          </h2>
          {items.length ? (
            <ol className="grid gap-6">
              {items.map((b) => (
                <RankedBusiness key={b.id} b={b} />
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">We&apos;re updating this list. Check back soon.</p>
          )}
        </section>

        {page.criteria && (
          <section aria-labelledby="criteria-heading" className="rounded-lg border border-border bg-surface p-6">
            <h2 id="criteria-heading" className="mb-3 flex items-center gap-2 text-2xl font-bold">
              <CheckCircle2 className="size-6 text-success" aria-hidden /> How we picked
            </h2>
            <div className="prose-content" dangerouslySetInnerHTML={{ __html: page.criteria }} />
          </section>
        )}

        {page.faqs.length > 0 && (
          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="mb-4 text-2xl font-bold">
              Frequently asked questions
            </h2>
            <FaqList items={page.faqs} idPrefix="tp" />
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-heading">
            <h2 id="related-heading" className="mb-4 text-2xl font-bold">
              Related Top Pros
            </h2>
            <TopProsLinkList items={related} />
          </section>
        )}

        <ListYourBusinessCta />
      </Container>
    </>
  );
}
