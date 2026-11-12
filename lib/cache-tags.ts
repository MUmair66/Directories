/** Cache tag builders. Every cached read tags itself; every mutation invalidates the same tags. */
export const tags = {
  business: (id: string) => `business:${id}`,
  businessSlug: (slug: string) => `business-slug:${slug}`,
  category: (slug: string) => `category:${slug}`,
  city: (slug: string) => `city:${slug}`,
  state: (slug: string) => `state:${slug}`,
  categories: "categories",
  locations: "locations",
  counts: "listing-counts",
  listings: "listings",
  reviews: (businessId: string) => `reviews:${businessId}`,
  content: (kind: "blog" | "top-pros" | "testimonials" | "faqs" | "pricing" | "pages") => `content:${kind}`,
  settings: "settings",
  landingPage: (slug: string) => `landing:${slug}`,
};

/** Listing pages: fresh 5 min, background revalidate at 15 min, hard expire after 1 day. */
export const LISTINGS_LIFE = { stale: 300, revalidate: 900, expire: 86400 };
