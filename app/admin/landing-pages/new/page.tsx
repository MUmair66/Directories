import { Suspense } from "react";
import { requireStaff } from "@/lib/data/admin";
import { SITE_URL } from "@/lib/site";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { NewLandingForm } from "@/components/admin/landing-new-form";

export const metadata = { title: "New landing page" };

export default function NewLandingPage() {
  return (
    <>
      <PageHeader
        title="New landing page"
        description="Every page starts from the same structure, pre-filled from the business listing. You can change everything afterwards."
        crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Landing pages", href: "/admin/landing-pages" }, { label: "New" }]}
      />
      <Suspense fallback={<Skeleton className="h-80 rounded-lg" />}>
        <Gate />
      </Suspense>
    </>
  );
}

async function Gate() {
  await requireStaff();
  return <NewLandingForm siteUrl={SITE_URL} />;
}
