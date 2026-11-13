"use client";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { citySchema, stateSchema } from "@/app/actions/admin/schemas";
import { saveCity, saveState } from "@/app/actions/admin/taxonomy";
import { slugify } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Field, Input, NativeSelect } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { useAdminSubmit } from "./form-utils";

type SeoFields = { intro: string | null; metaTitle: string | null; metaDescription: string | null };

export function StateDialog({ state }: { state: { id: string; name: string; slug: string; lat: number; lng: number; featured: boolean } & SeoFields }) {
  const [open, setOpen] = useState(false);
  const form = useForm<z.input<typeof stateSchema>, unknown, z.output<typeof stateSchema>>({
    resolver: zodResolver(stateSchema),
    defaultValues: { ...state, intro: state.intro ?? "", metaTitle: state.metaTitle ?? "", metaDescription: state.metaDescription ?? "" },
  });
  const { register, control, watch, formState } = form;
  const e = formState.errors;
  const submit = useAdminSubmit(form, saveState, () => setOpen(false));
  const p = `st-${state.id}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Edit ${state.name}`}>
          <Pencil aria-hidden /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent title={`Edit ${state.name}`} className="max-w-2xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor={`${p}-name`} error={e.name?.message} required>
              <Input id={`${p}-name`} {...register("name")} />
            </Field>
            <Field label="Slug" htmlFor={`${p}-slug`} error={e.slug?.message} required help="Changing it adds a 301 redirect.">
              <Input id={`${p}-slug`} {...register("slug")} />
            </Field>
            <Field label="Center latitude" htmlFor={`${p}-lat`} error={e.lat?.message} required>
              <Input id={`${p}-lat`} type="number" step="any" {...register("lat")} />
            </Field>
            <Field label="Center longitude" htmlFor={`${p}-lng`} error={e.lng?.message} required>
              <Input id={`${p}-lng`} type="number" step="any" {...register("lng")} />
            </Field>
          </div>
          <SeoBlock prefix={p} control={control} register={register} watch={watch} errors={e} />
          <Controller
            control={control}
            name="featured"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm font-medium">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Featured on the homepage
              </label>
            )}
          />
          <FormButtons onCancel={() => setOpen(false)} pending={formState.isSubmitting} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CityDialog({
  city,
  states,
}: {
  city?: { id: string; stateId: string; name: string; slug: string; lat: number; lng: number; population: number | null } & SeoFields;
  states: { id: string; name: string; code: string }[];
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<z.input<typeof citySchema>, unknown, z.output<typeof citySchema>>({
    resolver: zodResolver(citySchema),
    defaultValues: {
      id: city?.id,
      stateId: city?.stateId ?? "",
      name: city?.name ?? "",
      slug: city?.slug ?? "",
      lat: city?.lat ?? "",
      lng: city?.lng ?? "",
      population: city?.population ?? undefined,
      intro: city?.intro ?? "",
      metaTitle: city?.metaTitle ?? "",
      metaDescription: city?.metaDescription ?? "",
    },
  });
  const { register, control, watch, setValue, formState } = form;
  const e = formState.errors;
  const submit = useAdminSubmit(form, saveCity, () => {
    setOpen(false);
    if (!city) form.reset();
  });
  const p = `city-${city?.id ?? "new"}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {city ? (
          <Button size="sm" variant="ghost" aria-label={`Edit ${city.name}`}>
            <Pencil aria-hidden /> Edit
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden /> Add city
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={city ? `Edit ${city.name}` : "Add city"} className="max-w-2xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor={`${p}-name`} error={e.name?.message} required>
              <Input
                id={`${p}-name`}
                {...register("name", {
                  onChange: (ev) => {
                    if (!city && !formState.dirtyFields.slug) setValue("slug", slugify(ev.target.value));
                  },
                })}
              />
            </Field>
            <Field label="Slug" htmlFor={`${p}-slug`} error={e.slug?.message} required>
              <Input id={`${p}-slug`} {...register("slug")} />
            </Field>
            <Field label="State" htmlFor={`${p}-state`} error={e.stateId?.message} required>
              <NativeSelect id={`${p}-state`} {...register("stateId")}>
                <option value="">Choose a state</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Population" htmlFor={`${p}-pop`} error={e.population?.message}>
              <Input id={`${p}-pop`} type="number" min={0} {...register("population")} />
            </Field>
            <Field label="Center latitude" htmlFor={`${p}-lat`} error={e.lat?.message} required>
              <Input id={`${p}-lat`} type="number" step="any" {...register("lat")} />
            </Field>
            <Field label="Center longitude" htmlFor={`${p}-lng`} error={e.lng?.message} required>
              <Input id={`${p}-lng`} type="number" step="any" {...register("lng")} />
            </Field>
          </div>
          <SeoBlock prefix={p} control={control} register={register} watch={watch} errors={e} />
          <FormButtons onCancel={() => setOpen(false)} pending={formState.isSubmitting} label={city ? "Save changes" : "Add city"} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function SeoBlock({ prefix, control, register, watch, errors }: { prefix: string; control: any; register: any; watch: any; errors: any }) {
  return (
    <>
      <Field label="Intro text" htmlFor={`${prefix}-intro`} error={errors.intro?.message}>
        <Controller control={control} name="intro" render={({ field }) => <RichTextEditor id={`${prefix}-intro`} value={field.value ?? ""} onChange={(html) => field.onChange(html)} minHeight={100} />} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meta title" htmlFor={`${prefix}-mt`} error={errors.metaTitle?.message} counter={{ value: (watch("metaTitle") ?? "").length, max: 60 }}>
          <Input id={`${prefix}-mt`} {...register("metaTitle")} />
        </Field>
        <Field label="Meta description" htmlFor={`${prefix}-md`} error={errors.metaDescription?.message} counter={{ value: (watch("metaDescription") ?? "").length, max: 160 }}>
          <Input id={`${prefix}-md`} {...register("metaDescription")} />
        </Field>
      </div>
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function FormButtons({ onCancel, pending, label = "Save changes" }: { onCancel: () => void; pending: boolean; label?: string }) {
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
