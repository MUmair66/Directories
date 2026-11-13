"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { DetailsSection } from "./details-section";
import { LocationSection, type StateOption } from "./location-section";
import { HoursSection } from "./hours-section";
import { GalleryManager, MediaSection } from "./media-section";
import { SeoSection } from "./seo-section";
import { detailsDefaults, hoursDefaults, locationDefaults, seoDefaults, type FormBusiness } from "./defaults";
import type { CategoryOption } from "./category-picker";

const TABS = [
  ["details", "Details"],
  ["location", "Location"],
  ["hours", "Hours"],
  ["media", "Media"],
  ["gallery", "Gallery"],
  ["seo", "SEO and Social"],
] as const;

/** Edit business: same fields as the wizard, as tabs. Each tab has its own sticky save bar. */
export function EditTabs({ business, categories, states }: { business: FormBusiness; categories: CategoryOption[]; states: StateOption[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab")! : "details";
  const edit = { kind: "edit" as const };
  const refresh = () => router.refresh();

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        const dirty = document.querySelector('[aria-label="Unsaved changes"]');
        if (dirty && !window.confirm("You have unsaved changes on this tab. Leave without saving?")) return;
        router.replace(`?tab=${v}`, { scroll: false });
      }}
    >
      <TabsList className="w-full justify-start sm:w-auto">
        {TABS.map(([k, label]) => (
          <TabsTrigger key={k} value={k}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="mt-6 rounded-lg border border-border bg-card p-5 shadow-card sm:p-8">
        <TabsContent value="details" className="mt-0">
          <DetailsSection businessId={business.id} defaults={detailsDefaults(business)} categories={categories} mode={edit} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="location" className="mt-0">
          <LocationSection businessId={business.id} defaults={locationDefaults(business)} states={states} mode={edit} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="hours" className="mt-0">
          <HoursSection businessId={business.id} defaults={hoursDefaults(business)} mode={edit} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="media" className="mt-0">
          <MediaSection business={business} mode={edit} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="gallery" className="mt-0">
          <GalleryManager businessId={business.id} initial={business.media.filter((m) => m.type === "gallery")} />
        </TabsContent>
        <TabsContent value="seo" className="mt-0">
          <SeoSection
            businessId={business.id}
            defaults={seoDefaults(business)}
            mode={edit}
            onSaved={refresh}
            context={{ name: business.name, slug: business.slug, description: business.description, city: business.cityName }}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
