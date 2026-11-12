import { sql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as s from "../schema";
import { DEFAULT_HOMEPAGE, DEFAULT_SITE } from "../../lib/settings-defaults";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "LocalFind";

export async function seedContent(db: NeonDatabase<typeof s>) {
  await db
    .insert(s.settings)
    .values([
      { key: "site", value: DEFAULT_SITE as unknown as Record<string, unknown> },
      { key: "homepage", value: DEFAULT_HOMEPAGE as unknown as Record<string, unknown> },
    ])
    .onConflictDoNothing();

  const [{ n: faqCount }] = (await db.execute(sql`select count(*)::int as n from faqs`)).rows as { n: number }[];
  if (!faqCount) {
    await db.insert(s.faqs).values([
      { group: "about", question: `What is ${BRAND}?`, answer: `${BRAND} is a free US business directory that helps people find, compare and contact local businesses in every state and city.`, sortOrder: 1 },
      { group: "about", question: `Is ${BRAND} free to use?`, answer: "Yes. Searching, reading reviews and contacting businesses is free. Listing a business is free too.", sortOrder: 2 },
      { group: "listing", question: "How do I add my business?", answer: "Create a free account, click “Add Business” and complete the 6-step wizard. Most owners finish in under 5 minutes.", sortOrder: 1 },
      { group: "listing", question: "How long does review take?", answer: "Our team reviews new listings within 1 to 2 business days. You'll get an email as soon as your listing is live.", sortOrder: 2 },
      { group: "listing", question: "How do I get the Verified badge?", answer: "Open My Businesses, choose Verify, and confirm with a code sent by SMS or email, or upload a business document.", sortOrder: 3 },
      { group: "listing", question: "My business is already listed. How do I claim it?", answer: "Open the business page and click “Is this your business? Claim it”. Upload proof of ownership and we'll transfer the listing to you.", sortOrder: 4 },
      { group: "reviews", question: "Who can write reviews?", answer: "Any registered user can write one review per business. Reviews must be at least 30 characters and follow our content guidelines.", sortOrder: 1 },
      { group: "reviews", question: "Can a business remove a negative review?", answer: "No. Owners can reply publicly or report a review that breaks our guidelines. Our moderators decide on reported reviews.", sortOrder: 2 },
      { group: "more", question: "I still need help.", answer: "Send us a message with the form below or open a support ticket from your dashboard.", sortOrder: 1 },
    ]);
  }

  const [{ n: planCount }] = (await db.execute(sql`select count(*)::int as n from pricing_plans`)).rows as { n: number }[];
  if (!planCount) {
    await db.insert(s.pricingPlans).values([
      { name: "Landing Page", description: "A high-converting page for one service.", monthlyPrice: 49, yearlyPrice: 490, features: ["Instant results", "Competitor analysis", "Local SEO", "Monthly reports"], ctaLabel: "Get my landing page", sortOrder: 1 },
      { name: "Web SEO", description: "Rank higher and win more local customers.", monthlyPrice: 199, yearlyPrice: 1990, features: ["Local SEO", "E-commerce SEO", "Lead generation SEO", "Enterprise SEO"], ctaLabel: "Start ranking", highlighted: true, sortOrder: 2 },
      { name: "Website", description: "A complete website built for your business.", monthlyPrice: 99, yearlyPrice: 990, features: ["Professional design", "Mobile friendly", "Custom website", "Secured (SSL)"], ctaLabel: "Build my website", sortOrder: 3 },
    ]);
  }

  const [{ n: tCount }] = (await db.execute(sql`select count(*)::int as n from testimonials`)).rows as { n: number }[];
  if (!tCount) {
    await db.insert(s.testimonials).values([
      { name: "Dana R.", business: "Blue Line Plumbing", quote: `We started getting calls the same week our listing went live. ${BRAND} is now our #2 lead source.`, rating: 5, sortOrder: 1 },
      { name: "Luis M.", business: "Summit Roofing Co.", quote: "Setting up took five minutes and the dashboard shows exactly how many people called us.", rating: 5, sortOrder: 2 },
      { name: "Karen T.", business: "Bright Smile Dental", quote: "Replying to reviews from one place saves our front desk hours every month.", rating: 4, sortOrder: 3 },
      { name: "Sam P.", business: "Homeowner, Austin TX", quote: "Found a locksmith at 11 PM who was actually open. The Open now filter is a lifesaver.", rating: 5, sortOrder: 4 },
    ]);
  }

  await db
    .insert(s.pages)
    .values([
      { slug: "terms", title: "Terms of Service", content: legal("Terms of Service", ["Acceptance of terms", "Accounts", "Listings and content", "Reviews", "Prohibited conduct", "Termination", "Disclaimers", "Limitation of liability", "Changes to these terms", "Contact"]) },
      { slug: "privacy", title: "Privacy Policy", content: legal("Privacy Policy", ["Information we collect", "How we use information", "Cookies", "Sharing", "Data retention", "Your rights", "Security", "Children", "Changes", "Contact"]) },
    ])
    .onConflictDoNothing();

  await db.insert(s.blogCategories).values([{ name: "Small Business Tips", slug: "small-business-tips" }, { name: "Local SEO", slug: "local-seo" }, { name: "Home Services", slug: "home-services" }]).onConflictDoNothing();
  console.log("✓ content (settings, FAQs, pricing, testimonials, legal pages, blog categories)");
}

function legal(title: string, sections: string[]) {
  return sections
    .map((h, i) => `<h2 id="section-${i + 1}">${i + 1}. ${h}</h2><p>Placeholder text for “${h}” in the ${title}. Replace this in Admin → Content → ${title} before launch.</p>`)
    .join("");
}
