import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/lib/db";
import { getNotifyPrefs } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { DeleteAccountPanel, NotifyPanel, PasswordPanel, SessionsPanel } from "@/components/dashboard/security-panels";

export const metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Security" description="Password, signed-in devices and notifications." crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security" }]} />
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <Panels />
      </Suspense>
    </div>
  );
}

async function Panels() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/security");
  const [cred, prefs] = await Promise.all([
    db.select({ id: s.accounts.id }).from(s.accounts).where(and(eq(s.accounts.userId, session.user.id), eq(s.accounts.providerId, "credential"))).limit(1),
    getNotifyPrefs(session.user.id),
  ]);
  const hasPassword = cred.length > 0;
  return (
    <div className="grid gap-6">
      <PasswordPanel hasPassword={hasPassword} />
      <SessionsPanel currentToken={session.session.token} />
      <NotifyPanel prefs={prefs} />
      <DeleteAccountPanel hasPassword={hasPassword} />
    </div>
  );
}
