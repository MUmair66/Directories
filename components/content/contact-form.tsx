"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { contactSchema } from "@/lib/validations/forms";
import { submitContact } from "@/app/actions/public-forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { Turnstile } from "@/components/forms/turnstile";

type In = z.input<typeof contactSchema>;
type Out = z.output<typeof contactSchema>;

/** Contact form (full) or the short FAQ variant (no company field). */
export function ContactForm({ kind = "contact" }: { kind?: "contact" | "faq" }) {
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [sent, setSent] = useState(false);
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(contactSchema),
    defaultValues: { firstName: "", lastName: "", company: "", phone: "", email: "", message: "", kind },
  });
  const { register, handleSubmit, formState, setError, reset, watch } = form;
  const err = formState.errors;
  const msgLen = watch("message")?.length ?? 0;
  const p = kind === "faq" ? "faq-" : "contact-";

  const onSubmit = handleSubmit(async (values) => {
    const res = await submitContact({ ...values, kind, turnstileToken: token });
    if (res.ok) {
      toast.success(res.message ?? "Message sent");
      reset();
      setSent(true);
    } else {
      toast.error(res.message);
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof In, { message: v });
    }
    setResetKey((k) => k + 1);
  });

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center" role="status">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <p className="text-lg font-bold">Thanks, your message is on its way.</p>
        <p className="text-sm text-muted-foreground">We usually reply within 1 business day.</p>
        <Button variant="outline" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor={`${p}first`} required error={err.firstName?.message}>
          <Input id={`${p}first`} autoComplete="given-name" aria-invalid={!!err.firstName} {...register("firstName")} />
        </Field>
        <Field label="Last name" htmlFor={`${p}last`} required error={err.lastName?.message}>
          <Input id={`${p}last`} autoComplete="family-name" aria-invalid={!!err.lastName} {...register("lastName")} />
        </Field>
      </div>
      {kind === "contact" && (
        <Field label="Company name" htmlFor={`${p}company`} error={err.company?.message}>
          <Input id={`${p}company`} autoComplete="organization" {...register("company")} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor={`${p}email`} required error={err.email?.message}>
          <Input id={`${p}email`} type="email" autoComplete="email" aria-invalid={!!err.email} {...register("email")} />
        </Field>
        <Field label="Phone" htmlFor={`${p}phone`} error={err.phone?.message}>
          <Input id={`${p}phone`} type="tel" autoComplete="tel" placeholder="(555) 555-0123" aria-invalid={!!err.phone} {...register("phone")} />
        </Field>
      </div>
      <Field label="Message" htmlFor={`${p}message`} required error={err.message?.message} counter={{ value: msgLen, max: 2000 }}>
        <Textarea id={`${p}message`} rows={5} aria-invalid={!!err.message} {...register("message")} />
      </Field>
      <Turnstile onToken={setToken} resetKey={resetKey} />
      <Button type="submit" size="lg" loading={formState.isSubmitting} className="w-full sm:w-fit">
        Send message
      </Button>
    </form>
  );
}
