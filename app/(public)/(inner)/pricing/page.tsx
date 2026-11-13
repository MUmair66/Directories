import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { getPricingPlans } from "@/lib/data/content";
import { getSettings } from "@/lib/settings";
import { pageMeta } from "@/lib/meta";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PricingPlans } from "@/components/content/pricing-plans";
import { FaqList, PageHero } from "@/components/content/blocks";

export const metadata = pageMeta({
  title: "Pricing: Landing Pages, Local SEO and Websites",
  description: `Grow beyond your free ${BRAND_NAME} listing with a high-converting landing page, local SEO or a custom website. Monthly or yearly plans.`,
  path: "/pricing",
});

const PRICING_FAQS = [
  { question: "Is listing my business still free?", answer: `Yes. A ${BRAND_NAME} listing is always free. These plans are optional growth services.` },
  { question: "Can I switch between monthly and yearly billing?", answer: "Yes. You can switch at any time; yearly plans are discounted compared with paying monthly." },
  { question: "Is there a long-term contract?", answer: "No. Monthly plans can be cancelled anytime. Yearly plans renew once a year." },
  { question: "How quickly will I see results?", answer: "Landing pages go live within days. SEO results typically build over 60 to 90 days." },
];

export default async function PricingPage() {
  const [plans, { site }] = await Promise.all([getPricingPlans(), getSettings()]);
  const allFeatures = [...new Set(plans.flatMap((p) => p.features))];

  return (
    <>
      <PageHero
        top={<Breadcrumbs items={[{ name: "Pricing" }]} />}
        title="Simple pricing to grow your business"
        subtitle={`Your ${BRAND_NAME} listing is free forever. Add a plan when you're ready for more leads.`}
      />
      <Container className="py-14">
        {plans.length ? (
          <PricingPlans
            stripeEnabled={site.stripeEnabled}
            plans={plans.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              monthlyPrice: Number(p.monthlyPrice),
              yearlyPrice: Number(p.yearlyPrice),
              features: p.features,
              ctaLabel: p.ctaLabel,
              highlighted: p.highlighted,
              stripePriceMonthly: p.stripePriceMonthly,
              stripePriceYearly: p.stripePriceYearly,
            }))}
          />
        ) : (
          <p className="text-center text-muted-foreground">Plans are being updated. Please contact sales for current pricing.</p>
        )}

        {plans.length > 0 && (
          <section className="mt-20" aria-labelledby="compare-heading">
            <h2 id="compare-heading" className="mb-6 text-2xl font-bold sm:text-3xl">
              Compare plans
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th scope="col" className="p-4 text-left font-semibold">
                      Feature
                    </th>
                    {plans.map((p) => (
                      <th key={p.id} scope="col" className="p-4 text-center font-semibold">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((f) => (
                    <tr key={f} className="border-t border-border">
                      <th scope="row" className="p-4 text-left font-normal">
                        {f}
                      </th>
                      {plans.map((p) => (
                        <td key={p.id} className="p-4 text-center">
                          {p.features.includes(f) ? (
                            <Check className="mx-auto size-5 text-success" aria-label="Included" />
                          ) : (
                            <Minus className="mx-auto size-5 text-muted-foreground" aria-label="Not included" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mx-auto mt-20 max-w-3xl" aria-labelledby="pricing-faq">
          <h2 id="pricing-faq" className="mb-6 text-2xl font-bold sm:text-3xl">
            Frequently asked questions
          </h2>
          <FaqList items={PRICING_FAQS} idPrefix="pricing" />
        </section>

        <section className="mt-20 flex flex-col items-center gap-4 rounded-xl bg-ink p-10 text-center text-white">
          <h2 className="text-2xl font-bold">Not sure which plan fits?</h2>
          <p className="max-w-xl text-slate-300">Talk to our team. We&apos;ll review your listing and recommend the fastest way to get more customers.</p>
          <Button asChild size="lg" variant="white">
            <Link href="/contact">Talk to sales</Link>
          </Button>
        </section>
      </Container>
    </>
  );
}
