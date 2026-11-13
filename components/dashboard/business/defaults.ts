import type { DetailsInput, HoursInput, LocationInput, SeoInput } from "@/lib/validations/business";
import { SOCIAL_PLATFORMS } from "@/lib/validations/business";

/** Shape of the business passed from server pages to the client forms (serializable). */
export type FormBusiness = {
  id: string;
  name: string;
  slug: string;
  status: string;
  verificationStatus: string;
  description: string | null;
  email: string | null;
  website: string | null;
  phone: string | null;
  phone2: string | null;
  countryCode: string;
  stateId: string | null;
  cityName: string;
  address: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  hideAddress: boolean;
  timezone: string;
  videoUrl: string | null;
  wizardStep: number;
  categoryIds: string[];
  hours: { day: number; sequence: number; openTime: string | null; closeTime: string | null; isClosed: boolean; is24h: boolean }[];
  media: { id: string; type: "logo" | "banner" | "gallery"; url: string; width: number | null; height: number | null; sortOrder: number }[];
  social: Partial<Record<(typeof SOCIAL_PLATFORMS)[number], string>>;
  seo: { metaTitle: string | null; metaKeywords: string | null; metaDescription: string | null; tags: string[] } | null;
};

export function detailsDefaults(b?: FormBusiness | null): DetailsInput {
  return {
    name: b?.name ?? "",
    categoryIds: b?.categoryIds ?? [],
    slug: b?.slug ?? "",
    description: b?.description ?? "",
    email: b?.email ?? "",
    website: b?.website ?? "",
    phone: b?.phone ?? "",
    phone2: b?.phone2 ?? "",
  };
}

export function locationDefaults(b?: FormBusiness | null): LocationInput {
  return {
    countryCode: b?.countryCode ?? "US",
    address: b?.address ?? "",
    cityName: b?.cityName ?? "",
    stateId: b?.stateId ?? "",
    zip: b?.zip ?? "",
    lat: b?.lat ?? null,
    lng: b?.lng ?? null,
    hideAddress: b?.hideAddress ?? false,
    timezone: b?.timezone ?? "America/New_York",
  };
}

const t = (v: string | null) => (v ? v.slice(0, 5) : null);

export function hoursDefaults(b?: FormBusiness | null): HoursInput {
  if (b?.hours.length) {
    const rows = b.hours.map((h) => ({ ...h, openTime: t(h.openTime), closeTime: t(h.closeTime) }));
    // Every day needs a first-range row for the editor; missing days are shown as closed.
    for (let day = 0; day < 7; day++) {
      if (!rows.some((r) => r.day === day && r.sequence === 0)) rows.push({ day, sequence: 0, isClosed: true, is24h: false, openTime: null, closeTime: null });
    }
    return { hours: rows.sort((a, b) => a.day - b.day || a.sequence - b.sequence) };
  }
  return {
    hours: Array.from({ length: 7 }, (_, day) => ({
      day,
      sequence: 0,
      isClosed: day === 6,
      is24h: false,
      openTime: day === 6 ? null : "09:00",
      closeTime: day === 6 ? null : "17:00",
    })),
  };
}

export function seoDefaults(b?: FormBusiness | null): SeoInput {
  return {
    tags: b?.seo?.tags ?? [],
    metaTitle: b?.seo?.metaTitle ?? "",
    metaKeywords: b?.seo?.metaKeywords ?? "",
    metaDescription: b?.seo?.metaDescription ?? "",
    social: b?.social ?? {},
  };
}
