"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Dialog, DialogContent } from "@/components/ui/overlays";

const KEY = "cookie-consent-v1";
type Consent = { necessary: true; analytics: boolean; marketing: boolean };

function read(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as Consent) : null;
  } catch {
    return null;
  }
}

/** Cookie banner: Accept all, Reject non-essential, Settings. */
export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState(false);
  const [prefs, setPrefs] = useState<Consent>({ necessary: true, analytics: true, marketing: false });

  useEffect(() => {
    if (!read()) setShow(true);
  }, []);

  const save = (c: Consent) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {}
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: c }));
    setShow(false);
    setSettings(false);
  };

  if (!show) return null;
  return (
    <>
      <div role="region" aria-label="Cookie consent" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-lg border border-border bg-card p-4 shadow-card-hover sm:inset-x-6 sm:p-5">
        <p className="text-sm text-foreground">
          We use cookies to run this site, measure traffic and improve your experience. See our{" "}
          <Link href="/privacy" className="font-medium text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => save({ necessary: true, analytics: true, marketing: true })}>
            Accept all
          </Button>
          <Button size="sm" variant="outline" onClick={() => save({ necessary: true, analytics: false, marketing: false })}>
            Reject non-essential
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSettings(true)}>
            Settings
          </Button>
        </div>
      </div>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent title="Cookie settings" description="Choose which optional cookies we may use.">
          <div className="grid gap-4">
            {(
              [
                ["necessary", "Strictly necessary", "Required for login, security and core features. Always on."],
                ["analytics", "Analytics", "Helps us understand how visitors use the site."],
                ["marketing", "Marketing", "Used to measure campaigns and show relevant offers."],
              ] as const
            ).map(([key, title, desc]) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  aria-label={title}
                  checked={prefs[key]}
                  disabled={key === "necessary"}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                />
              </div>
            ))}
            <Button onClick={() => save(prefs)}>Save preferences</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className="fixed bottom-24 right-4 z-30 flex size-11 items-center justify-center rounded-full bg-ink text-white shadow-card-hover transition-opacity hover:bg-primary md:bottom-6"
      aria-label="Back to top"
    >
      <ArrowUp className="size-5" />
    </button>
  );
}
