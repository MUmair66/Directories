import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_types";
import { users } from "./auth";
import { businesses } from "./businesses";

export const ticketCategoryEnum = pgEnum("ticket_category", ["listing", "billing", "technical", "claim", "other"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "critical"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "awaiting_reply", "resolved", "closed"]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: id(),
    /** Human-friendly ticket number shown as #1042. */
    number: serial("number").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "set null" }),
    category: ticketCategoryEnum("category").notNull(),
    priority: ticketPriorityEnum("priority").notNull().default("medium"),
    status: ticketStatusEnum("status").notNull().default("open"),
    subject: text("subject").notNull(),
    phone: text("phone"),
    email: text("email"),
    assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("support_tickets_user_status_idx").on(t.userId, t.status),
    uniqueIndex("support_tickets_number_uidx").on(t.number),
  ],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: id(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    isStaff: boolean("is_staff").notNull().default(false),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

export const ticketAttachments = pgTable("ticket_attachments", {
  id: id(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => ticketMessages.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull(),
    last4: text("last4").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    requestCount: integer("request_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("api_keys_hash_uidx").on(t.keyHash), index("api_keys_user_idx").on(t.userId)],
);
