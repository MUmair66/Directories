import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { absoluteUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

export type Crumb = { name: string; href?: string };

/** Visible breadcrumbs + BreadcrumbList schema. The last crumb is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <li key={`${c.name}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
                {last || !c.href ? (
                  <span aria-current={last ? "page" : undefined} className={last ? "font-medium text-foreground" : undefined}>
                    {c.name}
                  </span>
                ) : (
                  <Link href={c.href} className="inline-flex items-center gap-1 hover:text-primary">
                    {i === 0 && <Home className="size-3.5" aria-hidden />}
                    {c.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            ...(c.href ? { item: absoluteUrl(c.href) } : {}),
          })),
        }}
      />
    </>
  );
}
