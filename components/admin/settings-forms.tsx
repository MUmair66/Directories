"use client";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { homepageSchema, PAYMENT_ICONS, siteSettingsSchema } from "@/app/actions/admin/schemas";
import { saveHomepageSettings, saveSiteSettings } from "@/app/actions/admin/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Label } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { ImageField, useAdminSubmit } from "./form-utils";

type Opt = { slug: string; name: string; group?: string };

/** Ordered multi-select: checkbox list with a filter, selected items shown in order with up/down. */
function OrderedPicker({ id, options, value, onChange, max, label }: { id: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void; max?: number; label: string }) {
  const [filter, setFilter] = useState("");
  const byslug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const shown = options.filter((o) => !filter || o.name.toLowerCase().includes(filter.toLowerCase()));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    onChange(next);
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="grid content-start gap-2">
        <Label htmlFor={`${id}-filter`}>Filter {label.toLowerCase()}</Label>
        <Input id={`${id}-filter`} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Type to filter…" />
        <ul className="max-h-64 overflow-y-auto rounded-md border border-border bg-card p-1" aria-label={label}>
          {shown.map((o) => {
            const checked = value.includes(o.slug);
            const disabled = !checked && !!max && value.length >= max;
            return (
              <li key={o.slug}>
                <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={checked} disabled={disabled} onChange={() => onChange(checked ? value.filter((v) => v !== o.slug) : [...value, o.slug])} />
                  <span className="flex-1">{o.name}</span>
                  {o.group && <span className="text-xs text-muted-foreground">{o.group}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="grid content-start gap-2">
        <p className="text-sm font-medium">
          Selected ({value.length}
          {max ? `/${max}` : ""}), in display order
        </p>
        {value.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing selected.</p>
        ) : (
          <ol className="grid gap-1">
            {value.map((slug, i) => (
              <li key={slug} className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-sm">
                <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">{byslug.get(slug)?.name ?? slug}</span>
                <Button type="button" size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp aria-hidden />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  <ArrowDown aria-hidden />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => onChange(value.filter((v) => v !== slug))} aria-label={`Remove ${byslug.get(slug)?.name ?? slug}`}>
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ── Homepage ─────────────────────────────────────────────────────── */

type HomeValues = z.input<typeof homepageSchema>;

export function HomepageSettingsForm({ initial, categories, states }: { initial: HomeValues; categories: Opt[]; states: Opt[] }) {
  const form = useForm<HomeValues, unknown, z.output<typeof homepageSchema>>({ resolver: zodResolver(homepageSchema), defaultValues: initial });
  const { register, control, formState } = form;
  const e = formState.errors;
  const chips = useFieldArray({ control, name: "heroChips" });
  const submit = useAdminSubmit(form, saveHomepageSettings);
  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Hero</CardTitle>
          <CardDescription>Quick-pick chips under the search bar and the background photo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Background image" htmlFor="hp-hero">
            <Controller control={control} name="heroImageUrl" render={({ field }) => <ImageField id="hp-hero" label="Hero background" value={field.value} onChange={field.onChange} crop={16 / 9} />} />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Quick-pick chips</legend>
            {chips.fields.map((f, i) => (
              <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <div>
                  <Label htmlFor={`chip-label-${i}`} className="sr-only">
                    Chip {i + 1} label
                  </Label>
                  <Input id={`chip-label-${i}`} placeholder="Label" {...register(`heroChips.${i}.label`)} aria-invalid={!!e.heroChips?.[i]?.label} />
                </div>
                <div>
                  <Label htmlFor={`chip-href-${i}`} className="sr-only">
                    Chip {i + 1} link
                  </Label>
                  <Input id={`chip-href-${i}`} placeholder="/search?category=plumbers" {...register(`heroChips.${i}.href`)} aria-invalid={!!e.heroChips?.[i]?.href} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => chips.remove(i)} aria-label={`Remove chip ${i + 1}`}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            {chips.fields.length < 10 && (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => chips.append({ label: "", href: "" })}>
                <Plus aria-hidden /> Add chip
              </Button>
            )}
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Featured categories</CardTitle>
          <CardDescription>The popular categories carousel (10 recommended).</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller control={control} name="featuredCategories" render={({ field }) => <OrderedPicker id="hp-cats" label="Categories" options={categories} value={field.value} onChange={field.onChange} max={20} />} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Featured states</CardTitle>
          <CardDescription>The “Browse by state” tiles (16 recommended).</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller control={control} name="featuredStates" render={({ field }) => <OrderedPicker id="hp-states" label="States" options={states} value={field.value} onChange={field.onChange} max={51} />} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO text</CardTitle>
          <CardDescription>Shown collapsed behind “Read more” at the bottom of the homepage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller control={control} name="seoText" render={({ field }) => <RichTextEditor id="hp-seo" value={field.value} onChange={(h) => field.onChange(h)} minHeight={200} />} />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="submit" loading={formState.isSubmitting}>
          Save homepage
        </Button>
      </div>
    </form>
  );
}

/* ── Site settings ────────────────────────────────────────────────── */

type SiteValues = z.input<typeof siteSettingsSchema>;
const SOCIAL = [
  ["facebook", "Facebook"],
  ["x", "X (Twitter)"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
  ["instagram", "Instagram"],
] as const;
const PAYMENT_LABELS: Record<(typeof PAYMENT_ICONS)[number], string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", paypal: "PayPal", applepay: "Apple Pay" };

export function SiteSettingsForm({ initial, categories }: { initial: SiteValues; categories: Opt[] }) {
  const form = useForm<SiteValues, unknown, z.output<typeof siteSettingsSchema>>({ resolver: zodResolver(siteSettingsSchema), defaultValues: initial });
  const { register, control, formState } = form;
  const e = formState.errors;
  const submit = useAdminSubmit(form, saveSiteSettings);
  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Brand & support</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Logo" htmlFor="ss-logo" help="Leave empty to use the default text logo.">
            <Controller control={control} name="logoUrl" render={({ field }) => <ImageField id="ss-logo" label="Logo" value={field.value} onChange={field.onChange} />} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Support email" htmlFor="ss-email" error={e.supportEmail?.message} required>
              <Input id="ss-email" type="email" {...register("supportEmail")} />
            </Field>
            <Field label="Support phone" htmlFor="ss-phone" error={e.supportPhone?.message}>
              <Input id="ss-phone" type="tel" {...register("supportPhone")} />
            </Field>
          </div>
          <Field label="Response time note" htmlFor="ss-rt" error={e.responseTime?.message} help="Shown on the contact page.">
            <Input id="ss-rt" {...register("responseTime")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {SOCIAL.map(([key, label]) => (
            <Field key={key} label={label} htmlFor={`ss-${key}`} error={e.social?.[key]?.message}>
              <Input id={`ss-${key}`} type="url" placeholder="https://" {...register(`social.${key}`)} />
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer & payments</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <Controller
            control={control}
            name="paymentIcons"
            render={({ field }) => (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Accepted payment icons</legend>
                <div className="flex flex-wrap gap-3">
                  {PAYMENT_ICONS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={field.value.includes(p)} onChange={() => field.onChange(field.value.includes(p) ? field.value.filter((x) => x !== p) : [...field.value, p])} />
                      {PAYMENT_LABELS[p]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          />
          <div className="grid gap-2">
            <p className="text-sm font-medium">Popular categories in the footer</p>
            <Controller control={control} name="footerCategories" render={({ field }) => <OrderedPicker id="ss-footer" label="Categories" options={categories} value={field.value} onChange={field.onChange} max={20} />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>API secrets (Turnstile, Resend, Stripe) live in environment variables, never in the database.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Google Analytics measurement ID" htmlFor="ss-ga" error={e.analytics?.gaId?.message}>
            <Input id="ss-ga" placeholder="G-XXXXXXXXXX" {...register("analytics.gaId")} />
          </Field>
          <Controller
            control={control}
            name="stripeEnabled"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm font-medium">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Enable Stripe checkout on the pricing page (feature flag)
              </label>
            )}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="submit" loading={formState.isSubmitting}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
