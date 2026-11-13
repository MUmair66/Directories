import { z } from "zod";
import { optionalPhone } from "./forms";

export const SOCIAL_PLATFORMS = ["facebook", "linkedin", "youtube", "x", "zillow", "instagram", "pinterest", "yelp", "bbb", "angi", "foursquare", "houzz"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Enter a full URL starting with https://");

const optionalEmail = z.string().trim().optional().or(z.literal("")).refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email address");

export const detailsSchema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(120),
  categoryIds: z.array(z.uuid()).min(1, "Choose at least one category").max(5, "Choose up to 5 categories"),
  slug: z.string().trim().min(3, "URL must be at least 3 characters").max(80).regex(SLUG_RE, "Use lowercase letters, numbers and hyphens only"),
  description: z
    .string()
    .max(20000)
    .refine((v) => v.replace(/<[^>]*>/g, " ").trim().length >= 20, "Add a short description (at least 20 characters)"),
  email: optionalEmail,
  website: optionalUrl,
  phone: optionalPhone,
  phone2: optionalPhone,
});

export const locationSchema = z
  .object({
    countryCode: z.string().length(2).default("US"),
    address: z.string().trim().max(200).optional().or(z.literal("")),
    cityName: z.string().trim().min(2, "City is required").max(80),
    stateId: z.uuid("Choose a state"),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code"),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    hideAddress: z.boolean().default(false),
    timezone: z.string().min(3).max(60).default("America/New_York"),
  })
  .refine((v) => v.hideAddress || !!v.address, { message: "Street address is required (or mark this as a service-area business)", path: ["address"] });

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM");

export const hoursRowSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    sequence: z.number().int().min(0).max(1).default(0),
    isClosed: z.boolean().default(false),
    is24h: z.boolean().default(false),
    openTime: time.nullable().optional(),
    closeTime: time.nullable().optional(),
  })
  .refine((r) => r.isClosed || r.is24h || (!!r.openTime && !!r.closeTime), { message: "Set open and close times", path: ["openTime"] });

export const hoursSchema = z.object({ hours: z.array(hoursRowSchema).max(14) });

export const mediaInfoSchema = z.object({
  videoUrl: optionalUrl.refine((v) => !v || /youtube\.com|youtu\.be|vimeo\.com/.test(v), "Use a YouTube or Vimeo link"),
});

export const seoSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  metaTitle: z.string().trim().max(60, "Keep it under 60 characters").optional().or(z.literal("")),
  metaKeywords: z.string().trim().max(255).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(160, "Keep it under 160 characters").optional().or(z.literal("")),
  social: z.partialRecord(z.enum(SOCIAL_PLATFORMS), optionalUrl).default({}),
});

export const SECTIONS = ["details", "location", "hours", "media", "seo"] as const;
export type Section = (typeof SECTIONS)[number];

export type DetailsInput = z.input<typeof detailsSchema>;
export type LocationInput = z.input<typeof locationSchema>;
export type HoursInput = z.input<typeof hoursSchema>;
export type SeoInput = z.input<typeof seoSchema>;

/** Full business payload (REST API POST/PUT). Sections are optional on PUT. */
export const apiBusinessSchema = z.object({
  details: detailsSchema,
  location: locationSchema,
  hours: hoursSchema.shape.hours.optional(),
  videoUrl: mediaInfoSchema.shape.videoUrl,
  seo: seoSchema.optional(),
  submit: z.boolean().optional(),
});
export const apiBusinessUpdateSchema = z.object({
  details: detailsSchema.partial().optional(),
  location: z.any().optional(),
  hours: hoursSchema.shape.hours.optional(),
  videoUrl: mediaInfoSchema.shape.videoUrl,
  seo: seoSchema.optional(),
});

export const ticketSchema = z.object({
  businessId: z.uuid().optional().or(z.literal("")),
  category: z.enum(["listing", "billing", "technical", "claim", "other"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  phone: optionalPhone,
  email: z.email("Enter a valid email"),
  subject: z.string().trim().min(4, "Add a subject").max(140),
  message: z.string().refine((v) => v.replace(/<[^>]*>/g, "").trim().length >= 10, "Describe the issue (10+ characters)"),
  attachments: z
    .array(z.object({ key: z.string(), fileName: z.string(), contentType: z.string(), size: z.number().int().max(10 * 1024 * 1024) }))
    .max(5)
    .default([]),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  gender: z.enum(["male", "female", "prefer_not_to_say", ""]).optional(),
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, dots and underscores only"),
  email2: optionalEmail,
  phone: z
    .string()
    .trim()
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      return d.length >= 10 && d.length <= 15;
    }, "Enter a valid phone number"),
  country: z.string().trim().min(2, "Country is required").max(60),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  zip: z.string().trim().max(12).optional().or(z.literal("")),
});
