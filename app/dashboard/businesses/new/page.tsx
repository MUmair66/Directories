import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEditableForUser, getFormOptions, toFormBusiness } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { FormSkeleton } from "@/components/dashboard/skeletons";
import { Wizard } from "@/components/dashboard/business/wizard";

export const metadata = { title: "Add Business" };

export default function NewBusinessPage({ searchParams }: PageProps<"/dashboard/businesses/new">) {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Add Business"
        description="Six quick steps. Most owners finish in under 5 minutes."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Businesses", href: "/dashboard/businesses" }, { label: "Add Business" }]}
      />
      <Suspense fallback={<FormSkeleton />}>
        <WizardLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function WizardLoader({ searchParams }: { searchParams: PageProps<"/dashboard/businesses/new">["searchParams"] }) {
  const sp = await searchParams;
  const user = await requireUser();
  const id = typeof sp.id === "string" ? sp.id : null;
  const [options, raw] = await Promise.all([getFormOptions(), id ? getEditableForUser(id, user) : null]);
  if (id && !raw) notFound();
  const business = raw ? toFormBusiness(raw) : null;
  const step = Number(sp.step) || business?.wizardStep || 1;
  return <Wizard business={business} initialStep={step} categories={options.categories} states={options.states} />;
}
