"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { detailsSchema, type DetailsInput } from "@/lib/validations/business";
import { checkSlug, createDraft, saveSection } from "@/app/actions/dashboard/businesses";
import { slugify, wordCount } from "@/lib/text";
import { SITE_URL } from "@/lib/site";
import { Field, Input } from "@/components/ui/primitives";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { handleResult, useUnsavedWarning } from "@/components/dashboard/helpers";
import { CategoryPicker, type CategoryOption } from "./category-picker";
import { SectionFooter, type SectionMode } from "./section-footer";
import { AutosaveStatus, maskPhone, useAutosave } from "./use-autosave";

export function DetailsSection({
  businessId,
  defaults,
  categories,
  mode,
  onSaved,
}: {
  businessId?: string;
  defaults: DetailsInput;
  categories: CategoryOption[];
  mode: SectionMode;
  onSaved: (id: string) => void;
}) {
  const form = useForm<DetailsInput>({ resolver: zodResolver(detailsSchema), defaultValues: defaults, mode: "onTouched" });
  const { register, control, handleSubmit, formState, setValue, watch, reset, setError } = form;
  const [pending, start] = useTransition();
  const [slugState, setSlugState] = useState<{ status: "idle" | "checking" | "ok" | "taken"; suggestion?: string }>({ status: "idle" });
  const slugTouched = useRef(!!defaults.slug);
  const idRef = useRef(businessId);
  idRef.current = businessId ?? idRef.current;
  const name = watch("name");
  const slug = watch("slug");
  const description = watch("description");
  useUnsavedWarning(mode.kind === "edit" && formState.isDirty);

  // Auto-fill the slug from the name until the owner edits it.
  useEffect(() => {
    if (!slugTouched.current && name) setValue("slug", slugify(name), { shouldDirty: true });
  }, [name, setValue]);

  // Live availability check against the unique index.
  useEffect(() => {
    if (!slug || slug.length < 3) return setSlugState({ status: "idle" });
    setSlugState({ status: "checking" });
    const t = setTimeout(async () => {
      const res = await checkSlug({ slug, businessId: idRef.current });
      if (res.ok && res.data) setSlugState({ status: res.data.available ? "ok" : "taken", suggestion: res.data.suggestion });
      else setSlugState({ status: "idle" });
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  const persist = async (values: DetailsInput, silent: boolean) => {
    if (!idRef.current) {
      const res = await createDraft(values);
      if (!silent || !res.ok) handleResult(res, { setError, success: silent ? false : undefined });
      if (res.ok && res.data) {
        idRef.current = res.data.id;
        return res.data.id;
      }
      return null;
    }
    const res = await saveSection({ businessId: idRef.current, section: "details", data: values, wizardStep: mode.kind === "wizard" ? 2 : undefined });
    if (!silent || !res.ok) handleResult(res, { setError, success: silent ? false : undefined });
    return res.ok ? idRef.current : null;
  };

  const autosave = useAutosave(form, async (v) => !!(await persist(v, true)), mode.kind === "wizard");
  const words = wordCount(description);

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        start(async () => {
          const id = await persist(values, false);
          if (id) {
            reset(values);
            onSaved(id);
          }
        }),
      )}
      className="grid gap-5"
    >
      <Field label="Business name" htmlFor="name" required error={formState.errors.name?.message}>
        <Input id="name" autoComplete="organization" aria-invalid={!!formState.errors.name} {...register("name")} />
      </Field>

      <Field label="Categories" htmlFor="categories" required error={formState.errors.categoryIds?.message} help="Choose up to 5. The first one is your primary category.">
        <Controller
          control={control}
          name="categoryIds"
          render={({ field }) => <CategoryPicker id="categories" options={categories} value={field.value} onChange={field.onChange} invalid={!!formState.errors.categoryIds} />}
        />
      </Field>

      <Field
        label="Custom URL"
        htmlFor="slug"
        required
        error={formState.errors.slug?.message}
        help={
          <span className="break-all">
            Your page: {SITE_URL}/biz/<strong>{slug || "your-business"}</strong>
          </span>
        }
      >
        <div className="relative">
          <Input
            id="slug"
            aria-invalid={!!formState.errors.slug || slugState.status === "taken"}
            aria-describedby="slug-status"
            {...register("slug", {
              onChange: (e) => {
                slugTouched.current = true;
                // Keep trailing hyphens while typing; the schema rejects them on save.
                setValue("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-/, "").slice(0, 80));
              },
            })}
            className="pr-10"
          />
          <span id="slug-status" className="absolute right-3 top-1/2 -translate-y-1/2" aria-live="polite">
            {slugState.status === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Checking availability" />}
            {slugState.status === "ok" && <CheckCircle2 className="size-4 text-success" aria-label="Available" />}
            {slugState.status === "taken" && <XCircle className="size-4 text-danger" aria-label="Taken" />}
          </span>
        </div>
        {slugState.status === "taken" && (
          <p className="text-sm text-danger">
            That URL is taken.{" "}
            {slugState.suggestion && (
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => {
                  slugTouched.current = true;
                  setValue("slug", slugState.suggestion!, { shouldDirty: true, shouldValidate: true });
                }}
              >
                Use {slugState.suggestion}
              </button>
            )}
          </p>
        )}
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        required
        error={formState.errors.description?.message}
        help={
          <span className={words >= 150 ? "text-success" : undefined}>
            {words} words. {words >= 150 ? "Great length for search engines." : "150+ words recommended."}
          </span>
        }
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <RichTextEditor id="description" value={field.value} onChange={(html) => field.onChange(html)} invalid={!!formState.errors.description} placeholder="Describe your services, experience and service area" />
          )}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message} help="Never shown publicly. Messages are forwarded to you.">
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Website" htmlFor="website" error={formState.errors.website?.message}>
          <Input id="website" type="url" placeholder="https://" inputMode="url" {...register("website")} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={formState.errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(555) 555-0100" {...register("phone", { onChange: (e) => setValue("phone", maskPhone(e.target.value)) })} />
        </Field>
        <Field label="Phone 2" htmlFor="phone2" error={formState.errors.phone2?.message}>
          <Input id="phone2" type="tel" inputMode="tel" placeholder="(555) 555-0101" {...register("phone2", { onChange: (e) => setValue("phone2", maskPhone(e.target.value)) })} />
        </Field>
      </div>

      <AutosaveStatus status={autosave} />
      <SectionFooter mode={mode} dirty={formState.isDirty} pending={pending} onReset={() => reset(defaults)} />
    </form>
  );
}
