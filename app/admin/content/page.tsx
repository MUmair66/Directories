import Link from "next/link";
import { Suspense } from "react";
import { BadgeDollarSign, FileText, HelpCircle, MessageSquareQuote, Newspaper, Trophy } from "lucide-react";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/data/admin";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";

export const metadata = { title: "Content" };

export default function ContentHubPage() {
  return (
    <>
      <PageHeader title="Content" description="Top Pros articles, blog, testimonials, FAQs, legal pages and pricing." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Content" }]} />
      <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
        <Hub />
      </Suspense>
    </>
  );
}

async function Hub() {
  await requireStaff();
  const r = await db.execute(sql`select
    (select count(*)::int from top_pros_pages) as top_pros, (select count(*)::int from blog_posts) as blog,
    (select count(*)::int from testimonials) as testimonials, (select count(*)::int from faqs) as faqs,
    (select count(*)::int from pages) as pages, (select count(*)::int from pricing_plans) as pricing`);
  const n = r.rows[0] as Record<string, number>;
  const items = [
    { href: "/admin/content/top-pros", label: "Top Pros", desc: "“Best [Category] in [City]” articles with ranked businesses.", icon: Trophy, count: n.top_pros },
    { href: "/admin/content/blog", label: "Blog", desc: "Posts, categories and featured images.", icon: Newspaper, count: n.blog },
    { href: "/admin/content/testimonials", label: "Testimonials", desc: "Quotes shown on the testimonials page.", icon: MessageSquareQuote, count: n.testimonials },
    { href: "/admin/content/faqs", label: "FAQs", desc: "Grouped questions on the FAQs page.", icon: HelpCircle, count: n.faqs },
    { href: "/admin/content/pages", label: "Terms & Privacy", desc: "Long-form legal pages.", icon: FileText, count: n.pages },
    { href: "/admin/content/pricing", label: "Pricing plans", desc: "Plans, prices, features and CTAs.", icon: BadgeDollarSign, count: n.pricing },
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={i.href} className="flex h-full gap-4 rounded-lg border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-card-hover">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <i.icon className="size-5" aria-hidden />
            </span>
            <span className="grid gap-1">
              <span className="font-semibold">
                {i.label} <span className="font-normal text-muted-foreground">({i.count ?? 0})</span>
              </span>
              <span className="text-sm text-muted-foreground">{i.desc}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
