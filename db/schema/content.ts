import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, deletedAt, id, tsvector, updatedAt } from "./_types";
import { users } from "./auth";
import { businesses, categories } from "./businesses";
import { cities, states } from "./locations";

export const publishStatusEnum = pgEnum("publish_status", ["draft", "published"]);
export const landingTemplateEnum = pgEnum("landing_template", ["service", "offer", "lead_capture"]);
export const submissionKindEnum = pgEnum("submission_kind", ["contact", "faq"]);

export type FaqItem = { question: string; answer: string };

/* Landing pages: one shared structure (ordered sections, each with a #Anchor), fully editable per business by admins. */
export type LandingSectionType = "intro" | "services" | "about" | "gallery" | "reviews" | "faq" | "contact" | "custom" | "code";
export type LandingItem = { title: string; text: string; imageUrl: string };
export type LandingSection = {
  id: string;
  type: LandingSectionType;
  /** URL fragment, e.g. "Intro" → /11538-best-painting-services-westlake-oh#Intro */
  anchor: string;
  /** Label in the page's top navigation (empty = not in the nav). */
  navLabel: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  /** Sanitized HTML. */
  body: string;
  imageUrl: string;
  ctaLabel: string;
  layout: "image-left" | "image-right" | "centered";
  /** "" = theme default */
  bgColor: string;
  textColor: string;
  items: LandingItem[];
  /** "code" sections: admin-written HTML/CSS (or JS in sandbox mode). */
  code?: string;
  /** html = rendered in the page (scripts removed); sandbox = isolated iframe where JavaScript runs. */
  codeMode?: "html" | "sandbox";
  /** code sections: edge-to-edge with no padding. */
  fullWidth?: boolean;
};
export type LandingTheme = {
  primary: string;
  accent: string;
  background: string;
  text: string;
  /** Hero image darkening, 0–90 (%). */
  heroOverlay: number;
  radius: "none" | "small" | "large";
};
export type LandingContent = { version: 2; theme: LandingTheme; sections: LandingSection[] };

export const landingPages = pgTable(
  "landing_pages",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    template: landingTemplateEnum("template").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: jsonb("content").$type<LandingContent>().notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: publishStatusEnum("status").notNull().default("draft"),
    views: integer("views").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex("landing_pages_slug_uidx").on(t.slug), index("landing_pages_business_idx").on(t.businessId)],
);

export const topProsPages = pgTable(
  "top_pros_pages",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    stateId: uuid("state_id").references(() => states.id),
    cityId: uuid("city_id").references(() => cities.id),
    categoryId: uuid("category_id").references(() => categories.id),
    intro: text("intro"),
    criteria: text("criteria"),
    faqs: jsonb("faqs").$type<FaqItem[]>().notNull().default([]),
    coverUrl: text("cover_url"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    status: publishStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("top_pros_slug_uidx").on(t.slug), index("top_pros_location_idx").on(t.stateId, t.cityId)],
);

export const topProsItems = pgTable(
  "top_pros_items",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => topProsPages.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    rank: smallint("rank").notNull(),
    blurb: text("blurb"),
  },
  (t) => [primaryKey({ columns: [t.pageId, t.businessId] })],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (t) => [uniqueIndex("blog_categories_slug_uidx").on(t.slug)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull().default(""),
    coverUrl: text("cover_url"),
    categoryId: uuid("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    readMinutes: smallint("read_minutes").notNull().default(1),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    status: publishStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', f_unaccent(coalesce(title, ''))), 'A') ||
          setweight(to_tsvector('english', f_unaccent(coalesce(excerpt, ''))), 'B') ||
          setweight(to_tsvector('english', f_unaccent(coalesce(left(content, 20000), ''))), 'D')`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("blog_posts_slug_uidx").on(t.slug),
    index("blog_posts_published_idx").on(t.status, t.publishedAt),
    index("blog_posts_search_idx").using("gin", t.searchVector),
  ],
);

export const testimonials = pgTable("testimonials", {
  id: id(),
  name: text("name").notNull(),
  business: text("business"),
  quote: text("quote").notNull(),
  photoUrl: text("photo_url"),
  rating: smallint("rating").notNull().default(5),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const faqs = pgTable("faqs", {
  id: id(),
  /** about | listing | reviews | more */
  group: text("group").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const pricingPlans = pgTable("pricing_plans", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  yearlyPrice: numeric("yearly_price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  features: text("features").array().notNull().default(sql`'{}'::text[]`),
  ctaLabel: text("cta_label").notNull().default("Get started"),
  highlighted: boolean("highlighted").notNull().default(false),
  stripePriceMonthly: text("stripe_price_monthly"),
  stripePriceYearly: text("stripe_price_yearly"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Long-form CMS pages: terms, privacy. */
export const pages = pgTable(
  "pages",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    metaDescription: text("meta_description"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("pages_slug_uidx").on(t.slug)],
);

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: id(),
    kind: submissionKindEnum("kind").notNull().default("contact"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    company: text("company"),
    phone: text("phone"),
    email: text("email").notNull(),
    message: text("message").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("contact_submissions_created_idx").on(t.createdAt)],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: id(),
    email: text("email").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("newsletter_email_uidx").on(t.email)],
);
