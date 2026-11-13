import Link from "next/link";
import { Clock, LifeBuoy, Mail, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { pageMeta } from "@/lib/meta";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Card, CardContent, Container } from "@/components/ui/primitives";
import { ContactForm } from "@/components/content/contact-form";
import { PageHero } from "@/components/content/blocks";

export const metadata = pageMeta({
  title: "Contact Us",
  description: `Questions about ${BRAND_NAME}, your listing or our plans? Send us a message and our support team will reply within 1 business day.`,
  path: "/contact",
});

export default async function ContactPage() {
  const { site } = await getSettings();
  return (
    <>
      <PageHero top={<Breadcrumbs items={[{ name: "Contact" }]} />} title="Contact us" subtitle="We're here to help with listings, reviews, billing and anything else." />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <h2 className="mb-6 text-2xl font-bold">Send us a message</h2>
            <ContactForm />
          </CardContent>
        </Card>
        <aside className="grid content-start gap-4">
          <Card>
            <CardContent className="grid gap-5 p-6">
              <div className="flex gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-semibold">Email support</p>
                  <a href={`mailto:${site.supportEmail}`} className="text-sm text-primary hover:underline">
                    {site.supportEmail}
                  </a>
                </div>
              </div>
              {site.supportPhone && (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <a href={`tel:${site.supportPhone}`} className="text-sm text-primary hover:underline">
                      {site.supportPhone}
                    </a>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-semibold">Response time</p>
                  <p className="text-sm text-muted-foreground">{site.responseTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-3 p-6">
              <LifeBuoy className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">Already have an account?</p>
                <p className="text-muted-foreground">
                  Open a <Link href="/dashboard/tickets" className="text-primary hover:underline">support ticket</Link> to track replies in your dashboard, or browse the{" "}
                  <Link href="/faqs" className="text-primary hover:underline">FAQs</Link>.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </Container>
    </>
  );
}
