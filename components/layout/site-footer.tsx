import Link from "next/link";
import { inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { db, schema as s } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { BRAND_NAME } from "@/lib/site";
import { Container } from "@/components/ui/primitives";
import { Logo } from "./logo";
import { SocialIcon, SOCIAL_LABELS } from "./social-icons";
import { NewsletterForm } from "./newsletter-form";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Browse Categories", href: "/categories" },
  { label: "View Listings", href: "/search" },
  { label: "Browse by State", href: "/states" },
  { label: "Top Pros", href: "/top-pros" },
  { label: "Add Business", href: "/dashboard/businesses/new" },
  { label: "Pricing", href: "/pricing" },
];

const SUPPORT_LINKS = [
  { label: "Help Center", href: "/faqs" },
  { label: "Contact Us", href: "/contact" },
  { label: "Report a Listing", href: "/contact" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Blog", href: "/blog" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
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

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 font-heading text-base font-bold text-white">{children}</h2>;
}

const linkCls = "transition-colors hover:text-[#DFA9F7]";

export async function SiteFooter() {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.settings);
  const { site } = await getSettings();
  const cats = await footerCategories(site.footerCategories);
  const socials = Object.entries(site.social).filter(([, url]) => url);
  return (
    <footer className="relative mt-auto overflow-hidden bg-ink text-slate-300">
      <div className="pointer-events-none absolute -left-40 -top-40 size-96 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-48 right-0 size-[28rem] rounded-full bg-purple-500/10 blur-3xl" aria-hidden />
      <Container className="relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr]">
        <div className="grid content-start gap-4 sm:col-span-2 lg:col-span-1">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-slate-400">
            {BRAND_NAME} is a local business directory that helps you find and connect with trusted businesses in your area.
          </p>
          <ul className="grid gap-2 text-sm">
            <li>
              <a href={`mailto:${site.supportEmail}`} className={`inline-flex items-center gap-2 ${linkCls}`}>
                <Mail className="size-4 text-[#DFA9F7]" aria-hidden /> {site.supportEmail}
              </a>
            </li>
            {site.supportPhone && (
              <li>
                <a href={`tel:${site.supportPhone}`} className={`inline-flex items-center gap-2 ${linkCls}`}>
                  <Phone className="size-4 text-[#DFA9F7]" aria-hidden /> {site.supportPhone}
                </a>
              </li>
            )}
            <li className="inline-flex items-center gap-2">
              <MapPin className="size-4 text-[#DFA9F7]" aria-hidden /> Serving all 50 US states
            </li>
          </ul>
          {socials.length > 0 && (
            <ul className="flex gap-2.5" aria-label="Social media">
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[name] ?? name} className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 transition-colors hover:bg-primary hover:text-white">
                    <SocialIcon name={name} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Quick links">
          <Heading>Quick Links</Heading>
          <ul className="grid gap-2.5 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Popular categories">
          <Heading>Categories</Heading>
          <ul className="grid gap-2.5 text-sm">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link href={c.parentId ? `/search?category=${c.slug}` : `/categories/${c.slug}`} className={linkCls}>
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/categories" className="font-semibold text-[#DFA9F7] hover:text-white">
                All categories →
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Support">
          <Heading>Support</Heading>
          <ul className="grid gap-2.5 text-sm">
            {SUPPORT_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid content-start gap-4 sm:col-span-2 lg:col-span-1">
          <Heading>Stay in the Loop</Heading>
          <p className="-mt-2 text-sm text-slate-400">Get updates, local business tips and featured listings in your inbox. No spam, unsubscribe anytime.</p>
          <NewsletterForm />
          {site.paymentIcons.length > 0 && (
            <div className="mt-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">We accept</h3>
              <ul className="flex flex-wrap gap-2">
                {site.paymentIcons.map((p) => (
                  <li key={p} className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
                    {PAYMENT_LABELS[p] ?? p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Container>
      <div className="relative border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-6 text-sm text-slate-400 sm:flex-row">
          <p>
            © <CopyrightYear /> {BRAND_NAME}. All rights reserved.
          </p>
          <p className="flex items-center gap-3">
            <Link href="/terms" className={linkCls}>
              Terms of Service
            </Link>
            <span className="h-4 w-px bg-white/20" aria-hidden />
            <Link href="/privacy" className={linkCls}>
              Privacy Policy
            </Link>
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
