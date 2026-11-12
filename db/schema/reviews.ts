import { index, pgEnum, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, deletedAt, id, updatedAt } from "./_types";
import { users } from "./auth";
import { businesses } from "./businesses";

export const reviewStatusEnum = pgEnum("review_status", ["published", "hidden", "spam"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("published"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("reviews_business_user_uidx").on(t.businessId, t.userId),
    index("reviews_business_created_idx").on(t.businessId, t.createdAt),
  ],
);

export const reviewReplies = pgTable("review_replies", {
  reviewId: uuid("review_id")
    .primaryKey()
    .references(() => reviews.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const reviewReports = pgTable(
  "review_reports",
  {
    id: id(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    status: reportStatusEnum("status").notNull().default("open"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("review_reports_status_idx").on(t.status, t.createdAt)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.businessId] })],
);
