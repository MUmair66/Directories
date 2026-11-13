import type { PublicBusiness } from "@/lib/data/public";
import { absoluteUrl } from "@/lib/site";
import { DAYS } from "@/lib/hours";
import { decodeEntities, excerpt } from "@/lib/text";

/** schema.org LocalBusiness subtype by category slug (child first, then parent). */
const SUBTYPES: Record<string, string> = {
  plumbers: "Plumber", roofers: "RoofingContractor", locksmith: "Locksmith", hvac: "HVACBusiness",
  "electricians-and-electronic-repairs": "Electrician", painters: "HousePainter", "general-contractors": "GeneralContractor",
  "home-improvement-and-contractors": "HomeAndConstructionBusiness", lawyers: "Attorney", "legal-services": "LegalService",
  "notary-public": "Notary", "restaurants-and-nightlife": "FoodEstablishment", cafe: "CafeOrCoffeeShop", bakeries: "Bakery",
  clubs: "NightClub", "dentists-and-orthodontists": "Dentist", "health-and-wellness": "MedicalBusiness", pharmacies: "Pharmacy",
  hospitals: "Hospital", physicians: "Physician", "auto-sales-and-service": "AutomotiveBusiness", "auto-repairs": "AutoRepair",
  "car-dealers": "AutoDealer", "vehicle-wash": "AutoWash", "gas-stations": "GasStation", "auto-parts-and-supplies": "AutoPartsStore",
  "real-estate": "RealEstateAgent", "real-estate-agent": "RealEstateAgent", "lodging-and-travel": "LodgingBusiness", hotels: "Hotel",
  "beauty-and-spa": "HealthAndBeautyBusiness", "hair-salon": "HairSalon", "nail-salons": "NailSalon", "tattoo-shops": "TattooParlor",
  "banking-and-finance": "FinancialService", "banks-and-credit-unions": "BankOrCreditUnion", "accounting-and-tax-services": "AccountingService",
  insurance: "InsuranceAgency", "shopping-and-retail": "Store", jewelry: "JewelryStore", "shoe-stores": "ShoeStore",
  "clothing-apparel": "ClothingStore", "sports-and-recreation": "SportsActivityLocation", "gyms-and-sports-clubs": "ExerciseGym",
  "golf-courses": "GolfCourse", "pet-shops": "PetStore", laundromats: "DryCleaningOrLaundry", laundry: "DryCleaningOrLaundry",
  "movers": "MovingCompany", "internet-and-it-services": "ProfessionalService", "wedding-events-and-meetings": "EventVenue",
};

export function localBusinessSchema(b: PublicBusiness, reviews: { rating: number; body: string; createdAt: Date; user: { name: string } | null }[]) {
  const cats = b.categories.map((c) => c.category);
  const type = cats.map((c) => SUBTYPES[c.slug] ?? (c.parent ? SUBTYPES[c.parent.slug] : undefined)).find(Boolean) ?? "LocalBusiness";
  const logo = b.media.find((m) => m.type === "logo")?.url;
  const images = b.media.filter((m) => m.type !== "logo").map((m) => m.url);
  const url = absoluteUrl(`/biz/${b.slug}`);

  // OpeningHoursSpecification: one entry per open range.
  const hours = b.hours
    .filter((h) => !h.isClosed)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAYS[h.day]}`,
      opens: h.is24h ? "00:00" : h.openTime?.slice(0, 5),
      closes: h.is24h ? "23:59" : h.closeTime?.slice(0, 5),
    }));

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": url,
    name: decodeEntities(b.name),
    url,
    description: excerpt(b.description, 300),
    telephone: b.phone ?? undefined,
    ...(logo ? { logo } : {}),
    ...(images.length ? { image: images } : logo ? { image: [logo] } : {}),
    address: {
      "@type": "PostalAddress",
      ...(b.hideAddress ? {} : { streetAddress: b.address ?? undefined, postalCode: b.zip ?? undefined }),
      addressLocality: b.city?.name,
      addressRegion: b.state?.code,
      addressCountry: b.countryCode,
    },
    ...(b.lat != null && b.lng != null && !b.hideAddress ? { geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(b.website ? { sameAs: [b.website, ...b.socialLinks.map((s) => s.url)] } : b.socialLinks.length ? { sameAs: b.socialLinks.map((s) => s.url) } : {}),
    ...(b.reviewCount > 0
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: Number(b.avgRating).toFixed(1), reviewCount: b.reviewCount, bestRating: 5, worstRating: 1 },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.user?.name ?? "Customer" },
            datePublished: new Date(r.createdAt).toISOString().slice(0, 10),
            reviewBody: r.body,
          })),
        }
      : {}),
  };
}
