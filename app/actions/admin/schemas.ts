/** Shared Zod schemas for admin forms (client + server). Plain module, no "use server". */
import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
const optText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optUrl = z.string().trim().url("Enter a valid URL").optional().or(z.literal(""));

export const ROLE_VALUES = ["admin", "editor", "owner", "user"] as const;
/** Roles the admin panel may assign. Admin accounts exist only in the database (never created or changed from the UI). */
export const ASSIGNABLE_ROLES = ["editor", "owner", "user"] as const;

export const categorySchema = z.object({
  id: z.uuid().optional(),
  parentId: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Name is required").max(120),
  slug,
  icon: optText(40),
  imageUrl: optUrl,
  intro: optText(5000),
  metaTitle: optText(70),
  metaDescription: optText(170),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  featured: z.boolean(),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const stateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(80),
  slug,
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  intro: optText(5000),
  metaTitle: optText(70),
  metaDescription: optText(170),
  featured: z.boolean(),
});

export const citySchema = z.object({
  id: z.uuid().optional(),
  stateId: z.uuid("Choose a state"),
  name: z.string().trim().min(2, "Name is required").max(120),
  slug,
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  population: z.coerce.number().int().min(0).optional(),
  intro: optText(5000),
  metaTitle: optText(70),
  metaDescription: optText(170),
});

export const faqItemSchema = z.object({ question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(3000) });

export const topProsSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(5, "Title is required").max(160),
  slug,
  stateId: z.uuid().optional().or(z.literal("")),
  cityId: z.uuid().optional().or(z.literal("")),
  categoryId: z.uuid().optional().or(z.literal("")),
  intro: optText(50000),
  criteria: optText(50000),
  faqs: z.array(faqItemSchema).max(30),
  coverUrl: optUrl,
  metaTitle: optText(70),
  metaDescription: optText(170),
  status: z.enum(["draft", "published"]),
  items: z
    .array(z.object({ businessId: z.uuid(), name: z.string().optional(), blurb: optText(1000) }))
    .max(50),
});
export type TopProsInput = z.input<typeof topProsSchema>;

export const blogPostSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(5, "Title is required").max(160),
  slug,
  excerpt: optText(300),
  content: z.string().max(200000),
  coverUrl: optUrl,
  categoryId: z.uuid().optional().or(z.literal("")),
  metaTitle: optText(70),
  metaDescription: optText(170),
  status: z.enum(["draft", "published"]),
});
export type BlogPostInput = z.input<typeof blogPostSchema>;

export const blogCategorySchema = z.object({ id: z.uuid().optional(), name: z.string().trim().min(2).max(80), slug });

export const testimonialSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Name is required").max(80),
  business: optText(120),
  quote: z.string().trim().min(10, "Quote must be at least 10 characters").max(1000),
  photoUrl: optUrl,
  rating: z.coerce.number().int().min(1).max(5),
  published: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export const FAQ_GROUPS = ["about", "listing", "reviews", "more"] as const;
export const faqSchema = z.object({
  id: z.uuid().optional(),
  group: z.enum(FAQ_GROUPS),
  question: z.string().trim().min(3, "Question is required").max(300),
  answer: z.string().trim().min(3, "Answer is required").max(3000),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export const pageSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(2).max(160),
  content: z.string().max(300000),
  metaDescription: optText(170),
});

export const pricingPlanSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Name is required").max(60),
  description: optText(300),
  monthlyPrice: z.coerce.number().min(0).max(100000),
  yearlyPrice: z.coerce.number().min(0).max(1000000),
  features: z.array(z.string().trim().min(1).max(120)).max(20),
  ctaLabel: z.string().trim().min(2).max(40),
  highlighted: z.boolean(),
  stripePriceMonthly: optText(100),
  stripePriceYearly: optText(100),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export const homepageSchema = z.object({
  heroChips: z.array(z.object({ label: z.string().trim().min(1).max(40), href: z.string().trim().min(1).max(300) })).max(10),
  featuredCategories: z.array(z.string()).max(20),
  featuredStates: z.array(z.string()).max(51),
  heroImageUrl: optUrl,
  seoText: z.string().max(20000),
});

export const PAYMENT_ICONS = ["visa", "mastercard", "amex", "discover", "paypal", "applepay"] as const;
export const siteSettingsSchema = z.object({
  logoUrl: optUrl,
  supportEmail: z.email("Enter a valid email"),
  supportPhone: optText(30),
  responseTime: z.string().trim().max(120),
  social: z.object({ facebook: optUrl, x: optUrl, youtube: optUrl, linkedin: optUrl, instagram: optUrl }),
  paymentIcons: z.array(z.enum(PAYMENT_ICONS)),
  analytics: z.object({ gaId: optText(40) }),
  footerCategories: z.array(z.string()).max(20),
  stripeEnabled: z.boolean(),
});

/** One CSV row for business import. */
export const importRowSchema = z.object({
  name: z.string().trim().min(2, "name is required").max(160),
  description: z.string().trim().max(20000).optional().default(""),
  email: z.string().trim().email("invalid email").optional().or(z.literal("")),
  website: z.string().trim().url("invalid website URL").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  phone2: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "city is required"),
  state: z.string().trim().length(2, "state must be a 2-letter code"),
  zip: z.string().trim().max(10).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  lng: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
  categories: z.string().trim().min(1, "categories is required (slugs separated by |)"),
});
export const IMPORT_COLUMNS = Object.keys(importRowSchema.shape);
