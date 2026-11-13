import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letters and at least one number");

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").trim(),
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: "You must accept the terms to continue" }),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
  rememberMe: z.boolean().default(true),
});

export const forgotSchema = z.object({ email: z.email("Enter a valid email address").trim() });

export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

/** 0–4 strength score for the meter. */
export function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
