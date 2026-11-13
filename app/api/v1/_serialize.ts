import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

export async function loadApiBusiness(id: string, userId: string) {
  return db.query.businesses.findFirst({
    where: and(eq(s.businesses.id, id), eq(s.businesses.ownerId, userId), isNull(s.businesses.deletedAt)),
    columns: { searchVector: false, location: false },
    with: {
      categories: { with: { category: { columns: { id: true, name: true, slug: true } } } },
      hours: true,
      media: true,
      socialLinks: true,
      seo: true,
      state: { columns: { code: true, name: true } },
      city: { columns: { name: true } },
    },
  });
}

type Full = NonNullable<Awaited<ReturnType<typeof loadApiBusiness>>>;

export function toJson(b: Full) {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    url: absoluteUrl(`/biz/${b.slug}`),
    status: b.status,
    verificationStatus: b.verificationStatus,
    description: b.description,
    email: b.email,
    website: b.website,
    phone: b.phone,
    phone2: b.phone2,
    categories: b.categories.map((c) => c.category),
    location: {
      address: b.hideAddress ? null : b.address,
      city: b.city?.name ?? null,
      state: b.state?.code ?? null,
      zip: b.zip,
      lat: b.lat,
      lng: b.lng,
      hideAddress: b.hideAddress,
      timezone: b.timezone,
    },
    hours: b.hours
      .sort((x, y) => x.day - y.day || x.sequence - y.sequence)
      .map((h) => ({ day: h.day, sequence: h.sequence, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed, is24h: h.is24h })),
    media: b.media.map((m) => ({ id: m.id, type: m.type, url: m.url, width: m.width, height: m.height, sortOrder: m.sortOrder })),
    videoUrl: b.videoUrl,
    social: Object.fromEntries(b.socialLinks.map((l) => [l.platform, l.url])),
    seo: b.seo ? { metaTitle: b.seo.metaTitle, metaDescription: b.seo.metaDescription, metaKeywords: b.seo.metaKeywords, tags: b.seo.tags } : null,
    rating: { average: b.avgRating, count: b.reviewCount },
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
