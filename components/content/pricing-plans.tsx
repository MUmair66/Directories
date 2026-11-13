"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { pricingLeadSchema } from "@/lib/validations/forms";
import { submitPricingLead } from "@/app/actions/public-forms";
import { Button } from "@/components/ui/button";
import { Badge, Field, Input, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Turnstile } from "@/components/forms/turnstile";
import { cn } from "@/lib/utils";

export type PlanView = {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  ctaLabel: string;
  highlighted: boolean;
  stripePriceMonthly: string | null;
  stripePriceYearly: string | null;
};

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 });

/** Monthly/Yearly toggle, plan cards and the lead form dialog. */
export function PricingPlans({ plans, stripeEnabled }: { plans: PlanView[]; stripeEnabled: boolean }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selected, setSelected] = useState<PlanView | null>(null);
  const maxSave = Math.max(0, ...plans.map((p) => (p.monthlyPrice > 0 ? Math.round((1 - p.yearlyPrice / (p.monthlyPrice * 12)) * 100) : 0)));
  // Middle plan is emphasized unless an admin flagged another one.
  const highlightId = plans.find((p) => p.highlighted)?.id ?? plans[Math.floor(plans.length / 2)]?.id;

  return (
    <>
      <div className="mb-10 flex items-center justify-center gap-3" role="radiogroup" aria-label="Billing period">
        {(["monthly", "yearly"] as const).map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={billing === b}
            onClick={() => setBilling(b)}
            className={cn("rounded-full px-5 py-2 text-sm font-semibold transition-colors", billing === b ? "bg-ink text-white dark:bg-primary" : "bg-muted text-muted-foreground hover:text-foreground")}
          >
            {b === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
        {maxSave > 0 && <Badge tone="success">Save up to {maxSave}%</Badge>}
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {plans.map((p) => {
          const hot = p.id === highlightId;
          const price = billing === "monthly" ? p.monthlyPrice : p.yearlyPrice;
          const save = p.monthlyPrice > 0 ? Math.round((1 - p.yearlyPrice / (p.monthlyPrice * 12)) * 100) : 0;
          return (
            <article key={p.id} className={cn("relative flex flex-col rounded-xl border bg-card p-7 shadow-card", hot ? "border-primary ring-2 ring-primary lg:-my-3 lg:py-10" : "border-border")}>
              {hot && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">Most popular</Badge>}
              <h3 className="text-xl font-bold">{p.name}</h3>
              {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
              <p className="mt-5 flex items-baseline gap-1">
                <span className="font-heading text-5xl font-extrabold tabular-nums">{usd(price)}</span>
                <span className="text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</span>
              </p>
              {billing === "yearly" && save > 0 && <p className="mt-1 text-sm font-semibold text-success">Save {save}% vs monthly</p>}
              <ul className="mt-6 grid flex-1 gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              {stripeEnabled && (billing === "monthly" ? p.stripePriceMonthly : p.stripePriceYearly) ? (
                <form action="/api/checkout" method="post" className="mt-8">
                  <input type="hidden" name="planId" value={p.id} />
                  <input type="hidden" name="billing" value={billing} />
                  <Button type="submit" size="lg" className="w-full" variant={hot ? "default" : "outline"}>
                    {p.ctaLabel}
                  </Button>
                </form>
              ) : (
                <Button size="lg" className="mt-8 w-full" variant={hot ? "default" : "outline"} onClick={() => setSelected(p)}>
                  {p.ctaLabel}
                </Button>
              )}
            </article>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent title={`Get started with ${selected.name}`} description="Tell us about your business and our team will contact you within 1 business day.">
            <LeadForm plan={selected} billing={billing} onDone={() => setSelected(null)} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

type In = z.input<typeof pricingLeadSchema>;
type Out = z.output<typeof pricingLeadSchema>;

function LeadForm({ plan, billing, onDone }: { plan: PlanView; billing: "monthly" | "yearly"; onDone: () => void }) {
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const { register, handleSubmit, formState, setError } = useForm<In, unknown, Out>({
    resolver: zodResolver(pricingLeadSchema),
    defaultValues: { planId: plan.id, billing, name: "", email: "", phone: "", company: "", message: "" },
  });
  const err = formState.errors;
  const onSubmit = handleSubmit(async (values) => {
    const res = await submitPricingLead({ ...values, planId: plan.id, billing, turnstileToken: token });
    if (res.ok) {
      toast.success(res.message ?? "Thanks!");
      onDone();
    } else {
      toast.error(res.message);
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof In, { message: v });
      setResetKey((k) => k + 1);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <Field label="Your name" htmlFor="lead-name" required error={err.name?.message}>
        <Input id="lead-name" autoComplete="name" aria-invalid={!!err.name} {...register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="lead-email" required error={err.email?.message}>
          <Input id="lead-email" type="email" autoComplete="email" aria-invalid={!!err.email} {...register("email")} />
        </Field>
        <Field label="Phone" htmlFor="lead-phone" error={err.phone?.message}>
          <Input id="lead-phone" type="tel" autoComplete="tel" aria-invalid={!!err.phone} {...register("phone")} />
        </Field>
      </div>
      <Field label="Company" htmlFor="lead-company">
        <Input id="lead-company" autoComplete="organization" {...register("company")} />
      </Field>
      <Field label="Anything we should know?" htmlFor="lead-message" error={err.message?.message}>
        <Textarea id="lead-message" rows={3} {...register("message")} />
      </Field>
      <Turnstile onToken={setToken} resetKey={resetKey} />
      <Button type="submit" loading={formState.isSubmitting}>
        Request a call back
      </Button>
    </form>
  );
}
