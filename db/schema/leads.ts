import { bigint, index, jsonb, pgEnum, pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_types";
import { users } from "./auth";
import { businesses } from "./businesses";

export const leadSourceEnum = pgEnum("lead_source", ["message", "landing_page", "pricing", "api"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "closed"]);
export const eventTypeEnum = pgEnum("event_type", [
  "view",
  "call_click",
  "website_click",
  "directions_click",
  "message",
]);

export const leads = pgTable(
  "leads",
  {
    id: id(),
    /** Null for pricing-page leads, which go to the admin inbox. */
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }),
    landingPageId: uuid("landing_page_id"),
    source: leadSourceEnum("source").notNull(),
    status: leadStatusEnum("status").notNull().default("new"),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leads_business_status_created_idx").on(t.businessId, t.status, t.createdAt)],
);

export const eventLog = pgTable(
  "event_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("event_log_created_brin").using("brin", t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** review | lead | ticket | listing_status | claim */
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);
