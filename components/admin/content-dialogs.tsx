"use client";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { blogCategorySchema, FAQ_GROUPS, faqSchema, pageSchema, pricingPlanSchema, testimonialSchema } from "@/app/actions/admin/schemas";
import { saveBlogCategory, saveFaq, savePage, savePricingPlan, saveTestimonial } from "@/app/actions/admin/content";
import { slugify } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Card, CardContent, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { ImageField, useAdminSubmit } from "./form-utils";

/** Dialog trigger; forwards Radix Slot props (onClick, aria-*, ref) to the button. */
function TriggerButton({ editing, label, ...props }: { editing: boolean; label: string } & React.ComponentProps<typeof Button>) {
  return editing ? (
    <Button size="sm" variant="ghost" aria-label={`Edit ${label}`} {...props}>
      <Pencil aria-hidden /> Edit
    </Button>
  ) : (
    <Button {...props}>
      <Plus aria-hidden /> {label}
    </Button>
  );
}

function Buttons({ onCancel, pending, label }: { onCancel: () => void; pending: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" loading={pending}>
        {label}
      </Button>
    </div>
  );
}

/* ── Testimonials ─────────────────────────────────────────────────── */

type TestimonialValues = z.input<typeof testimonialSchema>;
export function TestimonialDialog({ item }: { item?: TestimonialValues & { id: string } }) {
  const [open, setOpen] = useState(false);
  const form = useForm<TestimonialValues, unknown, z.output<typeof testimonialSchema>>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: item ?? { name: "", business: "", quote: "", photoUrl: "", rating: 5, published: true, sortOrder: 0 },
  });
  const { register, control, formState } = form;
  const e = formState.errors;
  const submit = useAdminSubmit(form, saveTestimonial, () => {
    setOpen(false);
    if (!item) form.reset();
  });
  const p = `t-${item?.id ?? "new"}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton editing={!!item} label={item ? item.name : "Add testimonial"} />
      </DialogTrigger>
      <DialogContent title={item ? "Edit testimonial" : "New testimonial"}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor={`${p}-name`} error={e.name?.message} required>
              <Input id={`${p}-name`} {...register("name")} />
            </Field>
            <Field label="Business or role" htmlFor={`${p}-biz`} error={e.business?.message}>
              <Input id={`${p}-biz`} {...register("business")} />
            </Field>
          </div>
          <Field label="Quote" htmlFor={`${p}-quote`} error={e.quote?.message} required>
            <Textarea id={`${p}-quote`} rows={4} {...register("quote")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rating" htmlFor={`${p}-rating`} error={e.rating?.message}>
              <NativeSelect id={`${p}-rating`} {...register("rating")}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Sort order" htmlFor={`${p}-sort`} error={e.sortOrder?.message}>
              <Input id={`${p}-sort`} type="number" min={0} {...register("sortOrder")} />
            </Field>
          </div>
          <Field label="Photo" htmlFor={`${p}-photo`}>
            <Controller control={control} name="photoUrl" render={({ field }) => <ImageField id={`${p}-photo`} label="Photo" value={field.value} onChange={field.onChange} crop={1} />} />
          </Field>
          <Controller
            control={control}
            name="published"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm font-medium">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Published
              </label>
            )}
          />
          <Buttons onCancel={() => setOpen(false)} pending={formState.isSubmitting} label="Save testimonial" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── FAQs ─────────────────────────────────────────────────────────── */

export const FAQ_GROUP_LABELS: Record<(typeof FAQ_GROUPS)[number], string> = {
  about: "About us",
  listing: "Listing your business",
  reviews: "User reviews",
  more: "Need more answers",
};

type FaqValues = z.input<typeof faqSchema>;
export function FaqDialog({ item }: { item?: FaqValues & { id: string } }) {
  const [open, setOpen] = useState(false);
  const form = useForm<FaqValues, unknown, z.output<typeof faqSchema>>({
    resolver: zodResolver(faqSchema),
    defaultValues: item ?? { group: "about", question: "", answer: "", sortOrder: 0 },
  });
  const { register, formState } = form;
  const e = formState.errors;
  const submit = useAdminSubmit(form, saveFaq, () => {
    setOpen(false);
    if (!item) form.reset();
  });
  const p = `faq-${item?.id ?? "new"}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton editing={!!item} label={item ? "question" : "Add FAQ"} />
      </DialogTrigger>
      <DialogContent title={item ? "Edit FAQ" : "New FAQ"}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Group" htmlFor={`${p}-group`} error={e.group?.message}>
              <NativeSelect id={`${p}-group`} {...register("group")}>
                {FAQ_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {FAQ_GROUP_LABELS[g]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Sort order" htmlFor={`${p}-sort`} error={e.sortOrder?.message}>
              <Input id={`${p}-sort`} type="number" min={0} {...register("sortOrder")} />
            </Field>
          </div>
          <Field label="Question" htmlFor={`${p}-q`} error={e.question?.message} required>
            <Input id={`${p}-q`} {...register("question")} />
          </Field>
          <Field label="Answer" htmlFor={`${p}-a`} error={e.answer?.message} required>
            <Textarea id={`${p}-a`} rows={5} {...register("answer")} />
          </Field>
          <Buttons onCancel={() => setOpen(false)} pending={formState.isSubmitting} label="Save FAQ" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Pricing plans ────────────────────────────────────────────────── */

type PlanValues = z.input<typeof pricingPlanSchema>;
export function PricingPlanDialog({ plan }: { plan?: PlanValues & { id: string } }) {
  const [open, setOpen] = useState(false);
  const form = useForm<PlanValues, unknown, z.output<typeof pricingPlanSchema>>({
    resolver: zodResolver(pricingPlanSchema),
    defaultValues: plan ?? { name: "", description: "", monthlyPrice: 0, yearlyPrice: 0, features: [], ctaLabel: "Get started", highlighted: false, stripePriceMonthly: "", stripePriceYearly: "", sortOrder: 0 },
  });
  const { register, control, formState } = form;
  const e = formState.errors;
  const submit = useAdminSubmit(form, savePricingPlan, () => {
    setOpen(false);
    if (!plan) form.reset();
  });
  const p = `plan-${plan?.id ?? "new"}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton editing={!!plan} label={plan ? plan.name : "Add plan"} />
      </DialogTrigger>
      <DialogContent title={plan ? `Edit ${plan.name}` : "New plan"} className="max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor={`${p}-name`} error={e.name?.message} required>
              <Input id={`${p}-name`} {...register("name")} />
            </Field>
            <Field label="CTA label" htmlFor={`${p}-cta`} error={e.ctaLabel?.message} required>
              <Input id={`${p}-cta`} {...register("ctaLabel")} />
            </Field>
            <Field label="Monthly price (USD)" htmlFor={`${p}-m`} error={e.monthlyPrice?.message} required>
              <Input id={`${p}-m`} type="number" min={0} step="0.01" {...register("monthlyPrice")} />
            </Field>
            <Field label="Yearly price (USD)" htmlFor={`${p}-y`} error={e.yearlyPrice?.message} required>
              <Input id={`${p}-y`} type="number" min={0} step="0.01" {...register("yearlyPrice")} />
            </Field>
          </div>
          <Field label="Description" htmlFor={`${p}-desc`} error={e.description?.message}>
            <Input id={`${p}-desc`} {...register("description")} />
          </Field>
          <Field label="Features" htmlFor={`${p}-features`} error={e.features?.message} help="One feature per line.">
            <Controller
              control={control}
              name="features"
              render={({ field }) => (
                <Textarea
                  id={`${p}-features`}
                  rows={5}
                  defaultValue={field.value.join("\n")}
                  onChange={(ev) => field.onChange(ev.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
                />
              )}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Stripe monthly price ID" htmlFor={`${p}-sm`} error={e.stripePriceMonthly?.message}>
              <Input id={`${p}-sm`} {...register("stripePriceMonthly")} placeholder="price_…" />
            </Field>
            <Field label="Stripe yearly price ID" htmlFor={`${p}-sy`} error={e.stripePriceYearly?.message}>
              <Input id={`${p}-sy`} {...register("stripePriceYearly")} placeholder="price_…" />
            </Field>
            <Field label="Sort order" htmlFor={`${p}-sort`} error={e.sortOrder?.message}>
              <Input id={`${p}-sort`} type="number" min={0} {...register("sortOrder")} />
            </Field>
          </div>
          <Controller
            control={control}
            name="highlighted"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm font-medium">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Highlight as recommended (only one plan can be highlighted)
              </label>
            )}
          />
          <Buttons onCancel={() => setOpen(false)} pending={formState.isSubmitting} label="Save plan" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Blog categories ──────────────────────────────────────────────── */

type BlogCatValues = z.input<typeof blogCategorySchema>;
export function BlogCategoryDialog({ item }: { item?: BlogCatValues & { id: string } }) {
  const [open, setOpen] = useState(false);
  const form = useForm<BlogCatValues, unknown, z.output<typeof blogCategorySchema>>({ resolver: zodResolver(blogCategorySchema), defaultValues: item ?? { name: "", slug: "" } });
  const { register, setValue, formState } = form;
  const e = formState.errors;
  const submit = useAdminSubmit(form, saveBlogCategory, () => {
    setOpen(false);
    if (!item) form.reset();
  });
  const p = `bc-${item?.id ?? "new"}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${item.name}`}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus aria-hidden /> Category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={item ? "Edit blog category" : "New blog category"}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field label="Name" htmlFor={`${p}-name`} error={e.name?.message} required>
            <Input id={`${p}-name`} {...register("name", { onChange: (ev) => !item && setValue("slug", slugify(ev.target.value)) })} />
          </Field>
          <Field label="Slug" htmlFor={`${p}-slug`} error={e.slug?.message} required>
            <Input id={`${p}-slug`} {...register("slug")} />
          </Field>
          <Buttons onCancel={() => setOpen(false)} pending={formState.isSubmitting} label="Save" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Legal pages (Terms, Privacy) ─────────────────────────────────── */

type PageValues = z.input<typeof pageSchema>;
export function LegalPageForm({ page }: { page: PageValues }) {
  const form = useForm<PageValues, unknown, z.output<typeof pageSchema>>({ resolver: zodResolver(pageSchema), defaultValues: page });
  const { register, control, watch, formState } = form;
  const e = formState.errors;
  const submit = useAdminSubmit(form, savePage);
  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardContent className="grid gap-4 pt-6">
          <Field label="Title" htmlFor="pg-title" error={e.title?.message} required>
            <Input id="pg-title" {...register("title")} />
          </Field>
          <Field label="Meta description" htmlFor="pg-md" error={e.metaDescription?.message} counter={{ value: (watch("metaDescription") ?? "").length, max: 160 }}>
            <Input id="pg-md" {...register("metaDescription")} />
          </Field>
          <Field label="Content" htmlFor="pg-content" error={e.content?.message} help="Use H2 headings for sections. They become the sticky table of contents.">
            <Controller control={control} name="content" render={({ field }) => <RichTextEditor id="pg-content" value={field.value} onChange={(h) => field.onChange(h)} minHeight={480} />} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={formState.isSubmitting}>
              Save page
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
