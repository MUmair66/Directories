"use client";
import { useState } from "react";
import { ExternalLink, MessageSquare, Navigation, Phone } from "lucide-react";
import { track } from "@/lib/track";
import { formatPhone, hostname, telHref } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { SocialIcon, SOCIAL_LABELS } from "@/components/layout/social-icons";
import { MessageDialog } from "./message-dialog";

type Props = {
  businessId: string;
  name: string;
  phone: string | null;
  phone2: string | null;
  website: string | null;
  directionsUrl: string | null;
  address: string | null;
  socialLinks: { platform: string; url: string }[];
};

const row = "flex items-center justify-between gap-4 py-3.5 first:pt-0";
const rowIcon = "flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-[18px]";

/** Sidebar contact card: request a quote, website, phone and directions (all clicks tracked). */
export function ContactCard({ businessId, name, phone, phone2, website, directionsUrl, address, socialLinks }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <section id="contact" aria-labelledby="contact-h" className="scroll-mt-24 rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border p-5">
        <h2 id="contact-h" className="text-lg font-bold">
          Request a quote
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell {name} what you need and they&apos;ll get back to you.</p>
        <Button
          className="mt-4 h-11 w-full"
          onClick={() => {
            setMounted(true);
            setOpen(true);
          }}
        >
          <MessageSquare aria-hidden /> Send message
        </Button>
      </div>

      <ul className="divide-y divide-border p-5 text-sm">
        {website && (
          <li className={row}>
            <a href={website} target="_blank" rel="noopener nofollow" onClick={() => track(businessId, "website_click")} className="min-w-0 truncate font-semibold text-primary hover:underline">
              {hostname(website)}
              <span className="sr-only"> (business website, opens in a new tab)</span>
            </a>
            <span className={rowIcon} aria-hidden>
              <ExternalLink />
            </span>
          </li>
        )}
        {phone && (
          <li className={row}>
            <a href={telHref(phone)} onClick={() => track(businessId, "call_click")} className="font-semibold tabular-nums hover:text-primary hover:underline">
              {formatPhone(phone)}
            </a>
            <span className={rowIcon} aria-hidden>
              <Phone />
            </span>
          </li>
        )}
        {phone2 && (
          <li className={row}>
            <a href={telHref(phone2)} onClick={() => track(businessId, "call_click")} className="tabular-nums hover:text-primary hover:underline">
              {formatPhone(phone2)}
            </a>
            <span className={rowIcon} aria-hidden>
              <Phone />
            </span>
          </li>
        )}
        {(directionsUrl || address) && (
          <li className={row}>
            <div className="min-w-0">
              {directionsUrl ? (
                <a href={directionsUrl} target="_blank" rel="noopener" onClick={() => track(businessId, "directions_click")} className="font-semibold text-primary hover:underline">
                  Get directions
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <p className="font-semibold">Address</p>
              )}
              {address && <p className="mt-0.5 text-muted-foreground">{address}</p>}
            </div>
            <span className={rowIcon} aria-hidden>
              <Navigation />
            </span>
          </li>
        )}
      </ul>

      {socialLinks.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <h3 className="mb-3 text-sm font-semibold">Find them online</h3>
          <ul className="flex flex-wrap gap-2">
            {socialLinks.map((s) => (
              <li key={s.platform}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener nofollow"
                  aria-label={`${name} on ${SOCIAL_LABELS[s.platform] ?? s.platform}`}
                  className="flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:border-primary hover:text-primary"
                >
                  <SocialIcon name={s.platform} className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mounted && <MessageDialog open={open} onOpenChange={setOpen} businessId={businessId} businessName={name} />}
    </section>
  );
}
