"use client";
import { Bell, Building2, Code2, Heart, Inbox, LayoutDashboard, LayoutTemplate, LifeBuoy, PlusCircle, ShieldCheck, Star, UserRound } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";

const GROUPS: NavGroup[] = [
  { items: [{ label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true }] },
  {
    label: "Listings",
    items: [
      { label: "My Businesses", href: "/dashboard/businesses", icon: Building2, exact: true },
      { label: "Add Business", href: "/dashboard/businesses/new", icon: PlusCircle },
      { label: "Landing Pages", href: "/dashboard/landing-pages", icon: LayoutTemplate },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Reviews", href: "/dashboard/reviews", icon: Star },
      { label: "Leads", href: "/dashboard/leads", icon: Inbox },
      { label: "Favorites", href: "/dashboard/favorites", icon: Heart },
    ],
  },
  { label: "Support", items: [{ label: "Tickets", href: "/dashboard/tickets", icon: LifeBuoy }] },
  { label: "Developer", items: [{ label: "API Access", href: "/dashboard/api", icon: Code2 }] },
  {
    label: "Account",
    items: [
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
      { label: "Profile", href: "/dashboard/profile", icon: UserRound },
      { label: "Security", href: "/dashboard/security", icon: ShieldCheck },
    ],
  },
];

/** Client wrapper: icon components can't cross the server/client boundary as props. */
export function DashboardShell({ user, unread, children }: { user: { name: string; email: string; image?: string | null }; unread: number; children: React.ReactNode }) {
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.map((i) => (i.href === "/dashboard/notifications" ? { ...i, badge: unread } : i)) }));
  return (
    <AppShell groups={groups} user={user} unreadCount={unread} searchAction="/dashboard/businesses" area="dashboard">
      {children}
    </AppShell>
  );
}
