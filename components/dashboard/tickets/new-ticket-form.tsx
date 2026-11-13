"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ticketSchema } from "@/lib/validations/business";
import { createTicket } from "@/app/actions/dashboard/tickets";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, NativeSelect } from "@/components/ui/primitives";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { handleResult } from "@/components/dashboard/helpers";
import { AttachmentPicker } from "./attachment-picker";

type Values = z.input<typeof ticketSchema>;

export function NewTicketForm({ businesses, email, phone, defaultBusinessId }: { businesses: { id: string; name: string }[]; email: string; phone?: string | null; defaultBusinessId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { businessId: defaultBusinessId ?? "", category: "listing", priority: "medium", email, phone: phone ?? "", subject: "", message: "", attachments: [] },
  });
  const { register, control, handleSubmit, formState, setError } = form;
  const e = formState.errors;

  return (
    <Card className="p-5 sm:p-8">
      <form
        noValidate
        className="grid gap-5"
        onSubmit={handleSubmit((values) =>
          start(async () => {
            const res = handleResult(await createTicket(values), { setError });
            if (res.ok && res.data) router.push(`/dashboard/tickets/${res.data.id}`);
          }),
        )}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Related business" htmlFor="businessId" error={e.businessId?.message}>
            <NativeSelect id="businessId" {...register("businessId")}>
              <option value="">None</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Category" htmlFor="category" required error={e.category?.message}>
            <NativeSelect id="category" {...register("category")}>
              <option value="listing">Listing</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="claim">Claim</option>
              <option value="other">Other</option>
            </NativeSelect>
          </Field>
          <Field label="Priority" htmlFor="priority" required error={e.priority?.message}>
            <NativeSelect id="priority" {...register("priority")}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="t-email" required error={e.email?.message}>
            <Input id="t-email" type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field label="Phone" htmlFor="t-phone" error={e.phone?.message}>
            <Input id="t-phone" type="tel" autoComplete="tel" {...register("phone")} />
          </Field>
        </div>
        <Field label="Subject" htmlFor="subject" required error={e.subject?.message}>
          <Input id="subject" {...register("subject")} />
        </Field>
        <Field label="Message" htmlFor="t-message" required error={e.message?.message}>
          <Controller control={control} name="message" render={({ field }) => <RichTextEditor id="t-message" value={field.value} onChange={field.onChange} headings={false} minHeight={160} invalid={!!e.message} />} />
        </Field>
        <Controller control={control} name="attachments" render={({ field }) => <AttachmentPicker value={field.value ?? []} onChange={field.onChange} />} />
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            Create ticket
          </Button>
        </div>
      </form>
    </Card>
  );
}
