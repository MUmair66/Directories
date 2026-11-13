import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

const POPULAR = [
  { label: "Plumbers", href: "/search?category=plumbers" },
  { label: "Locksmiths", href: "/search?category=locksmith" },
  { label: "Roofers", href: "/search?category=roofers" },
  { label: "Lawyers", href: "/search?category=lawyers" },
  { label: "Dentists", href: "/search?category=general-dentistry" },
  { label: "Restaurants", href: "/categories/restaurants-and-nightlife" },
];

/** Global 404 (renders outside the public layout, so it carries its own minimal header/footer). */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-border bg-card">
        <Container className="flex h-16 items-center">
          <Logo />
        </Container>
      </header>
      <main id="main" className="flex flex-1 items-center">
        <Container className="flex max-w-2xl flex-col items-center gap-6 py-16 text-center">
          <p className="font-heading text-6xl font-extrabold text-primary">404</p>
          <h1 className="text-3xl font-bold">We couldn&apos;t find that page</h1>
          <p className="text-muted-foreground">The page may have moved, or the link may be out of date. Try a search instead.</p>
          <form action="/search" role="search" className="flex w-full max-w-lg gap-2">
            <label htmlFor="nf-q" className="sr-only">
              Search businesses
            </label>
            <input id="nf-q" name="q" placeholder="Search businesses or categories" className="h-12 flex-1 rounded-md border border-input bg-card px-4 text-base focus-visible:outline-2 focus-visible:outline-ring" />
            <Button type="submit" size="lg">
              <Search aria-hidden /> Search
            </Button>
          </form>
          <div>
            <p className="mb-3 text-sm font-semibold text-muted-foreground">Popular categories</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {POPULAR.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium hover:border-primary hover:text-primary">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Go to homepage</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/categories">Browse all categories</Link>
            </Button>
          </div>
        </Container>
      </main>
      <footer className="border-t border-border bg-card py-6 text-center text-sm text-muted-foreground">
        <Link href="/contact" className="hover:text-primary">
          Contact support
        </Link>{" "}
        ·{" "}
        <Link href="/faqs" className="hover:text-primary">
          FAQs
        </Link>
      </footer>
    </div>
  );
}
