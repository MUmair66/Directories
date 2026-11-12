import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { createdAt, deletedAt, geographyPoint, id, tsvector, updatedAt } from "./_types";
import { users } from "./auth";
import { cities, states } from "./locations";

export const businessStatusEnum = pgEnum("business_status", [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
]);
export const verificationStatusEnum = pgEnum("verification_status", ["unverified", "pending", "verified"]);
export const mediaTypeEnum = pgEnum("media_type", ["logo", "banner", "gallery"]);
export const socialPlatformEnum = pgEnum("social_platform", [
  "facebook",
  "linkedin",
  "youtube",
  "x",
  "zillow",
  "instagram",
  "pinterest",
  "yelp",
  "bbb",
  "angi",
  "foursquare",
  "houzz",
]);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    icon: text("icon"),
    imageUrl: text("image_url"),
    intro: text("intro"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("categories_slug_uidx").on(t.slug), index("categories_parent_idx").on(t.parentId)],
);

export const businesses = pgTable(
  "businesses",
  {
    id: id(),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    email: text("email"),
    website: text("website"),
    phone: text("phone"),
    phone2: text("phone2"),
    countryCode: text("country_code").notNull().default("US"),
    stateId: uuid("state_id").references(() => states.id),
    cityId: uuid("city_id").references(() => cities.id),
    address: text("address"),
    zip: text("zip"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    /** Filled from lat/lng by trigger businesses_set_location. */
    location: geographyPoint("location"),
    timezone: text("timezone").notNull().default("America/New_York"),
    hideAddress: boolean("hide_address").notNull().default(false),
    videoUrl: text("video_url"),
    status: businessStatusEnum("status").notNull().default("draft"),
    rejectionReason: text("rejection_reason"),
    verificationStatus: verificationStatusEnum("verification_status").notNull().default("unverified"),
    claimed: boolean("claimed").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    avgRating: numeric("avg_rating", { precision: 3, scale: 2, mode: "number" }).notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
    wizardStep: smallint("wizard_step").notNull().default(1),
    // Denormalized search inputs, kept in sync by lib/businesses.ts on every save.
    categoryNames: text("category_names").notNull().default(""),
    tagText: text("tag_text").notNull().default(""),
    cityName: text("city_name").notNull().default(""),
    stateName: text("state_name").notNull().default(""),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', f_unaccent(coalesce(name, ''))), 'A') ||
          setweight(to_tsvector('english', f_unaccent(coalesce(category_names, '') || ' ' || coalesce(tag_text, ''))), 'B') ||
          setweight(to_tsvector('english', f_unaccent(coalesce(city_name, '') || ' ' || coalesce(state_name, ''))), 'C') ||
          setweight(to_tsvector('english', f_unaccent(coalesce(left(description, 5000), ''))), 'D')`,
    ),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("businesses_slug_uidx").on(t.slug),
    index("businesses_status_created_idx").on(t.status, t.createdAt),
    index("businesses_state_city_idx").on(t.stateId, t.cityId),
    index("businesses_owner_idx").on(t.ownerId),
    index("businesses_public_idx")
      .on(t.stateId, t.cityId, t.avgRating)
      .where(sql`status = 'approved' and deleted_at is null`),
    index("businesses_recent_reviews_idx")
      .on(t.lastReviewAt)
      .where(sql`status = 'approved' and deleted_at is null`),
    index("businesses_search_idx").using("gin", t.searchVector),
  ],
);

export const businessCategories = pgTable(
  "business_categories",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.businessId, t.categoryId] }),
    index("business_categories_category_business_idx").on(t.categoryId, t.businessId),
  ],
);

export const businessHours = pgTable(
  "business_hours",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** 0 = Monday ... 6 = Sunday */
    day: smallint("day").notNull(),
    openTime: time("open_time"),
    closeTime: time("close_time"),
    isClosed: boolean("is_closed").notNull().default(false),
    is24h: boolean("is_24h").notNull().default(false),
    /** 0 = first range, 1 = split-shift second range */
    sequence: smallint("sequence").notNull().default(0),
  },
  (t) => [uniqueIndex("business_hours_uidx").on(t.businessId, t.day, t.sequence)],
);

export const media = pgTable(
  "media",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    type: mediaTypeEnum("type").notNull(),
    key: text("key").notNull(),
    url: text("url").notNull(),
    width: integer("width"),
    height: integer("height"),
    blurDataUrl: text("blur_data_url"),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("media_business_type_idx").on(t.businessId, t.type, t.sortOrder)],
);

export const socialLinks = pgTable(
  "social_links",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    platform: socialPlatformEnum("platform").notNull(),
    url: text("url").notNull(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.platform] })],
);

export const businessSeo = pgTable("business_seo", {
  businessId: uuid("business_id")
    .primaryKey()
    .references(() => businesses.id, { onDelete: "cascade" }),
  metaTitle: text("meta_title"),
  metaKeywords: text("meta_keywords"),
  metaDescription: text("meta_description"),
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
});

export const slugRedirects = pgTable(
  "slug_redirects",
  {
    id: id(),
    /** "business" | "category" | "landing_page" */
    entityType: text("entity_type").notNull(),
    oldPath: text("old_path").notNull(),
    newPath: text("new_path").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("slug_redirects_old_uidx").on(t.oldPath)],
);

export const businessStatsDaily = pgTable(
  "business_stats_daily",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    views: integer("views").notNull().default(0),
    calls: integer("calls").notNull().default(0),
    websiteClicks: integer("website_clicks").notNull().default(0),
    directions: integer("directions").notNull().default(0),
    messages: integer("messages").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.date] })],
);
