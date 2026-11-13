"use client";
import { useState } from "react";
import { Check, Link2, Mail } from "lucide-react";
import { SocialIcon } from "@/components/layout/social-icons";

/** Share links (no third-party scripts) + copy link. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { name: "facebook", label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "x", label: "Share on X", href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { name: "linkedin", label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ];
  const cls = "flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary";
  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-sm font-semibold">Share</span>
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} className={cls}>
          <SocialIcon name={l.name} className="size-4" />
        </a>
      ))}
      <a href={`mailto:?subject=${t}&body=${u}`} aria-label="Share by email" className={cls}>
        <Mail className="size-4" />
      </a>
      <button
        type="button"
        aria-label="Copy link"
        className={cls}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}
