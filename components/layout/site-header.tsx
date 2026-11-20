import Link from "next/link";
import { Suspense } from "react";
import { Mail, PlusCircle, UserRound } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getCategoryTree } from "@/lib/data/public";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { Logo } from "./logo";
import { MainNav, NavLinks, type NavCategory } from "./main-nav";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { SocialIcon, SOCIAL_LABELS } from "./social-icons";

async function navCategories(): Promise<NavCategory[]> {
  try {
    const tree = await getCategoryTree();
    return [...tree]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((c) => ({ name: c.name, slug: c.slug, icon: c.icon }));
  } catch {
    return [];
  }
}

export async function SiteHeader() {
  const [{ site }, categories] = await Promise.all([getSettings(), navCategories()]);
  return (
    <>
      <div className="hidden bg-ink text-[0.8rem] text-slate-300 md:block">
        <Container className="flex h-9 items-center justify-between">
          <p className="text-slate-400">
            Discover trusted local businesses in <span className="font-semibold text-[#DFA9F7]">every US city</span>
          </p>
          <div className="flex items-center gap-4">
            <a href={`mailto:${site.supportEmail}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="size-3.5" aria-hidden />
              {site.supportEmail}
            </a>
            <span className="h-4 w-px bg-white/15" aria-hidden />
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 hover:text-white">
              <UserRound className="size-3.5" aria-hidden />
              My Account
            </Link>
            {Object.values(site.social).some(Boolean) && <span className="h-4 w-px bg-white/15" aria-hidden />}
            <ul className="flex items-center gap-3">
              {Object.entries(site.social)
                .filter(([, url]) => url)
                .map(([name, url]) => (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[name] ?? name} className="hover:text-white">
                      <SocialIcon name={name} className="size-3.5" />
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        </Container>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <Container className="flex h-[72px] items-center gap-3">
          <MobileNav />
          <Logo />
          <Suspense fallback={<NavLinks categories={categories} pathname={null} />}>
            <MainNav categories={categories} />
          </Suspense>
          <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
            <Button asChild variant="outline-primary" className="hidden rounded-lg sm:inline-flex">
              <Link href="/dashboard/businesses/new">
                <PlusCircle aria-hidden /> Add Business
              </Link>
            </Button>
            <UserMenu />
          </div>
        </Container>
      </header>
    </>
  );
}
