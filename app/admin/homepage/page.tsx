import { Suspense } from "react";
import { getSettingsRaw, listCategoriesAdmin, listStatesAdmin, requireStaff } from "@/lib/data/admin";
import { DEFAULT_HOMEPAGE, type HomepageSettings } from "@/lib/settings-defaults";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { HomepageSettingsForm } from "@/components/admin/settings-forms";

export const metadata = { title: "Homepage" };

export default function HomepageSettingsPage() {
  return (
    <>
      <PageHeader title="Homepage" description="Hero chips, featured categories and states, and the SEO text block." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Homepage" }]} />
      <Suspense fallback={<Skeleton className="h-[700px] rounded-lg" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireStaff();
  const [raw, tree, states] = await Promise.all([getSettingsRaw(), listCategoriesAdmin(), listStatesAdmin()]);
  const h = { ...DEFAULT_HOMEPAGE, ...(raw.homepage as Partial<HomepageSettings> | undefined) };
  return (
    <HomepageSettingsForm
      initial={{ heroChips: h.heroChips, featuredCategories: h.featuredCategories, featuredStates: h.featuredStates, heroImageUrl: h.heroImageUrl ?? "", seoText: h.seoText }}
      categories={tree.map((c) => ({ slug: c.slug, name: c.name }))}
      states={states.map((s) => ({ slug: s.slug, name: s.name, group: s.code }))}
    />
  );
}
