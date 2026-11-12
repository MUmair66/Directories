import Link from "next/link";
import { Mail, Plus, UserRound } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { NAV } from "./nav-items";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { SocialIcon, SOCIAL_LABELS } from "./social-icons";

export async function SiteHeader({ showSearch = true }: { showSearch?: boolean }) {
  const { site } = await getSettings();
  return (
    <>
      <div className="hidden bg-ink text-sm text-slate-300 md:block">
        <Container className="flex h-9 items-center justify-between">
          <a href={`mailto:${site.supportEmail}`} className="inline-flex items-center gap-2 hover:text-white">
            <Mail className="size-4" aria-hidden />
            {site.supportEmail}
          </a>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 hover:text-white">
              <UserRound className="size-4" aria-hidden />
              My Account
            </Link>
            <span className="h-4 w-px bg-slate-700" aria-hidden />
            <ul className="flex items-center gap-3">
              {Object.entries(site.social)
                .filter(([, url]) => url)
                .map(([name, url]) => (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[name] ?? name} className="hover:text-white">
                      <SocialIcon name={name} className="size-4" />
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        </Container>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <Container className="flex h-16 items-center gap-4">
          <MobileNav />
          <Logo />
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-muted hover:text-foreground dark:text-slate-300">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <UserMenu />
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/dashboard/businesses/new">
                <Plus aria-hidden /> Add Business
              </Link>
            </Button>
          </div>
        </Container>
        {showSearch && <HeaderSearch />}
      </header>
    </>
  );
}
