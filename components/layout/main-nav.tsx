"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/listing/category-icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { NAV } from "./nav-items";

export type NavCategory = { name: string; slug: string; icon: string | null };

const link = "relative rounded-md px-3 py-2 text-[0.94rem] font-medium text-ink/80 transition-colors hover:text-primary dark:text-slate-200 dark:hover:text-purple-300";
const activeLink = "text-primary after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-primary dark:text-purple-300";

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop primary navigation with a Categories dropdown; highlights the current section. */
export function MainNav({ categories }: { categories: NavCategory[] }) {
  return <NavLinks categories={categories} pathname={usePathname()} />;
}

/** Same links without the active underline: the prerendered fallback while the URL is unknown. */
export function NavLinks({ categories, pathname }: { categories: NavCategory[]; pathname: string | null }) {
  return (
    <nav aria-label="Main" className="mx-auto hidden items-center gap-1 lg:flex">
      {NAV.map((n) =>
        n.href === "/categories" && categories.length ? (
          <DropdownMenu key={n.href} modal={false}>
            <DropdownMenuTrigger className={cn(link, "group inline-flex items-center gap-1 outline-none", isActive(pathname, "/categories") || isActive(pathname, "/category") ? activeLink : "")}>
              {n.label}
              <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="grid w-[30rem] grid-cols-2 gap-0.5 p-2">
              {categories.map((c) => (
                <DropdownMenuItem key={c.slug} asChild>
                  <Link href={`/categories/${c.slug}`} className="gap-3 py-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary [&_svg]:!size-4">
                      <CategoryIcon name={c.icon} />
                    </span>
                    <span className="font-medium">{c.name}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <div className="col-span-2">
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem asChild className="col-span-2">
                <Link href="/categories" className="justify-center font-semibold text-primary">
                  View all categories <ArrowRight aria-hidden />
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link key={n.href} href={n.href} className={cn(link, isActive(pathname, n.href) && activeLink)} aria-current={isActive(pathname, n.href) ? "page" : undefined}>
            {n.label}
          </Link>
        ),
      )}
    </nav>
  );
}
