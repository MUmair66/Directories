import { z } from "zod";

export const usPhone = z
  .string()
  .trim()
  .refine((v) => {
    const d = v.replace(/\D/g, "");
    return d.length === 10 || (d.length === 11 && d.startsWith("1"));
  }, "Enter a valid US phone number");

export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || usPhone.safeParse(v).success, "Enter a valid US phone number");

export const email = z.email("Enter a valid email address").trim().max(254);
export const turnstileToken = z.string().optional();

export const newsletterSchema = z.object({ email });

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  company: z.string().trim().max(120).optional(),
  phone: optionalPhone,
  email,
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
  kind: z.enum(["contact", "faq"]).default("contact"),
  turnstileToken,
});

export const messageSchema = z.object({
  businessId: z.uuid(),
  landingPageId: z.uuid().optional(),
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: optionalPhone,
  email,
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(500, "Message must be 500 characters or fewer"),
  turnstileToken,
});

export const pricingLeadSchema = z.object({
  planId: z.uuid(),
  billing: z.enum(["monthly", "yearly"]),
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  phone: optionalPhone,
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1000).optional(),
  turnstileToken,
});

export const reviewSchema = z.object({
  businessId: z.uuid(),
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  body: z.string().trim().min(30, "Reviews must be at least 30 characters").max(3000),
  turnstileToken,
});

export const reportReviewSchema = z.object({
  reviewId: z.uuid(),
  reason: z.string().trim().min(5, "Tell us what's wrong").max(500),
});

export const ALLOWED_DOC_TYPES = [
  "image/jpeg",
  "image/png",
  "image/bmp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export const uploadedDocSchema = z.object({
  key: z.string().min(1),
  fileName: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_DOC_TYPES),
  size: z.number().int().positive().max(MAX_DOC_BYTES, "Files must be 10 MB or smaller"),
});

export const claimSchema = z.object({
  businessId: z.uuid(),
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  phone: usPhone,
  details: z.string().trim().max(2000).optional(),
  documents: z.array(uploadedDocSchema).min(1, "Upload at least one document").max(10),
  turnstileToken,
});
