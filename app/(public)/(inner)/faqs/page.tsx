import { getFaqs } from "@/lib/data/content";
import { pageMeta } from "@/lib/meta";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Card, CardContent, Container } from "@/components/ui/primitives";
import { ContactForm } from "@/components/content/contact-form";
import { FaqList, FaqSchema, PageHero } from "@/components/content/blocks";

export const metadata = pageMeta({
  title: "Frequently Asked Questions",
  description: `Answers about ${BRAND_NAME}: listing your business, verification, claiming a listing, reviews and more.`,
  path: "/faqs",
});

const GROUPS = [
  { key: "about", title: `About ${BRAND_NAME}` },
  { key: "listing", title: `Listing on ${BRAND_NAME}` },
  { key: "reviews", title: "User Reviews" },
  { key: "more", title: "Need More Answers?" },
];

export default async function FaqsPage() {
  const faqs = await getFaqs();
  const all = faqs.map((f) => ({ question: f.question, answer: f.answer }));
  return (
    <>
      <PageHero top={<Breadcrumbs items={[{ name: "FAQs" }]} />} title="Frequently asked questions" subtitle="Everything you need to know about finding and listing businesses." />
      <Container className="grid max-w-4xl gap-12 py-12">
        {GROUPS.map((g) => {
          const items = faqs.filter((f) => f.group === g.key).map((f) => ({ question: f.question, answer: f.answer }));
          if (!items.length) return null;
          return (
            <section key={g.key} aria-labelledby={`faq-${g.key}`}>
              <h2 id={`faq-${g.key}`} className="mb-4 text-2xl font-bold">
                {g.title}
              </h2>
              <FaqList items={items} schema={false} idPrefix={g.key} />
            </section>
          );
        })}
        {all.length > 0 && <FaqSchema items={all} />}

        <section aria-labelledby="faq-contact">
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h2 id="faq-contact" className="text-2xl font-bold">
                Still have a question?
              </h2>
              <p className="mb-6 mt-1 text-muted-foreground">Send it to us and we&apos;ll reply by email.</p>
              <ContactForm kind="faq" />
            </CardContent>
          </Card>
        </section>
      </Container>
    </>
  );
}
