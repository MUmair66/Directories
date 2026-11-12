import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "react-email";
import { render } from "react-email";
import { BRAND_NAME, SITE_URL } from "@/lib/site";

export type EmailData = {
  "verify-email": { name: string; url: string };
  "reset-password": { name: string; url: string };
  "listing-submitted": { name: string; businessName: string };
  "listing-status": { name: string; businessName: string; status: string; reason?: string | null; url: string };
  "new-lead": { businessName: string; leadName: string; email?: string | null; phone?: string | null; message: string };
  "new-review": { businessName: string; rating: number; body: string; url: string };
  "claim-status": { name: string; businessName: string; status: string; reason?: string | null };
  "verification-code": { code: string; businessName: string };
  "ticket-reply": { number: number; subject: string; body: string; url: string };
  "contact-received": { name: string; email: string; message: string };
};
export type EmailTemplate = keyof EmailData;

const brand = { color: "#2563EB", ink: "#0F172A", muted: "#64748B" };

function Layout({ preview, title, children, cta }: { preview: string; title: string; children: React.ReactNode; cta?: { label: string; url: string } }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, Arial, sans-serif", color: brand.ink }}>
        <Container style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 32, margin: "32px auto", maxWidth: 560 }}>
          <Text style={{ fontWeight: 700, fontSize: 18, color: brand.color, margin: 0 }}>{BRAND_NAME}</Text>
          <Heading style={{ fontSize: 22, margin: "16px 0" }}>{title}</Heading>
          {children}
          {cta && (
            <Section style={{ margin: "24px 0" }}>
              <Button href={cta.url} style={{ background: brand.color, color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 600 }}>
                {cta.label}
              </Button>
            </Section>
          )}
          <Hr style={{ borderColor: "#E2E8F0" }} />
          <Text style={{ color: brand.muted, fontSize: 12 }}>
            You received this email from {BRAND_NAME} ({SITE_URL}). Manage notifications in your dashboard under Security.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <Text style={{ fontSize: 15, lineHeight: "24px" }}>{children}</Text>;

function build<T extends EmailTemplate>(template: T, d: EmailData[T]): { subject: string; node: React.ReactElement } {
  const data = d as never as Record<string, string & number>;
  switch (template) {
    case "verify-email":
      return {
        subject: `Verify your email for ${BRAND_NAME}`,
        node: (
          <Layout preview="Confirm your email address" title={`Welcome, ${data.name}`} cta={{ label: "Verify email", url: data.url }}>
            <P>Confirm your email address to finish creating your account. The link expires in 1 hour.</P>
          </Layout>
        ),
      };
    case "reset-password":
      return {
        subject: "Reset your password",
        node: (
          <Layout preview="Reset your password" title="Reset your password" cta={{ label: "Choose a new password", url: data.url }}>
            <P>We received a request to reset your password. If you didn&apos;t ask for this, ignore this email.</P>
          </Layout>
        ),
      };
    case "listing-submitted":
      return {
        subject: `${data.businessName} was submitted for review`,
        node: (
          <Layout preview="Your listing is in review" title="Thanks for submitting your listing" cta={{ label: "Go to dashboard", url: `${SITE_URL}/dashboard/businesses` }}>
            <P>Hi {data.name}, we received {data.businessName}. Our team reviews new listings within 1 to 2 business days and will email you when it&apos;s live.</P>
          </Layout>
        ),
      };
    case "listing-status":
      return {
        subject: `${data.businessName}: listing ${String(data.status).replace("_", " ")}`,
        node: (
          <Layout preview={`Listing ${data.status}`} title={`Your listing is ${String(data.status).replace("_", " ")}`} cta={{ label: "View listing", url: data.url }}>
            <P>Hi {data.name}, the status of {data.businessName} changed to {String(data.status).replace("_", " ")}.</P>
            {data.reason ? <P>Reason: {data.reason}</P> : null}
          </Layout>
        ),
      };
    case "new-lead":
      return {
        subject: `New message for ${data.businessName} from ${data.leadName}`,
        node: (
          <Layout preview={`New lead from ${data.leadName}`} title="You have a new lead" cta={{ label: "Open leads", url: `${SITE_URL}/dashboard/leads` }}>
            <P>
              {data.leadName}
              {data.email ? ` · ${data.email}` : ""}
              {data.phone ? ` · ${data.phone}` : ""}
            </P>
            <P>{data.message}</P>
          </Layout>
        ),
      };
    case "new-review":
      return {
        subject: `New ${data.rating}-star review for ${data.businessName}`,
        node: (
          <Layout preview="You have a new review" title={`New ${data.rating}-star review`} cta={{ label: "Reply to review", url: data.url }}>
            <P>{data.body}</P>
          </Layout>
        ),
      };
    case "claim-status":
      return {
        subject: `Your claim for ${data.businessName} was ${data.status}`,
        node: (
          <Layout preview={`Claim ${data.status}`} title={`Claim ${data.status}`} cta={{ label: "Go to dashboard", url: `${SITE_URL}/dashboard/businesses` }}>
            <P>Hi {data.name}, your claim for {data.businessName} is now {data.status}.</P>
            {data.reason ? <P>Reason: {data.reason}</P> : null}
          </Layout>
        ),
      };
    case "verification-code":
      return {
        subject: `Your ${BRAND_NAME} verification code: ${data.code}`,
        node: (
          <Layout preview={`Code ${data.code}`} title="Verify your listing">
            <P>Enter this code to verify {data.businessName}. It expires in 10 minutes.</P>
            <Text style={{ fontSize: 32, fontWeight: 700, letterSpacing: 8 }}>{data.code}</Text>
          </Layout>
        ),
      };
    case "ticket-reply":
      return {
        subject: `Ticket #${data.number}: ${data.subject}`,
        node: (
          <Layout preview="New reply on your ticket" title={`New reply on ticket #${data.number}`} cta={{ label: "View ticket", url: data.url }}>
            <P>{data.body}</P>
          </Layout>
        ),
      };
    case "contact-received":
      return {
        subject: `New contact form message from ${data.name}`,
        node: (
          <Layout preview="New contact message" title="New contact form message" cta={{ label: "Open inbox", url: `${SITE_URL}/admin/inbox` }}>
            <P>
              {data.name} ({data.email})
            </P>
            <P>{data.message}</P>
          </Layout>
        ),
      };
  }
  throw new Error(`Unknown email template ${template}`);
}

export async function renderEmail<T extends EmailTemplate>(template: T, data: EmailData[T]) {
  const { subject, node } = build(template, data);
  const [html, text] = await Promise.all([render(node), render(node, { plainText: true })]);
  return { subject, html, text };
}
