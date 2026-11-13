"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { sendMessage } from "@/app/actions/public-forms";
import { recordLandingView } from "@/app/actions/landing";
import { messageSchema } from "@/lib/validations/forms";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { Turnstile } from "@/components/forms/turnstile";

type Values = z.input<typeof messageSchema>;

/** Contact section form: creates a Lead tagged with this landing page (source "landing_page"). */
export function LandingLeadForm({ businessId, landingPageId, submitLabel, disabled }: { businessId: string; landingPageId: string; submitLabel: string; disabled?: boolean }) {
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const blank = { businessId, landingPageId, name: "", phone: "", email: "", message: "" };
  const form = useForm<Values>({ resolver: zodResolver(messageSchema), defaultValues: blank });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    if (disabled) {
      toast.info("Preview mode: the form is disabled.");
      return;
    }
    const res = await sendMessage({ ...values, turnstileToken: token });
    if (res.ok) {
      setSent(true);
      form.reset(blank);
    } else {
      toast.error(res.message);
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) form.setError(k as keyof Values, { message: v });
      setResetKey((k) => k + 1);
    }
  });

  if (sent) {
    return (
      <div className="grid justify-items-center gap-3 py-10 text-center" role="status">
        <CheckCircle2 className="size-14" style={{ color: "var(--lp-primary)" }} aria-hidden />
        <p className="text-xl font-semibold">Thanks! Your request was sent.</p>
        <p className="text-slate-600">We&apos;ll contact you shortly.</p>
        <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => setSent(false)}>
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Your name" htmlFor="lp-name" required error={errors.name?.message}>
        <Input id="lp-name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="lp-email" required error={errors.email?.message}>
          <Input id="lp-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
        </Field>
        <Field label="Phone" htmlFor="lp-phone" error={errors.phone?.message}>
          <Input id="lp-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...form.register("phone")} />
        </Field>
      </div>
      <Field label="How can we help?" htmlFor="lp-message" required error={errors.message?.message}>
        <Textarea id="lp-message" rows={5} maxLength={500} aria-invalid={!!errors.message} {...form.register("message")} />
      </Field>
      <Turnstile onToken={setToken} resetKey={resetKey} />
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="inline-flex h-12 items-center justify-center rounded-[var(--lp-radius)] px-6 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        style={{ backgroundColor: "var(--lp-primary)" }}
      >
        {form.formState.isSubmitting ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}

/** Counts one view per page load (published pages only; never in admin preview). */
export function LandingViewBeacon({ id }: { id: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordLandingView({ id });
  }, [id]);
  return null;
}
