import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data/dashboard";
import { STATES } from "@/db/seed/states";
import { PageHeader } from "@/components/shell/app-shell";
import { FormSkeleton } from "@/components/dashboard/skeletons";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Profile" }]} />
      <Suspense fallback={<FormSkeleton />}>
        <Loader />
      </Suspense>
    </div>
  );
}

async function Loader() {
  const user = await requireUser();
  const a = await getAccount(user.id);
  if (!a) return null;
  const [first, ...rest] = a.name.split(" ");
  return (
    <ProfileForm
      email={a.email}
      photoUrl={a.photoUrl ?? a.image}
      states={STATES.map((s) => ({ code: s.code, name: s.name }))}
      defaults={{
        firstName: a.firstName ?? first ?? "",
        lastName: a.lastName ?? rest.join(" "),
        gender: (a.gender as "male" | "female" | "prefer_not_to_say" | null) ?? "",
        username: a.displayUsername ?? a.username ?? "",
        email2: a.email2 ?? "",
        phone: a.phone ?? "",
        country: a.country ?? "US",
        state: a.state ?? "",
        city: a.city ?? "",
        address: a.address ?? "",
        zip: a.zip ?? "",
      }}
    />
  );
}
