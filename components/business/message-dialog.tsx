"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { sendMessage } from "@/app/actions/public-forms";
import { messageSchema } from "@/lib/validations/forms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { Turnstile } from "@/components/forms/turnstile";

type Values = z.input<typeof messageSchema>;

export function MessageDialog({ open, onOpenChange, businessId, businessName }: { open: boolean; onOpenChange: (o: boolean) => void; businessId: string; businessName: string }) {
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const form = useForm<Values>({ resolver: zodResolver(messageSchema), defaultValues: { businessId, name: "", phone: "", email: "", message: "" } });
  const message = form.watch("message") ?? "";
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await sendMessage({ ...values, turnstileToken: token });
    if (res.ok) {
      setSent(true);
      form.reset({ businessId, name: "", phone: "", email: "", message: "" });
    } else {
      toast.error(res.message);
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) form.setError(k as keyof Values, { message: v });
      setResetKey((k) => k + 1);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setSent(false);
      }}
    >
      <DialogContent title={sent ? "Message sent" : `Message ${businessName}`} description={sent ? undefined : "The business will reply by email or phone."}>
        {sent ? (
          <div className="grid justify-items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-12 text-success" aria-hidden />
            <p>Thanks! {businessName} received your message and will contact you soon.</p>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <Field label="Your name" htmlFor="m-name" required error={errors.name?.message}>
              <Input id="m-name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="m-email" required error={errors.email?.message}>
                <Input id="m-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
              </Field>
              <Field label="Phone" htmlFor="m-phone" error={errors.phone?.message}>
                <Input id="m-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...form.register("phone")} />
              </Field>
            </div>
            <Field label="Message" htmlFor="m-message" required error={errors.message?.message} counter={{ value: message.length, max: 500 }}>
              <Textarea id="m-message" rows={5} maxLength={500} aria-invalid={!!errors.message} {...form.register("message")} />
            </Field>
            <Turnstile onToken={setToken} resetKey={resetKey} />
            <Button type="submit" loading={form.formState.isSubmitting}>
              Send message
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
