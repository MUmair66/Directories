import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data/dashboard";
import { DashboardShell } from "@/components/dashboard/shell";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}

async function Guard({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/login?next=/dashboard");
  const unread = await getUnreadCount(user.id).catch(() => 0);
  const u = user as typeof user & { photoUrl?: string | null };
  return (
    <DashboardShell user={{ name: user.name, email: user.email, image: u.photoUrl || user.image }} unread={unread}>
      {children}
    </DashboardShell>
  );
}

function ShellFallback() {
  return (
    <div className="flex min-h-dvh bg-surface">
      <div className="hidden w-64 border-r border-border bg-card p-4 lg:block">
        <Skeleton className="mb-6 h-8 w-32" />
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="mb-2 h-9" />
        ))}
      </div>
      <div className="flex-1">
        <div className="h-16 border-b border-border bg-card" />
        <div className="p-6">
          <PageSkeleton cards={4} />
        </div>
      </div>
    </div>
  );
}
