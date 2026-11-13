import { describe, expect, it } from "vitest";
import {
  claimSchema,
  contactSchema,
  messageSchema,
  newsletterSchema,
  pricingLeadSchema,
  reportReviewSchema,
  reviewSchema,
  usPhone,
} from "@/lib/validations/forms";

const UUID = "0190f1d2-7a3b-7c4d-8e5f-0123456789ab";
const errorPaths = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) => (r.error?.issues ?? []).map((i) => i.path.join("."));

describe("usPhone", () => {
  it("accepts 10-digit and +1 numbers", () => {
    expect(usPhone.safeParse("(312) 555-0199").success).toBe(true);
    expect(usPhone.safeParse("+1 312 555 0199").success).toBe(true);
  });
  it("rejects short or foreign numbers", () => {
    expect(usPhone.safeParse("555-0199").success).toBe(false);
    expect(usPhone.safeParse("+44 20 7946 0958").success).toBe(false);
  });
});

describe("contactSchema", () => {
  const valid = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", message: "Hello, I have a question." };
  it("accepts a valid message and defaults kind to contact", () => {
    const r = contactSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.kind).toBe("contact");
  });
  it("allows an empty optional phone but rejects an invalid one", () => {
    expect(contactSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
    expect(errorPaths(contactSchema.safeParse({ ...valid, phone: "123" }))).toContain("phone");
  });
  it("requires names, a valid email and a 10+ character message", () => {
    const r = contactSchema.safeParse({ firstName: "", lastName: "", email: "nope", message: "short" });
    expect(errorPaths(r)).toEqual(expect.arrayContaining(["firstName", "lastName", "email", "message"]));
  });
});

describe("messageSchema", () => {
  const valid = { businessId: UUID, name: "Sam", email: "sam@example.com", message: "Do you service my area?" };
  it("accepts a valid lead", () => {
    expect(messageSchema.safeParse(valid).success).toBe(true);
  });
  it("caps the message at 500 characters", () => {
    expect(errorPaths(messageSchema.safeParse({ ...valid, message: "x".repeat(501) }))).toContain("message");
    expect(messageSchema.safeParse({ ...valid, message: "x".repeat(500) }).success).toBe(true);
  });
  it("requires a UUID business id", () => {
    expect(errorPaths(messageSchema.safeParse({ ...valid, businessId: "123" }))).toContain("businessId");
  });
});

describe("reviewSchema", () => {
  it("requires a 1-5 rating and 30+ characters", () => {
    expect(reviewSchema.safeParse({ businessId: UUID, rating: 5, body: "Great service, fair price and on time!" }).success).toBe(true);
    const r = reviewSchema.safeParse({ businessId: UUID, rating: 0, body: "Too short" });
    expect(errorPaths(r)).toEqual(expect.arrayContaining(["rating", "body"]));
    expect(reviewSchema.safeParse({ businessId: UUID, rating: 6, body: "x".repeat(40) }).success).toBe(false);
    expect(reviewSchema.safeParse({ businessId: UUID, rating: 4.5, body: "x".repeat(40) }).success).toBe(false);
  });
  it("trims before checking length", () => {
    expect(reviewSchema.safeParse({ businessId: UUID, rating: 3, body: `   ${"x".repeat(29)}   ` }).success).toBe(false);
  });
});

describe("claimSchema", () => {
  const doc = { key: "claim/u/1.pdf", fileName: "license.pdf", contentType: "application/pdf" as const, size: 1024 };
  const valid = { businessId: UUID, name: "Pat Owner", email: "pat@example.com", phone: "3125550199", documents: [doc] };
  it("accepts a claim with documents", () => {
    expect(claimSchema.safeParse(valid).success).toBe(true);
  });
  it("requires at least one document", () => {
    expect(errorPaths(claimSchema.safeParse({ ...valid, documents: [] }))).toContain("documents");
  });
  it("rejects files over 10 MB and unsupported types", () => {
    expect(claimSchema.safeParse({ ...valid, documents: [{ ...doc, size: 10 * 1024 * 1024 + 1 }] }).success).toBe(false);
    expect(claimSchema.safeParse({ ...valid, documents: [{ ...doc, contentType: "application/zip" }] }).success).toBe(false);
  });
  it("accepts every allowed document type", () => {
    for (const contentType of ["image/jpeg", "image/png", "image/bmp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const) {
      expect(claimSchema.safeParse({ ...valid, documents: [{ ...doc, contentType }] }).success).toBe(true);
    }
  });
});

describe("other schemas", () => {
  it("newsletter requires an email", () => {
    expect(newsletterSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(newsletterSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
  it("pricing lead requires a plan, billing period and name", () => {
    expect(pricingLeadSchema.safeParse({ planId: UUID, billing: "yearly", name: "Lee", email: "lee@example.com" }).success).toBe(true);
    expect(pricingLeadSchema.safeParse({ planId: UUID, billing: "weekly", name: "Lee", email: "lee@example.com" }).success).toBe(false);
  });
  it("report reason must be at least 5 characters", () => {
    expect(reportReviewSchema.safeParse({ reviewId: UUID, reason: "spam" }).success).toBe(false);
    expect(reportReviewSchema.safeParse({ reviewId: UUID, reason: "Fake review" }).success).toBe(true);
  });
});
