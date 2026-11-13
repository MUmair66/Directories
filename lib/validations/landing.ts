import { z } from "zod";
import { SLUG_RE } from "@/lib/validations/business";
import { ANCHOR_RE, COLOR_RE, RESERVED_LANDING_SLUGS } from "@/lib/landing";

const color = z.string().trim().regex(COLOR_RE, "Use a hex color like #1d4ed8");
const optColor = color.or(z.literal(""));
const url = z.string().trim().max(1000).refine((v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/"), "Use a full image URL (https://…)");

export const landingSlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "URL must be at least 3 characters")
  .max(120)
  .regex(SLUG_RE, "Use lowercase letters, numbers and hyphens only")
  .refine((s) => !RESERVED_LANDING_SLUGS.has(s), "This URL is reserved by the site. Choose another.");

export const landingItemSchema = z.object({
  title: z.string().trim().max(200),
  text: z.string().trim().max(2000),
  imageUrl: url,
});

export const landingSectionSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(["intro", "services", "about", "gallery", "reviews", "faq", "contact", "custom", "code"]),
  anchor: z.string().trim().regex(ANCHOR_RE, "Anchor: start with a letter; letters, numbers, - or _ only"),
  navLabel: z.string().trim().max(30),
  enabled: z.boolean(),
  title: z.string().trim().max(160),
  subtitle: z.string().trim().max(400),
  body: z.string().max(20000),
  imageUrl: url,
  ctaLabel: z.string().trim().max(40),
  layout: z.enum(["image-left", "image-right", "centered"]),
  bgColor: optColor,
  textColor: optColor,
  items: z.array(landingItemSchema).max(30),
  code: z.string().max(100_000, "Custom code is limited to 100,000 characters").optional(),
  codeMode: z.enum(["html", "sandbox"]).optional(),
  fullWidth: z.boolean().optional(),
});

export const landingThemeSchema = z.object({
  primary: color,
  accent: color,
  background: color,
  text: color,
  heroOverlay: z.number().int().min(0).max(90),
  radius: z.enum(["none", "small", "large"]),
});

export const landingContentSchema = z
  .object({
    version: z.literal(2),
    theme: landingThemeSchema,
    sections: z.array(landingSectionSchema).min(1, "Add at least one section").max(30),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    c.sections.forEach((s, i) => {
      const key = s.anchor.toLowerCase();
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["sections", i, "anchor"], message: `Anchor #${s.anchor} is used twice` });
      seen.add(key);
    });
  });

export const createLandingSchema = z.object({
  businessId: z.uuid("Choose a business"),
  title: z.string().trim().min(3, "Add a title").max(160),
  slug: landingSlug,
});

export const saveLandingSchema = z.object({
  id: z.uuid(),
  businessId: z.uuid("Choose a business"),
  title: z.string().trim().min(3, "Add a title").max(160),
  slug: landingSlug,
  status: z.enum(["draft", "published"]),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
  content: landingContentSchema,
});
