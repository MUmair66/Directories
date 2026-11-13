import type { LandingContent, LandingItem, LandingSection, LandingSectionType, LandingTheme } from "@/db/schema/content";
import { slugify } from "@/lib/text";

export type { LandingContent, LandingItem, LandingSection, LandingSectionType, LandingTheme };

/** Root-level paths a landing page slug can never take (they are app routes or files). */
export const RESERVED_LANDING_SLUGS = new Set([
  "admin", "dashboard", "api", "biz", "blog", "categories", "category", "contact", "faqs", "pricing", "privacy", "search",
  "states", "terms", "testimonials", "top-pros", "login", "register", "forgot-password", "reset-password", "verify-email",
  "sitemap", "robots", "manifest", "icon", "favicon", "_next", "not-found",
]);

export const SECTION_TYPES: { type: LandingSectionType; label: string; description: string }[] = [
  { type: "intro", label: "Intro (hero)", description: "Big headline, image and call-to-action at the top." },
  { type: "services", label: "Services", description: "Cards for each service with optional image." },
  { type: "about", label: "About", description: "Story text next to an image." },
  { type: "gallery", label: "Gallery", description: "Photo grid." },
  { type: "reviews", label: "Reviews", description: "Live star rating and latest customer reviews." },
  { type: "faq", label: "FAQ", description: "Questions and answers." },
  { type: "contact", label: "Contact", description: "Lead form plus phone and address." },
  { type: "custom", label: "Custom section", description: "Free text, image and button: anything extra." },
  { type: "code", label: "Custom code", description: "Paste your own HTML/CSS (or JavaScript) for anything else." },
];

export const sectionLabel = (t: LandingSectionType) => SECTION_TYPES.find((s) => s.type === t)?.label ?? t;

export const THEME_PRESETS: { name: string; theme: LandingTheme }[] = [
  { name: "Ocean", theme: { primary: "#1d4ed8", accent: "#f59e0b", background: "#ffffff", text: "#0f172a", heroOverlay: 55, radius: "large" } },
  { name: "Forest", theme: { primary: "#15803d", accent: "#facc15", background: "#ffffff", text: "#14231a", heroOverlay: 55, radius: "large" } },
  { name: "Sunset", theme: { primary: "#c2410c", accent: "#0ea5e9", background: "#fffaf5", text: "#1c1917", heroOverlay: 50, radius: "large" } },
  { name: "Royal", theme: { primary: "#6d28d9", accent: "#f472b6", background: "#ffffff", text: "#1e1b4b", heroOverlay: 60, radius: "large" } },
  { name: "Graphite", theme: { primary: "#111827", accent: "#ef4444", background: "#f9fafb", text: "#111827", heroOverlay: 65, radius: "small" } },
  { name: "Teal", theme: { primary: "#0f766e", accent: "#fb923c", background: "#ffffff", text: "#0f172a", heroOverlay: 55, radius: "large" } },
];

export const DEFAULT_THEME: LandingTheme = THEME_PRESETS[0]!.theme;

const uid = () => Math.random().toString(36).slice(2, 10);

/** Starter snippet for a new "Custom code" section. */
export const SAMPLE_CODE = `<div class="my-box">
  <h2>Your custom content</h2>
  <p>Write any HTML here. Add CSS in a style tag below.</p>
</div>

<style>
  .my-box { padding: 32px; border-radius: 16px; background: #f1f5f9; text-align: center; }
  .my-box h2 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
</style>`;

