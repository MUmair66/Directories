"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, ChevronsLeft, LogOut, Menu, Moon, Plus, Sun, type LucideIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, SheetContent } from "@/components/ui/overlays";
import { Logo } from "@/components/layout/logo";

export type NavGroup = { label?: string; items: { label: string; href: string; icon: LucideIcon; exact?: boolean; badge?: number }[] };

const THEME_KEY = "dash-theme";

/** Dark mode for dashboard and admin only: toggles `.dark` on <html> while mounted. */
function useDashTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {}
    const initial = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(initial);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);
  const toggle = () =>
    setDark((d) => {
      try {
        localStorage.setItem(THEME_KEY, d ? "light" : "dark");
      } catch {}
      return !d;
    });
  return { dark, toggle };
}

function NavList({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-5" aria-label="Sidebar">
      {groups.map((g, gi) => (
        <div key={gi} className="grid gap-1">
          {g.label && !collapsed && <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>}
          {g.items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                <item.icon className="size-5 shrink-0" aria-hidden />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && !!item.badge && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">{item.badge}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * Shared shell for /dashboard and /admin: collapsible sidebar, top bar with search,
 * notifications bell, primary action, avatar menu and dark mode.
 */
export function AppShell({
  groups,
  children,
  user,
  unreadCount = 0,
  searchAction,
  primaryAction = { label: "Add Business", href: "/dashboard/businesses/new" },
  area,
}: {
  groups: NavGroup[];
  children: React.ReactNode;
  user: { name: string; email: string; image?: string | null };
  unreadCount?: number;
  searchAction: string;
  primaryAction?: { label: string; href: string } | null;
  area: "dashboard" | "admin";
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useDashTheme();
  const router = useRouter();

  const logout = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh bg-surface">
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex", collapsed ? "w-[72px]" : "w-64")}>
        <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-2")}>
          {collapsed ? <span className="font-heading text-lg font-extrabold text-primary">{area === "admin" ? "A" : "D"}</span> : <Logo className="text-lg" />}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList groups={groups} collapsed={collapsed} />
        </div>
        <div className="grid gap-1 border-t border-border p-3">
          <button type="button" onClick={logout} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground", collapsed && "justify-center px-2")}>
            <LogOut className="size-5" aria-hidden />
            {!collapsed && "Log out"}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted", collapsed && "justify-center px-2")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft className={cn("size-5 transition-transform", collapsed && "rotate-180")} aria-hidden />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-6" />
              </Button>
            </DialogTrigger>
            <SheetContent side="left" title={area === "admin" ? "Admin" : "Dashboard"}>
              <div className="p-3">
                <NavList groups={groups} onNavigate={() => setMobileOpen(false)} />
                <button type="button" onClick={logout} className="mt-4 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                  <LogOut className="size-5" aria-hidden /> Log out
                </button>
              </div>
            </SheetContent>
          </Dialog>

          <form action={searchAction} className="hidden max-w-md flex-1 md:block" role="search">
            <label htmlFor="shell-search" className="sr-only">
              Search
            </label>
            <input
              id="shell-search"
              name="q"
              placeholder={area === "admin" ? "Search businesses, users, tickets…" : "Search your businesses…"}
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
              {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`} className="relative">
              <Link href="/dashboard/notifications">
                <Bell className="size-5" />
                {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </Link>
            </Button>
            {primaryAction && (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href={primaryAction.href}>
                  <Plus aria-hidden /> {primaryAction.label}
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white" aria-label="Account menu">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="size-full object-cover" />
                ) : (
                  initials(user.name || user.email)
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/security">Security</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">View site</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout}>
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Page header used on every dashboard/admin page: breadcrumb, title, one primary action. */
export function PageHeader({ title, description, crumbs, action }: { title: string; description?: string; crumbs?: { label: string; href?: string }[]; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden>/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-primary">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
