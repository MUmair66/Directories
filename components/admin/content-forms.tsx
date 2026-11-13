"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { blogPostSchema, topProsSchema } from "@/app/actions/admin/schemas";
import { citiesForStateAction, saveBlogPost, saveTopPros } from "@/app/actions/admin/content";
import { slugify, wordCount } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { ImageField, useAdminSubmit } from "./form-utils";
import { FaqEditor } from "./faq-editor";
import { BusinessPicker } from "./business-picker";

type Option = { id: string; name: string };

/* ── Top Pros ─────────────────────────────────────────────────────── */

export function TopProsForm({
  page,
  states,
  categories,
}: {
  page?: z.input<typeof topProsSchema> & { id: string };
  states: (Option & { code: string })[];
  categories: (Option & { parentId: string | null })[];
}) {
  const router = useRouter();
  const form = useForm<z.input<typeof topProsSchema>, unknown, z.output<typeof topProsSchema>>({
    resolver: zodResolver(topProsSchema),
    defaultValues: page ?? { title: "", slug: "", stateId: "", cityId: "", categoryId: "", intro: "", criteria: "", faqs: [], coverUrl: "", metaTitle: "", metaDescription: "", status: "draft", items: [] },
  });
  const { register, control, watch, setValue, formState } = form;
  const e = formState.errors;
  const [cities, setCities] = useState<Option[]>([]);
  const stateId = watch("stateId");

  useEffect(() => {
    if (!stateId) return;
    let cancelled = false;
    citiesForStateAction({ stateId }).then((res) => {
      if (!cancelled && res.ok && res.data) setCities(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [stateId]);

  // Suggest "Best {Category} in {City}, {ST}" for new pages.
  const suggestTitle = () => {
    const cat = categories.find((c) => c.id === watch("categoryId"));
    const st = states.find((s) => s.id === stateId);
    const city = cities.find((c) => c.id === watch("cityId"));
    if (!cat || !st) return;
    const title = `Best ${cat.name} in ${city ? `${city.name}, ${st.code}` : st.name}`;
    setValue("title", title, { shouldDirty: true });
    if (!page) setValue("slug", slugify(title), { shouldDirty: true });
  };

  const submit = useAdminSubmit(form, saveTopPros, (res) => {
    const id = (res.data as { id: string } | undefined)?.id;
    if (!page && id) router.push(`/admin/content/top-pros/${id}`);
  });

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <div className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Page</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Category" htmlFor="tp-cat" error={e.categoryId?.message}>
                <NativeSelect id="tp-cat" {...register("categoryId")}>
                  <option value="">Any</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? "— " : ""}
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="State" htmlFor="tp-state" error={e.stateId?.message}>
                <NativeSelect id="tp-state" {...register("stateId", { onChange: () => setValue("cityId", "") })}>
                  <option value="">Any</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="City" htmlFor="tp-city" error={e.cityId?.message}>
                <NativeSelect id="tp-city" {...register("cityId")} disabled={!stateId}>
                  <option value="">{stateId ? "Any" : "Choose a state first"}</option>
                  {(stateId ? cities : []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Button type="button" variant="link" className="w-fit" onClick={suggestTitle}>
              Generate “Best [Category] in [City], [ST]” title
            </Button>
            <Field label="Title (H1)" htmlFor="tp-title" error={e.title?.message} required>
              <Input id="tp-title" {...register("title", { onChange: (ev) => !page && !formState.dirtyFields.slug && setValue("slug", slugify(ev.target.value)) })} />
            </Field>
            <Field label="Slug" htmlFor="tp-slug" error={e.slug?.message} required help={`/top-pros/${watch("slug") || "…"}`}>
              <Input id="tp-slug" {...register("slug")} />
            </Field>
            <Field label="Intro" htmlFor="tp-intro" error={e.intro?.message}>
              <Controller control={control} name="intro" render={({ field }) => <RichTextEditor id="tp-intro" value={field.value ?? ""} onChange={(h) => field.onChange(h)} />} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranked businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller control={control} name="items" render={({ field }) => <BusinessPicker id="tp-picker" value={field.value} onChange={field.onChange} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selection criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller control={control} name="criteria" render={({ field }) => <RichTextEditor id="tp-criteria" value={field.value ?? ""} onChange={(h) => field.onChange(h)} minHeight={120} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller control={control} name="faqs" render={({ field }) => <FaqEditor id="tp-faqs" value={field.value} onChange={field.onChange} error={e.faqs?.message ?? (e.faqs as { root?: { message?: string } } | undefined)?.root?.message} />} />
          </CardContent>
        </Card>
      </div>

      <aside className="grid content-start gap-6 lg:sticky lg:top-24">
        <PublishCard register={register} pending={formState.isSubmitting} error={e.status?.message} />
        <Card>
          <CardHeader>
            <CardTitle>Cover image</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller control={control} name="coverUrl" render={({ field }) => <ImageField id="tp-cover" label="Cover image" value={field.value} onChange={field.onChange} crop={16 / 9} />} />
          </CardContent>
        </Card>
        <SeoCard register={register} watch={watch} errors={e} prefix="tp" />
      </aside>
    </form>
  );
}

/* ── Blog post ────────────────────────────────────────────────────── */

export function BlogPostForm({ post, categories }: { post?: z.input<typeof blogPostSchema> & { id: string }; categories: Option[] }) {
  const router = useRouter();
  const form = useForm<z.input<typeof blogPostSchema>, unknown, z.output<typeof blogPostSchema>>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: post ?? { title: "", slug: "", excerpt: "", content: "", coverUrl: "", categoryId: "", metaTitle: "", metaDescription: "", status: "draft" },
  });
  const { register, control, watch, setValue, formState } = form;
  const e = formState.errors;
  const words = wordCount(watch("content"));
  const submit = useAdminSubmit(form, saveBlogPost, (res) => {
    const id = (res.data as { id: string } | undefined)?.id;
    if (!post && id) router.push(`/admin/content/blog/${id}`);
  });
  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <Card>
        <CardContent className="grid gap-4 pt-6">
          <Field label="Title" htmlFor="bp-title" error={e.title?.message} required>
            <Input id="bp-title" {...register("title", { onChange: (ev) => !post && !formState.dirtyFields.slug && setValue("slug", slugify(ev.target.value)) })} />
          </Field>
          <Field label="Slug" htmlFor="bp-slug" error={e.slug?.message} required help={`/blog/${watch("slug") || "…"}`}>
            <Input id="bp-slug" {...register("slug")} />
          </Field>
          <Field label="Excerpt" htmlFor="bp-excerpt" error={e.excerpt?.message} counter={{ value: (watch("excerpt") ?? "").length, max: 300 }}>
            <Textarea id="bp-excerpt" rows={2} {...register("excerpt")} />
          </Field>
          <Field label="Content" htmlFor="bp-content" error={e.content?.message} help={`${words} words · about ${Math.max(1, Math.round(words / 225))} min read`}>
            <Controller control={control} name="content" render={({ field }) => <RichTextEditor id="bp-content" value={field.value} onChange={(h) => field.onChange(h)} minHeight={420} />} />
          </Field>
        </CardContent>
      </Card>
      <aside className="grid content-start gap-6 lg:sticky lg:top-24">
        <PublishCard register={register} pending={formState.isSubmitting} error={e.status?.message} />
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Category" htmlFor="bp-cat" error={e.categoryId?.message}>
              <NativeSelect id="bp-cat" {...register("categoryId")}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Featured image" htmlFor="bp-cover" error={e.coverUrl?.message}>
              <Controller control={control} name="coverUrl" render={({ field }) => <ImageField id="bp-cover" label="Featured image" value={field.value} onChange={field.onChange} crop={16 / 9} />} />
            </Field>
          </CardContent>
        </Card>
        <SeoCard register={register} watch={watch} errors={e} prefix="bp" />
      </aside>
    </form>
  );
}

/* ── Shared side cards ────────────────────────────────────────────── */

/* eslint-disable @typescript-eslint/no-explicit-any */
function PublishCard({ register, pending, error }: { register: any; pending: boolean; error?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field label="Status" htmlFor="pub-status" error={error}>
          <NativeSelect id="pub-status" {...register("status")}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </NativeSelect>
        </Field>
        <Button type="submit" loading={pending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function SeoCard({ register, watch, errors, prefix }: { register: any; watch: any; errors: any; prefix: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field label="Meta title" htmlFor={`${prefix}-mt`} error={errors.metaTitle?.message} counter={{ value: (watch("metaTitle") ?? "").length, max: 60 }}>
          <Input id={`${prefix}-mt`} {...register("metaTitle")} />
        </Field>
        <Field label="Meta description" htmlFor={`${prefix}-md`} error={errors.metaDescription?.message} counter={{ value: (watch("metaDescription") ?? "").length, max: 160 }}>
          <Textarea id={`${prefix}-md`} rows={3} {...register("metaDescription")} />
        </Field>
      </CardContent>
    </Card>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
