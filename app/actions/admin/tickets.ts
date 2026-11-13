"use server";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { action, ActionError } from "@/lib/action";
import { audit, notify } from "@/lib/audit";
import { db, schema as s, tx } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sanitizeHtml, stripHtml } from "@/lib/sanitize";
import { absoluteUrl } from "@/lib/site";

const STAFF = ["admin", "editor"] as const;

/** Staff reply: message + status "awaiting_reply" + notification + email to the ticket owner. */
export const replyToTicket = action(
  { schema: z.object({ ticketId: z.uuid(), body: z.string().trim().min(2, "Write a reply").max(20000), status: z.enum(["awaiting_reply", "resolved"]).default("awaiting_reply") }),
    roles: [...STAFF] },
  async ({ ticketId, body, status }, { user, ip }) => {
    const ticket = await db.query.supportTickets.findFirst({ where: eq(s.supportTickets.id, ticketId), with: { user: { columns: { email: true } } } });
    if (!ticket) throw new ActionError("Ticket not found.");
    const clean = sanitizeHtml(body);
    if (!stripHtml(clean).trim()) throw new ActionError("Write a reply.", { body: "Write a reply" });
    await tx(async (t) => {
      await t.insert(s.ticketMessages).values({ ticketId, authorId: user.id, isStaff: true, body: clean });
      await t
        .update(s.supportTickets)
        .set({ status, lastReplyAt: new Date(), assignedTo: ticket.assignedTo ?? user.id })
        .where(eq(s.supportTickets.id, ticketId));
      await notify({ userId: ticket.userId, type: "ticket", title: `New reply on ticket #${ticket.number}`, body: stripHtml(clean).slice(0, 140), link: `/dashboard/tickets/${ticketId}` }, t);
      await audit({ actorId: user.id, action: "ticket.reply", entityType: "ticket", entityId: ticketId, diff: { status }, ip }, t);
    });
    const pref = await db.query.userPreferences.findFirst({ where: eq(s.userPreferences.userId, ticket.userId) });
    if (pref?.notify.ticket !== false) {
      const to = ticket.email || ticket.user.email;
      after(() => sendEmail({ to, template: "ticket-reply", data: { number: ticket.number, subject: ticket.subject, body: stripHtml(clean), url: absoluteUrl(`/dashboard/tickets/${ticketId}`) } }));
    }
    return { ok: true, message: "Reply sent." };
  },
);

export const updateTicket = action(
  {
    schema: z.object({
      ticketId: z.uuid(),
      status: z.enum(["open", "awaiting_reply", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      assignedTo: z.string().max(64).nullable().optional(),
    }),
    roles: [...STAFF],
  },
  async ({ ticketId, ...changes }, { user, ip }) => {
    const set = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    if (!Object.keys(set).length) return { ok: true };
    if (set.assignedTo) {
      const staff = await db.query.users.findFirst({ where: eq(s.users.id, set.assignedTo as string), columns: { role: true } });
      if (!staff || !["admin", "editor"].includes(staff.role)) throw new ActionError("Tickets can only be assigned to staff.");
    }
    await db.update(s.supportTickets).set(set).where(eq(s.supportTickets.id, ticketId));
    await audit({ actorId: user.id, action: "ticket.update", entityType: "ticket", entityId: ticketId, diff: set, ip });
    return { ok: true, message: "Ticket updated." };
  },
);

/* ── Inbox ────────────────────────────────────────────────────────── */

export const markSubmissionRead = action({ schema: z.object({ id: z.uuid(), read: z.boolean() }), roles: [...STAFF] }, async ({ id, read }) => {
  await db.update(s.contactSubmissions).set({ readAt: read ? new Date() : null }).where(eq(s.contactSubmissions.id, id));
  return { ok: true };
});

export const deleteSubmission = action({ schema: z.object({ id: z.uuid() }), roles: [...STAFF] }, async ({ id }, { user, ip }) => {
  await db.delete(s.contactSubmissions).where(eq(s.contactSubmissions.id, id));
  await audit({ actorId: user.id, action: "contact.delete", entityType: "contact_submission", entityId: id, ip });
  return { ok: true, message: "Message deleted." };
});

export const updatePricingLead = action({ schema: z.object({ id: z.uuid(), status: z.enum(["new", "contacted", "closed"]) }), roles: [...STAFF] }, async ({ id, status }, { user, ip }) => {
  await db.update(s.leads).set({ status }).where(eq(s.leads.id, id));
  await audit({ actorId: user.id, action: "pricing_lead.status", entityType: "lead", entityId: id, diff: { status }, ip });
  return { ok: true, message: "Lead updated." };
});
