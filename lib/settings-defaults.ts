/** Site settings shapes and defaults (no server imports, safe for seed scripts and clients). */
export type SiteSettings = {
  logoUrl: string | null;
  supportEmail: string;
  supportPhone: string | null;
  responseTime: string;
  social: { facebook?: string; x?: string; youtube?: string; linkedin?: string; instagram?: string };
  paymentIcons: ("visa" | "mastercard" | "amex" | "discover" | "paypal" | "applepay")[];
  analytics: { gaId?: string };
  footerCategories: string[]; // category slugs
  stripeEnabled: boolean;
};

export type HomepageSettings = {
  heroChips: { label: string; href: string }[];
  featuredCategories: string[]; // parent category slugs
  featuredStates: string[]; // state slugs
  heroImageUrl: string | null;
  seoText: string;
};

export const DEFAULT_SITE: SiteSettings = {
  logoUrl: null,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com",
  supportPhone: null,
  responseTime: "We reply within 1 business day.",
  social: {
    facebook: "https://facebook.com",
    x: "https://x.com",
    youtube: "https://youtube.com",
    linkedin: "https://linkedin.com",
    instagram: "https://instagram.com",
  },
  paymentIcons: ["visa", "mastercard", "amex", "discover", "paypal"],
  analytics: {},
  footerCategories: ["plumbers", "locksmith", "roofers", "real-estate-agent", "lawyers", "hvac", "auto-repairs", "general-dentistry"],
  stripeEnabled: false,
};

export const DEFAULT_HOMEPAGE: HomepageSettings = {
  heroChips: [
    { label: "Plumbers", href: "/search?category=plumbers" },
    { label: "Locksmiths", href: "/search?category=locksmith" },
    { label: "Roofers", href: "/search?category=roofers" },
    { label: "Real Estate", href: "/categories/real-estate" },
    { label: "Restaurants", href: "/categories/restaurants-and-nightlife" },
  ],
  featuredCategories: [
    "wedding-events-and-meetings",
    "legal-services",
    "shopping-and-retail",
    "banking-and-finance",
    "home-improvement-and-contractors",
    "business-services",
    "internet-and-it-services",
    "health-and-wellness",
    "auto-sales-and-service",
    "real-estate",
  ],
  featuredStates: [
    "california", "texas", "florida", "new-york", "illinois", "pennsylvania", "ohio", "georgia",
    "north-carolina", "michigan", "new-jersey", "arizona", "massachusetts", "colorado", "maryland", "nevada",
  ],
  heroImageUrl: null,
  seoText:
    "<p>Our free US business directory helps people find trusted local businesses in every state and city, from plumbers and roofers to lawyers, dentists and restaurants. Every listing shows verified contact details, business hours, photos and real customer reviews so you can compare and contact the right business in minutes.</p><p>Business owners can list their business for free, verify ownership, respond to reviews and receive leads directly in their dashboard.</p>",
};
