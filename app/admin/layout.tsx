import type { Metadata } from "next";
import { Suspense } from "react";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { getQueueCounts, requireStaff } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [counts, [{ n: unread }]] = await Promise.all([
    getQueueCounts(),
    db.select({ n: count() }).from(s.notifications).where(and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt))),
  ]);
  return (
    <AdminShell user={{ name: user.name, email: user.email, image: (user as { photoUrl?: string | null }).photoUrl ?? user.image }} role={(user as { role?: string | null }).role ?? "user"} counts={counts} unread={unread}>
      {children}
    </AdminShell>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-surface">
      <div className="hidden w-64 border-r border-border bg-card p-4 lg:block">
        <Skeleton className="mb-6 h-8 w-32" />
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="mb-2 h-8 w-full" />
        ))}
      </div>
      <div className="flex-1">
        <div className="h-16 border-b border-border bg-card" />
        <div className="p-8">
          <Skeleton className="mb-4 h-9 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}
