import { index, integer, pgEnum, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_types";
import { users } from "./auth";
import { businesses } from "./businesses";

export const claimStatusEnum = pgEnum("claim_status", ["pending", "approved", "rejected"]);
export const verificationMethodEnum = pgEnum("verification_method", ["sms", "email", "document"]);
export const verificationRequestStatusEnum = pgEnum("verification_request_status", [
  "pending",
  "verified",
  "failed",
  "expired",
  "rejected",
]);

export const claims = pgTable(
  "claims",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    details: text("details"),
    status: claimStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("claims_status_created_idx").on(t.status, t.createdAt)],
);

export const claimDocuments = pgTable("claim_documents", {
  id: id(),
  claimId: uuid("claim_id")
    .notNull()
    .references(() => claims.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
});

export const businessVerifications = pgTable(
  "business_verifications",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: verificationMethodEnum("method").notNull(),
    /** SHA-256 of the 6-digit code; null for document verification. */
    codeHash: text("code_hash"),
    attempts: smallint("attempts").notNull().default(0),
    status: verificationRequestStatusEnum("status").notNull().default("pending"),
    documentKey: text("document_key"),
    documentName: text("document_name"),
    rejectionReason: text("rejection_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("business_verifications_business_idx").on(t.businessId, t.createdAt)],
);
