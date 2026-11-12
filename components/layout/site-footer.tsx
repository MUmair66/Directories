import Link from "next/link";
import { inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { Mail, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { BRAND_NAME } from "@/lib/site";
import { Container } from "@/components/ui/primitives";
import { Logo } from "./logo";
import { SocialIcon, SOCIAL_LABELS } from "./social-icons";
import { NewsletterForm } from "./newsletter-form";

const DIRECTORY = [
  { label: "Top Pros", href: "/top-pros" },
  { label: "Categories", href: "/categories" },
  { label: "States", href: "/states" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/contact" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

const PAYMENT_LABELS: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover", paypal: "PayPal", applepay: "Apple Pay" };

async function footerCategories(slugs: string[]) {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.categories, tags.settings);
  if (!slugs.length) return [];
  try {
    return await db.select({ name: s.categories.name, slug: s.categories.slug, parentId: s.categories.parentId }).from(s.categories).where(inArray(s.categories.slug, slugs));
  } catch {
    return [];
  }
}

export async function SiteFooter() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.settings);
  const { site } = await getSettings();
  const cats = await footerCategories(site.footerCategories);
  return (
    <footer className="mt-auto bg-ink text-slate-300">
      <Container className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr]">
        <div className="grid content-start gap-4">
          <Logo light />
          <p className="max-w-xs text-sm text-slate-400">{BRAND_NAME} is a free US business directory. Find, compare and contact trusted local businesses.</p>
          <a href={`mailto:${site.supportEmail}`} className="inline-flex items-center gap-2 text-sm hover:text-white">
            <Mail className="size-4" aria-hidden /> {site.supportEmail}
          </a>
          {site.supportPhone && (
            <a href={`tel:${site.supportPhone}`} className="inline-flex items-center gap-2 text-sm hover:text-white">
              <Phone className="size-4" aria-hidden /> {site.supportPhone}
            </a>
          )}
          <ul className="flex gap-3" aria-label="Social media">
            {Object.entries(site.social)
              .filter(([, url]) => url)
              .map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[name] ?? name} className="flex size-9 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-primary hover:text-white">
                    <SocialIcon name={name} className="size-4" />
                  </a>
                </li>
              ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">Popular Categories</h2>
          <ul className="grid gap-2 text-sm">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link href={c.parentId ? `/search?category=${c.slug}` : `/categories/${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">Site Directory</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-1">
            {DIRECTORY.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid content-start gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Newsletter</h2>
          <p className="text-sm text-slate-400">Tips for local businesses and new features, once a month.</p>
          <NewsletterForm />
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">We accept</h3>
            <ul className="flex flex-wrap gap-2">
              {site.paymentIcons.map((p) => (
                <li key={p} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">
                  {PAYMENT_LABELS[p] ?? p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
      <div className="border-t border-slate-800">
        <Container className="flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <p>
            © <CopyrightYear /> {BRAND_NAME}. All rights reserved.
          </p>
          <p>
            <Link href="/terms" className="hover:text-white">Terms</Link> ·{" "}
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </p>
        </Container>
      </div>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
