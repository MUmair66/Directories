"use server";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { db, schema as s, tx } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { ticketSchema } from "@/lib/validations/business";

const attachment = z.object({ key: z.string(), fileName: z.string(), contentType: z.string(), size: z.number().int().max(10 * 1024 * 1024) });

function ownAttachments(userId: string, list: z.infer<typeof attachment>[]) {
  if (list.some((a) => !a.key.startsWith(`ticket/${userId}/`))) throw new ActionError("Invalid attachment.");
}

export const createTicket = action({ schema: ticketSchema, rateLimit: "ticket" }, async (input, { user }) => {
  ownAttachments(user.id, input.attachments);
  if (input.businessId) {
    const b = await db.query.businesses.findFirst({ where: and(eq(s.businesses.id, input.businessId), eq(s.businesses.ownerId, user.id)), columns: { id: true } });
    if (!b) throw new ActionError("Choose one of your businesses.", { businessId: "Choose one of your businesses" });
  }
  const ticket = await tx(async (t) => {
    const [row] = await t
      .insert(s.supportTickets)
      .values({
        userId: user.id,
        businessId: input.businessId || null,
        category: input.category,
        priority: input.priority,
        subject: input.subject,
        phone: input.phone || null,
        email: input.email,
        lastReplyAt: new Date(),
      })
      .returning();
    const [msg] = await t.insert(s.ticketMessages).values({ ticketId: row!.id, authorId: user.id, body: sanitizeHtml(input.message) }).returning();
    if (input.attachments.length) await t.insert(s.ticketAttachments).values(input.attachments.map((a) => ({ ...a, messageId: msg!.id })));
    return row!;
  });
  const admin = process.env.ADMIN_EMAIL;
  if (admin) {
    after(() => sendEmail({ to: admin, template: "ticket-reply", data: { number: ticket.number, subject: `[New] ${ticket.subject}`, body: input.message.replace(/<[^>]*>/g, " ").slice(0, 500), url: absoluteUrl(`/admin/tickets/${ticket.id}`) } }));
  }
  return { ok: true, message: `Ticket #${ticket.number} created`, data: { id: ticket.id } };
});

export const replyTicket = action(
  {
    schema: z.object({
      ticketId: z.uuid(),
      body: z.string().refine((v) => v.replace(/<[^>]*>/g, "").trim().length >= 2, "Write a reply"),
      attachments: z.array(attachment).max(5).default([]),
    }),
    rateLimit: "ticket",
  },
  async ({ ticketId, body, attachments }, { user }) => {
    ownAttachments(user.id, attachments);
    const ticket = await db.query.supportTickets.findFirst({ where: and(eq(s.supportTickets.id, ticketId), eq(s.supportTickets.userId, user.id)) });
    if (!ticket) throw new ActionError("Ticket not found.");
    if (ticket.status === "closed") throw new ActionError("This ticket is closed. Reopen it to reply.");
    await tx(async (t) => {
      const [msg] = await t.insert(s.ticketMessages).values({ ticketId, authorId: user.id, body: sanitizeHtml(body) }).returning();
      if (attachments.length) await t.insert(s.ticketAttachments).values(attachments.map((a) => ({ ...a, messageId: msg!.id })));
      await t.update(s.supportTickets).set({ status: "open", lastReplyAt: new Date() }).where(eq(s.supportTickets.id, ticketId));
    });
    const admin = process.env.ADMIN_EMAIL;
    if (admin) {
      after(() => sendEmail({ to: admin, template: "ticket-reply", data: { number: ticket.number, subject: ticket.subject, body: body.replace(/<[^>]*>/g, " ").slice(0, 500), url: absoluteUrl(`/admin/tickets/${ticket.id}`) } }));
    }
    return { ok: true, message: "Reply sent" };
  },
);

export const setTicketOpen = action(
  { schema: z.object({ ticketId: z.uuid(), open: z.boolean() }), rateLimit: "write" },
  async ({ ticketId, open }, { user }) => {
    const res = await db
      .update(s.supportTickets)
      .set({ status: open ? "open" : "closed" })
      .where(and(eq(s.supportTickets.id, ticketId), eq(s.supportTickets.userId, user.id)))
      .returning({ id: s.supportTickets.id });
    if (!res.length) throw new ActionError("Ticket not found.");
    return { ok: true, message: open ? "Ticket reopened" : "Ticket closed" };
  },
);
