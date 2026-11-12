import "server-only";
import { Resend } from "resend";
import { renderEmail, type EmailTemplate, type EmailData } from "@/emails/render";

let client: Resend | undefined;

/**
 * Sends a transactional email through Resend. Without RESEND_API_KEY (local dev)
 * the email is logged instead, so flows keep working.
 */
export async function sendEmail<T extends EmailTemplate>(opts: { to: string; template: T; data: EmailData[T] }) {
  const { subject, html, text } = await renderEmail(opts.template, opts.data);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dev] to=${opts.to} subject="${subject}"\n${text}`);
    return;
  }
  client ??= new Resend(key);
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM || "no-reply@example.com",
    to: opts.to,
    subject,
    html,
    text,
  });
  if (error) console.error("[email] send failed", error);
}
