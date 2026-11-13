import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getAccount, getOwnerBusinessOptions } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { FormSkeleton } from "@/components/dashboard/skeletons";
import { NewTicketForm } from "@/components/dashboard/tickets/new-ticket-form";

export const metadata = { title: "New Ticket" };

export default function NewTicketPage({ searchParams }: PageProps<"/dashboard/tickets/new">) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New support ticket" crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Support Tickets", href: "/dashboard/tickets" }, { label: "New" }]} />
      <Suspense fallback={<FormSkeleton />}>
        <Loader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Loader({ searchParams }: { searchParams: PageProps<"/dashboard/tickets/new">["searchParams"] }) {
  const sp = await searchParams;
  const user = await requireUser();
  const [businesses, account] = await Promise.all([getOwnerBusinessOptions(user.id), getAccount(user.id)]);
  const pre = typeof sp.business === "string" && businesses.some((b) => b.id === sp.business) ? sp.business : undefined;
  return <NewTicketForm businesses={businesses} email={user.email} phone={account?.phone} defaultBusinessId={pre} />;
}
