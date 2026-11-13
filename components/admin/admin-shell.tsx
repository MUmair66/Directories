"use client";
import {
  BadgeCheck, Building2, FileClock, FileText, FolderTree, Home, Inbox, LayoutDashboard, LifeBuoy, MapPinned, MessageSquareWarning,
  LayoutTemplate, Settings, ShieldCheck, Users,
} from "lucide-react";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";

export type QueueCounts = { listings: number; claims: number; verifications: number; reviews: number; tickets: number; inbox: number };

export function AdminShell({
  children,
  user,
  role,
  counts,
  unread,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; image?: string | null };
  role: string;
  counts: QueueCounts;
  unread: number;
}) {
  const isAdmin = role === "admin";
  const groups: NavGroup[] = [
    { items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, exact: true }] },
    {
      label: "Moderation",
      items: [
        { label: "Businesses", href: "/admin/businesses", icon: Building2, badge: counts.listings },
        { label: "Claims", href: "/admin/claims", icon: ShieldCheck, badge: counts.claims },
        { label: "Verifications", href: "/admin/verifications", icon: BadgeCheck, badge: counts.verifications },
        { label: "Reviews", href: "/admin/reviews", icon: MessageSquareWarning, badge: counts.reviews },
      ],
    },
    {
      label: "Directory",
      items: [
        { label: "Categories", href: "/admin/categories", icon: FolderTree },
        { label: "Locations", href: "/admin/locations", icon: MapPinned },
        { label: "Landing pages", href: "/admin/landing-pages", icon: LayoutTemplate },
        { label: "Content", href: "/admin/content", icon: FileText },
        { label: "Homepage", href: "/admin/homepage", icon: Home },
      ],
    },
    {
      label: "Support",
      items: [
        { label: "Tickets", href: "/admin/tickets", icon: LifeBuoy, badge: counts.tickets },
        { label: "Inbox", href: "/admin/inbox", icon: Inbox, badge: counts.inbox },
      ],
    },
    {
      label: "System",
      items: [
        ...(isAdmin ? [{ label: "Users", href: "/admin/users", icon: Users }, { label: "Settings", href: "/admin/settings", icon: Settings }] : []),
        { label: "Audit log", href: "/admin/audit-log", icon: FileClock },
      ],
    },
  ];
  return (
    <AppShell groups={groups} user={user} unreadCount={unread} searchAction="/admin/businesses" primaryAction={null} area="admin">
      {children}
    </AppShell>
  );
}