export function blankSection(type: LandingSectionType, overrides: Partial<LandingSection> = {}): LandingSection {
  const base: Record<LandingSectionType, Partial<LandingSection>> = {
    intro: { anchor: "Intro", navLabel: "", title: "Your headline here", subtitle: "", ctaLabel: "Get a free quote", layout: "centered" },
    services: { anchor: "Services", navLabel: "Services", title: "Our services", subtitle: "What we do best" },
    about: { anchor: "About", navLabel: "About", title: "About us", layout: "image-right" },
    gallery: { anchor: "Gallery", navLabel: "Gallery", title: "Our work" },
    reviews: { anchor: "Reviews", navLabel: "Reviews", title: "What customers say" },
    faq: { anchor: "FAQ", navLabel: "FAQ", title: "Frequently asked questions" },
    contact: { anchor: "Contact", navLabel: "Contact", title: "Get in touch", subtitle: "Tell us about your project and we'll get back to you fast.", ctaLabel: "Send request" },
    custom: { anchor: `Section-${uid().slice(0, 4)}`, navLabel: "", title: "New section", layout: "image-right" },
    code: { anchor: `Code-${uid().slice(0, 4)}`, navLabel: "", title: "", code: SAMPLE_CODE, codeMode: "html", fullWidth: false },
  };
  return {
    id: uid(),
    type,
    anchor: "",
    navLabel: "",
    enabled: true,
    title: "",
    subtitle: "",
    body: "",
    imageUrl: "",
    ctaLabel: "",
    layout: "centered",
    bgColor: "",
    textColor: "",
    items: [],
    ...base[type],
    ...overrides,
  };
}

export const blankItem = (): LandingItem => ({ title: "", text: "", imageUrl: "" });

type BusinessSeed = {
  name: string;
  description?: string | null;
  categoryName?: string | null;
  cityName?: string | null;
  stateCode?: string | null;
  phone?: string | null;
  bannerUrl?: string | null;
  photoUrls?: string[];
};

/** Starting content for a new landing page, pre-filled from the business profile. Every word can be edited afterwards. */
export function defaultLandingContent(b: BusinessSeed): LandingContent {
  const service = b.categoryName ?? "Local services";
  const place = [b.cityName, b.stateCode].filter(Boolean).join(", ");
  const where = place ? ` in ${place}` : "";
  const photos = b.photoUrls ?? [];
  return {
    version: 2,
    theme: { ...DEFAULT_THEME },
    sections: [
      blankSection("intro", {
        title: `Best ${service}${where}`,
        subtitle: `${b.name} delivers trusted, high-quality ${service.toLowerCase()}${where}. Licensed, insured and ready to help.`,
        imageUrl: b.bannerUrl ?? photos[0] ?? "",
        items: [
          { title: "Free estimates", text: "", imageUrl: "" },
          { title: "Licensed & insured", text: "", imageUrl: "" },
          { title: "Satisfaction guaranteed", text: "", imageUrl: "" },
        ],
      }),
      blankSection("services", {
        items: [
          { title: `Residential ${service.toLowerCase()}`, text: "Careful, clean work for homeowners, done on schedule.", imageUrl: "" },
          { title: `Commercial ${service.toLowerCase()}`, text: "Reliable crews for offices, shops and property managers.", imageUrl: "" },
          { title: "Repairs & maintenance", text: "Fast fixes and ongoing care that keep things in top shape.", imageUrl: "" },
        ],
      }),
      blankSection("about", {
        title: `About ${b.name}`,
        body: b.description || `<p>${b.name} is a locally owned business serving ${place || "the area"}. We combine experienced people, quality materials and honest pricing on every job.</p>`,
        imageUrl: photos[1] ?? photos[0] ?? "",
      }),
      blankSection("gallery", { items: photos.slice(0, 9).map((url) => ({ title: "", text: "", imageUrl: url })), enabled: photos.length > 0 }),
      blankSection("reviews"),
      blankSection("faq", {
        items: [
          { title: "Do you offer free estimates?", text: "Yes. Contact us and we'll schedule a free, no-obligation estimate.", imageUrl: "" },
          { title: `What areas do you serve?`, text: `We serve ${place || "the local area"} and nearby communities.`, imageUrl: "" },
          { title: "Are you licensed and insured?", text: "Yes, fully licensed and insured for your peace of mind.", imageUrl: "" },
        ],
      }),
      blankSection("contact"),
    ],
  };
}

/** Suggests "12345-best-painting-services-westlake-oh". */
export function suggestLandingSlug(b: { categoryName?: string | null; cityName?: string | null; stateCode?: string | null; name: string }, num?: number) {
  const n = num ?? Math.floor(10000 + Math.random() * 90000);
  const topic = b.categoryName ? `best ${b.categoryName}` : b.name;
  return slugify(`${n} ${topic} ${b.cityName ?? ""} ${b.stateCode ?? ""}`);
}

/** Anchors must be URL-fragment safe: letters, numbers, - and _. */
export const ANCHOR_RE = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
