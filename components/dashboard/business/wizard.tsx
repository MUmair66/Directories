"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { submitForReview } from "@/app/actions/dashboard/businesses";
import { DAYS } from "@/lib/hours";
import { hoursByDay } from "@/lib/hours";
import { excerpt, formatPhone } from "@/lib/text";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Checkbox } from "@/components/ui/controls";
import { DetailsSection } from "./details-section";
import { LocationSection, type StateOption } from "./location-section";
import { HoursSection } from "./hours-section";
import { MediaSection } from "./media-section";
import { SeoSection } from "./seo-section";
import { detailsDefaults, hoursDefaults, locationDefaults, seoDefaults, type FormBusiness } from "./defaults";
import type { CategoryOption } from "./category-picker";

export const STEPS = ["Details", "Location", "Hours", "Media", "SEO & social", "Review"] as const;

export function Wizard({ business, initialStep, categories, states }: { business: FormBusiness | null; initialStep: number; categories: CategoryOption[]; states: StateOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(1, initialStep), business ? 6 : 1));
  const id = business?.id;
  const maxReached = Math.max(business?.wizardStep ?? 1, step);

  const go = (next: number, newId?: string) => {
    const bid = newId ?? id;
    setStep(next);
    router.replace(`/dashboard/businesses/new?id=${bid}&step=${next}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };
  const back = step > 1 ? () => go(step - 1) : undefined;
  const preview = id ? `/dashboard/businesses/${id}/preview` : undefined;
  const wizard = (isLast = false) => ({ kind: "wizard" as const, onBack: back, previewHref: preview, isLast });

  return (
    <div className="grid gap-6">
      <nav aria-label="Progress">
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step || (n <= maxReached && n !== step);
            const reachable = !!id && n <= maxReached;
            return (
              <li key={label} className="flex min-w-fit flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && go(n)}
                  aria-current={n === step ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                    n === step ? "border-primary bg-secondary text-secondary-foreground" : "border-border bg-card",
                    reachable && n !== step && "hover:bg-muted",
                    !reachable && "opacity-60",
                  )}
                >
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", n === step ? "bg-primary text-white" : done ? "bg-success text-white" : "bg-muted text-muted-foreground")}>
                    {done && n !== step ? <Check className="size-3.5" /> : n}
                  </span>
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <Card className="p-5 sm:p-8">
        <h2 className="mb-1 text-xl font-bold">
          Step {step} of 6: {STEPS[step - 1]}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">Your progress is saved automatically as a draft.</p>
        {step === 1 && <DetailsSection key={id ?? "new"} businessId={id} defaults={detailsDefaults(business)} categories={categories} mode={wizard()} onSaved={(newId) => go(2, newId)} />}
        {step > 1 && !business && (
          <p className="text-sm text-muted-foreground" role="status">
            Loading your draft…
          </p>
        )}
        {step === 2 && id && <LocationSection businessId={id} defaults={locationDefaults(business)} states={states} mode={wizard()} onSaved={() => go(3)} />}
        {step === 3 && id && <HoursSection businessId={id} defaults={hoursDefaults(business)} mode={wizard()} onSaved={() => go(4)} />}
        {step === 4 && business && <MediaSection business={business} mode={wizard()} onSaved={() => go(5)} />}
        {step === 5 && business && (
          <SeoSection
            businessId={business.id}
            defaults={seoDefaults(business)}
            mode={wizard()}
            onSaved={() => go(6)}
            context={{ name: business.name, slug: business.slug, description: business.description, city: business.cityName }}
          />
        )}
        {step === 6 && business && <ReviewStep business={business} categories={categories} states={states} onEdit={go} onBack={back} />}
      </Card>
    </div>
  );
}

function ReviewStep({ business: b, categories, states, onEdit, onBack }: { business: FormBusiness; categories: CategoryOption[]; states: StateOption[]; onEdit: (step: number) => void; onBack?: () => void }) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [pending, start] = useTransition();
  const catNames = b.categoryIds.map((cid) => categories.flatMap((p) => p.children).find((c) => c.id === cid)?.name).filter(Boolean);
  const state = states.find((s) => s.id === b.stateId);
  const hours = hoursByDay(b.hours);
  const social = Object.entries(b.social).filter(([, v]) => v);
  const Section = SummarySection;

  return (
    <div className="grid gap-4">
      <Section onEdit={onEdit} title="Details" step={1}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{b.name}</dd>
          <dt className="text-muted-foreground">Categories</dt>
          <dd>{catNames.length ? catNames.join(", ") : <Missing />}</dd>
          <dt className="text-muted-foreground">URL</dt>
          <dd className="break-all">
            {SITE_URL}/biz/{b.slug}
          </dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{b.phone ? formatPhone(b.phone) : "—"}</dd>
          <dt className="text-muted-foreground">Website</dt>
          <dd className="break-all">{b.website || "—"}</dd>
        </dl>
        <p className="mt-2 line-clamp-3 text-muted-foreground">{excerpt(b.description, 300) || <Missing />}</p>
      </Section>
      <Section onEdit={onEdit} title="Location" step={2}>
        {b.cityName && state && b.zip ? (
          <p>
            {b.hideAddress ? "Address hidden (service-area business)" : b.address}, {b.cityName}, {state.code} {b.zip}
          </p>
        ) : (
          <Missing />
        )}
      </Section>
      <Section onEdit={onEdit} title="Hours" step={3}>
        <ul className="grid gap-0.5 sm:grid-cols-2">
          {hours.map((h) => (
            <li key={h.day} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{DAYS[h.day]}</span>
              <span className={h.closed ? "text-danger" : undefined}>{h.label}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section onEdit={onEdit} title="Media" step={4}>
        <p>
          Logo: {b.media.some((m) => m.type === "logo") ? "added" : "not added"} · Banner: {b.media.some((m) => m.type === "banner") ? "added" : "not added"} · Gallery:{" "}
          {b.media.filter((m) => m.type === "gallery").length} photos · Video: {b.videoUrl ? "added" : "none"}
        </p>
      </Section>
      <Section onEdit={onEdit} title="SEO & social" step={5}>
        <p>Meta title: {b.seo?.metaTitle || "auto-generated"}</p>
        <p>Keywords: {b.seo?.tags.length ? b.seo.tags.join(", ") : "none"}</p>
        <p>Social profiles: {social.length ? social.map(([k]) => k).join(", ") : "none"}</p>
      </Section>

      <label className="mt-2 flex items-start gap-3 text-sm">
        <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} aria-label="Accept terms" className="mt-0.5" />
        <span>
          I confirm I&apos;m authorized to list this business and I accept the{" "}
          <Link href="/terms" target="_blank" className="font-medium text-primary underline">
            Terms of Service
          </Link>
          .
        </span>
      </label>

      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        After you submit, an admin reviews your listing. It appears on the website only once it&apos;s approved, and we&apos;ll email you when it&apos;s live.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
        <Button
          type="button"
          disabled={!agree}
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await submitForReview({ businessId: b.id });
              if (!res.ok) return void toast.error(res.message);
              toast.success(res.message ?? "Submitted for review");
              router.push("/dashboard/businesses?submitted=1");
            })
          }
        >
          Submit for review
        </Button>
      </div>
    </div>
  );
}

function SummarySection({ title, step, children, onEdit }: { title: string; step: number; children: React.ReactNode; onEdit: (step: number) => void }) {
  return (
    <section className="rounded-lg border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold">{title}</h3>
        <Button type="button" variant="link" size="sm" onClick={() => onEdit(step)} aria-label={`Edit ${title}`}>
          <Pencil /> Edit
        </Button>
      </div>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function Missing() {
  return <span className="text-danger">Missing</span>;
}
