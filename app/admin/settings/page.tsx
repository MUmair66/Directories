import { Suspense } from "react";
import { getSettingsRaw, listCategoriesAdmin, requireAdmin } from "@/lib/data/admin";
import { DEFAULT_SITE, type SiteSettings } from "@/lib/settings-defaults";
import { PageHeader } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/primitives";
import { SiteSettingsForm } from "@/components/admin/settings-forms";

export const metadata = { title: "Site settings" };

export default function SiteSettingsPage() {
  return (
    <>
      <PageHeader title="Site settings" description="Logo, support contact, social links, footer and integrations." crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Settings" }]} />
      <Suspense fallback={<Skeleton className="h-[700px] rounded-lg" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireAdmin();
  const [raw, tree] = await Promise.all([getSettingsRaw(), listCategoriesAdmin()]);
  const st = { ...DEFAULT_SITE, ...(raw.site as Partial<SiteSettings> | undefined) };
  return (
    <SiteSettingsForm
      initial={{
        logoUrl: st.logoUrl ?? "",
        supportEmail: st.supportEmail,
        supportPhone: st.supportPhone ?? "",
        responseTime: st.responseTime,
        social: { facebook: st.social.facebook ?? "", x: st.social.x ?? "", youtube: st.social.youtube ?? "", linkedin: st.social.linkedin ?? "", instagram: st.social.instagram ?? "" },
        paymentIcons: st.paymentIcons,
        analytics: { gaId: st.analytics.gaId ?? "" },
        footerCategories: st.footerCategories,
        stripeEnabled: st.stripeEnabled,
      }}
      categories={tree.flatMap((p) => [{ slug: p.slug, name: p.name }, ...p.children.map((c) => ({ slug: c.slug, name: c.name, group: p.name }))])}
    />
  );
}
