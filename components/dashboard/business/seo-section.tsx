"use client";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { seoSchema, SOCIAL_PLATFORMS, type SeoInput } from "@/lib/validations/business";
import { saveSection } from "@/app/actions/dashboard/businesses";
import { SITE_URL } from "@/lib/site";
import { excerpt } from "@/lib/text";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { SocialIcon, SOCIAL_LABELS } from "@/components/layout/social-icons";
import { handleResult, useUnsavedWarning } from "@/components/dashboard/helpers";
import { SectionFooter, type SectionMode } from "./section-footer";
import { AutosaveStatus, useAutosave } from "./use-autosave";

const PLACEHOLDER: Record<string, string> = {
  facebook: "https://facebook.com/yourpage",
  linkedin: "https://linkedin.com/company/…",
  youtube: "https://youtube.com/@…",
  x: "https://x.com/…",
  zillow: "https://zillow.com/profile/…",
  instagram: "https://instagram.com/…",
  pinterest: "https://pinterest.com/…",
  yelp: "https://yelp.com/biz/…",
  bbb: "https://bbb.org/us/…",
  angi: "https://angi.com/companylist/…",
  foursquare: "https://foursquare.com/v/…",
  houzz: "https://houzz.com/pro/…",
};

export function ChipInput({ id, value, onChange, max = 20, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p.slice(0, 40));
    onChange(next);
    setDraft("");
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 focus-within:outline-2 focus-within:outline-ring/40">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-2.5 pr-1 text-sm text-secondary-foreground">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-900" aria-label={`Remove ${t}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length >= max ? "" : placeholder}
        disabled={value.length >= max}
        className="h-7 min-w-32 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

export function SeoSection({
  businessId,
  defaults,
  mode,
  onSaved,
  context,
}: {
  businessId: string;
  defaults: SeoInput;
  mode: SectionMode;
  onSaved: () => void;
  context: { name: string; slug: string; description: string | null; city: string };
}) {
  const form = useForm<SeoInput>({ resolver: zodResolver(seoSchema), defaultValues: defaults, mode: "onTouched" });
  const { register, control, handleSubmit, formState, watch, reset, setError } = form;
  const [pending, start] = useTransition();
  useUnsavedWarning(mode.kind === "edit" && formState.isDirty);
  const title = watch("metaTitle") || `${context.name}${context.city ? ` in ${context.city}` : ""}`;
  const desc = watch("metaDescription") || excerpt(context.description, 155);

  const persist = async (values: SeoInput, silent: boolean) => {
    const res = await saveSection({ businessId, section: "seo", data: values, wizardStep: mode.kind === "wizard" ? 6 : undefined });
    if (!silent || !res.ok) handleResult(res, { setError, success: silent ? false : undefined });
    return res.ok;
  };
  const autosave = useAutosave(form, (v) => persist(v, true), mode.kind === "wizard");
  const err = formState.errors;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        start(async () => {
          if (await persist(values, false)) {
            reset(values);
            onSaved();
          }
        }),
      )}
      className="grid gap-6"
    >
      <Field label="Business keywords" htmlFor="tags" help="Press Enter or comma after each keyword. Shown as chips on your profile and used in search.">
        <Controller control={control} name="tags" render={({ field }) => <ChipInput id="tags" value={field.value ?? []} onChange={field.onChange} placeholder="e.g. emergency plumber, water heaters" />} />
      </Field>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-5">
          <Field label="Meta title" htmlFor="metaTitle" error={err.metaTitle?.message} counter={{ value: (watch("metaTitle") ?? "").length, max: 60 }}>
            <Input id="metaTitle" {...register("metaTitle")} placeholder={`${context.name} | Plumber in ${context.city || "your city"}`} />
          </Field>
          <Field label="Meta keywords" htmlFor="metaKeywords" error={err.metaKeywords?.message}>
            <Input id="metaKeywords" {...register("metaKeywords")} placeholder="comma, separated, keywords" />
          </Field>
          <Field label="Meta description" htmlFor="metaDescription" error={err.metaDescription?.message} counter={{ value: (watch("metaDescription") ?? "").length, max: 160 }}>
            <Textarea id="metaDescription" rows={3} {...register("metaDescription")} />
          </Field>
        </div>
        <div className="grid content-start gap-2">
          <p className="text-sm font-medium">Google result preview</p>
          <div className="rounded-lg border border-border bg-white p-4 text-left dark:bg-slate-950" aria-label="Search result preview">
            <p className="truncate text-xs text-[#202124] dark:text-slate-300">
              {SITE_URL.replace(/^https?:\/\//, "")} › biz › {context.slug}
            </p>
            <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab] dark:text-blue-400">{title.slice(0, 70)}</p>
            <p className="mt-1 line-clamp-2 text-sm text-[#4d5156] dark:text-slate-400">{desc.slice(0, 160)}</p>
          </div>
        </div>
      </div>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-base font-bold">Social profiles</legend>
        <div className="grid gap-4 md:grid-cols-2">
          {SOCIAL_PLATFORMS.map((p) => (
            <Field key={p} label={SOCIAL_LABELS[p] ?? p} htmlFor={`social-${p}`} error={err.social?.[p]?.message}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <SocialIcon name={p} className="size-4" />
                </span>
                <Input id={`social-${p}`} type="url" inputMode="url" className="pl-9" placeholder={PLACEHOLDER[p]} {...register(`social.${p}` as const)} />
              </div>
            </Field>
          ))}
        </div>
      </fieldset>

      <AutosaveStatus status={autosave} />
      <SectionFooter mode={mode} dirty={formState.isDirty} pending={pending} onReset={() => reset(defaults)} />
    </form>
  );
}
