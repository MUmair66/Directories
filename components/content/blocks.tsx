import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Clock } from "lucide-react";
import type { TocItem } from "@/lib/toc";
import type { BlogCard } from "@/lib/data/content";
import type { FaqItem } from "@/db/schema/content";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/controls";
import { Container } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function isoDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : undefined;
}

/** Page hero used by content pages. Breadcrumbs go in `top`. */
export function PageHero({ title, subtitle, top, children }: { title: string; subtitle?: string; top?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="border-b border-border bg-surface">
      <Container className="grid gap-4 py-10 sm:py-14">
        {top}
        <h1 className="text-3xl font-extrabold sm:text-5xl">{title}</h1>
        {subtitle && <p className="max-w-3xl text-lg text-muted-foreground">{subtitle}</p>}
        {children}
      </Container>
    </section>
  );
}

/** Sticky table of contents (desktop sidebar). */
export function TableOfContents({ items, className }: { items: TocItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Table of contents" className={cn("rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24", className)}>
      <p className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">On this page</p>
      <ol className="grid gap-2 text-sm">
        {items.map((i) => (
          <li key={i.id} className={i.level === 3 ? "pl-4" : undefined}>
            <a href={`#${i.id}`} className="text-muted-foreground hover:text-primary">
              {i.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** FAQ accordion + FAQPage schema. */
export function FaqList({ items, schema = true, idPrefix = "faq" }: { items: FaqItem[]; schema?: boolean; idPrefix?: string }) {
  if (!items.length) return null;
  return (
    <>
      <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-5">
        {items.map((f, i) => (
          <AccordionItem key={`${idPrefix}-${i}`} value={`${idPrefix}-${i}`} className="last:border-b-0">
            <AccordionTrigger>{f.question}</AccordionTrigger>
            <AccordionContent>
              <div className="prose-content" dangerouslySetInnerHTML={{ __html: f.answer }} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {schema && <FaqSchema items={items} />}
    </>
  );
}

export function FaqSchema({ items }: { items: FaqItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() },
        })),
      }}
    />
  );
}

export function PostCard({ post, priority }: { post: BlogCard; priority?: boolean }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/9] bg-muted" tabIndex={-1} aria-hidden>
        {post.coverUrl ? (
          <Image src={post.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" priority={priority} className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark" />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {post.categoryName && post.categorySlug && (
          <Link href={`/blog/category/${post.categorySlug}`} className="w-fit text-xs font-bold uppercase tracking-wide text-primary hover:underline">
            {post.categoryName}
          </Link>
        )}
        <h3 className="text-lg font-bold leading-snug">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>}
        <p className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          {post.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {post.readMinutes} min read
          </span>
        </p>
      </div>
    </article>
  );
}

export function ListYourBusinessCta() {
  return (
    <aside className="rounded-xl bg-primary p-8 text-white">
      <h2 className="text-2xl font-bold">Own a local business?</h2>
      <p className="mt-2 text-blue-100">List it for free and start getting calls, messages and reviews from customers near you.</p>
      <Link href="/dashboard/businesses/new" className="mt-5 inline-flex h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-ink hover:bg-slate-100">
        List your business free
      </Link>
    </aside>
  );
}
