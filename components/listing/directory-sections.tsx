import Link from "next/link";
import { BadgeCheck, MessageSquareText, ShieldCheck, Star } from "lucide-react";
import { Suspense } from "react";
import type { ListingCard } from "@/lib/search";
import { BRAND_NAME } from "@/lib/site";
import { BusinessCard } from "./business-card";
import { CategoryIcon } from "./category-icon";
import { SearchBar } from "@/components/search/search-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";

export function ScopedSearch({ where }: { where: string }) {
  return (
    <Suspense fallback={<Skeleton className="h-14 w-full" />}>
      <SearchBar variant="compact" defaultWhere={where} />
    </Suspense>
  );
}

export function CategoryTiles({ title, items, hrefFor }: { title: string; items: { slug: string; name: string; icon?: string | null; count: number }[]; hrefFor: (slug: string) => string }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-5 text-2xl font-bold">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((c) => (
          <li key={c.slug}>
            <Link href={hrefFor(c.slug)} className="group flex h-full items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-secondary">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary group-hover:bg-primary group-hover:text-white">
                <CategoryIcon name={c.icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.count.toLocaleString("en-US")} listings</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NewestBusinesses({ title, items, moreHref }: { title: string; items: ListingCard[]; moreHref: string }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button asChild variant="outline" size="sm">
          <Link href={moreHref}>See all listings</Link>
        </Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((b) => (
          <BusinessCard key={b.id} b={b} />
        ))}
      </div>
    </section>
  );
}

export function ListingCta({ place }: { place: string }) {
  return (
    <section className="flex flex-col items-center justify-between gap-4 rounded-lg bg-primary px-6 py-8 text-center text-white sm:flex-row sm:text-left">
      <div>
        <h2 className="text-xl font-bold">Your business not here?</h2>
        <p className="text-blue-100">Get a free listing and reach customers in {place}.</p>
      </div>
      <Button asChild variant="white" size="lg">
        <Link href="/dashboard/businesses/new">Get a free listing</Link>
      </Button>
    </section>
  );
}

export function WhyUs() {
  const points = [
    { icon: ShieldCheck, title: "Always free", text: "Search, contact and list your business at no cost." },
    { icon: BadgeCheck, title: "Verified owners", text: "Owners confirm their listings by phone, email or documents." },
    { icon: Star, title: "Real reviews", text: "One review per customer, with moderation for fake content." },
    { icon: MessageSquareText, title: "Direct contact", text: "Call, message or get directions in one tap." },
  ];
  return (
    <section aria-label={`Why ${BRAND_NAME}`}>
      <h2 className="mb-5 text-2xl font-bold">Why {BRAND_NAME}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {points.map((p) => (
          <li key={p.title} className="rounded-lg border border-border bg-card p-5">
            <p.icon className="mb-3 size-6 text-primary" aria-hidden />
            <p className="font-semibold">{p.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
