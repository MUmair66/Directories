"use client";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { GitMerge, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { categorySchema } from "@/app/actions/admin/schemas";
import { mergeCategories, saveCategory } from "@/app/actions/admin/taxonomy";
import { slugify } from "@/lib/text";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Field, Input, NativeSelect } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/listing/category-icon";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { ImageField, useAdminSubmit } from "./form-utils";

type Values = z.input<typeof categorySchema>;
export type CategoryRecord = {
  id: string; parentId: string | null; name: string; slug: string; icon: string | null; imageUrl: string | null; intro: string | null;
  metaTitle: string | null; metaDescription: string | null; sortOrder: number; featured: boolean;
};

export function CategoryDialog({ category, parents, defaultParentId, trigger }: { category?: CategoryRecord; parents: { id: string; name: string }[]; defaultParentId?: string; trigger?: "edit" | "add-child" | "add" }) {
  const [open, setOpen] = useState(false);
  const form = useForm<Values, unknown, z.output<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      id: category?.id,
      parentId: category?.parentId ?? defaultParentId ?? "",
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      icon: category?.icon ?? "",
      imageUrl: category?.imageUrl ?? "",
      intro: category?.intro ?? "",
      metaTitle: category?.metaTitle ?? "",
      metaDescription: category?.metaDescription ?? "",
      sortOrder: category?.sortOrder ?? 0,
      featured: category?.featured ?? false,
    },
  });
  const { register, control, watch, setValue, formState } = form;
  const errors = formState.errors;
  const onSubmit = useAdminSubmit(form, saveCategory, () => {
    setOpen(false);
    if (!category) form.reset();
  });
  const prefix = category?.id ?? defaultParentId ?? "new";
  const isParent = !watch("parentId");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger === "edit" ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${category?.name}`} title="Edit">
            <Pencil aria-hidden />
          </Button>
        ) : trigger === "add-child" ? (
          <Button size="sm" variant="ghost">
            <Plus aria-hidden /> Subcategory
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden /> Add category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={category ? `Edit ${category.name}` : "New category"} className="max-w-2xl">
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor={`${prefix}-name`} error={errors.name?.message} required>
              <Input
                id={`${prefix}-name`}
                {...register("name", {
                  onChange: (e) => {
                    if (!category && !formState.dirtyFields.slug) setValue("slug", slugify(e.target.value));
                  },
                })}
                aria-invalid={!!errors.name}
              />
            </Field>
            <Field label="Slug" htmlFor={`${prefix}-slug`} error={errors.slug?.message} required help={category ? "Changing the slug adds a 301 redirect from the old URL." : undefined}>
              <Input id={`${prefix}-slug`} {...register("slug")} aria-invalid={!!errors.slug} />
            </Field>
            <Field label="Parent" htmlFor={`${prefix}-parent`} error={errors.parentId?.message}>
              <NativeSelect id={`${prefix}-parent`} {...register("parentId")}>
                <option value="">None (top-level group)</option>
                {parents
                  .filter((p) => p.id !== category?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <Field label="Sort order" htmlFor={`${prefix}-sort`} error={errors.sortOrder?.message}>
              <Input id={`${prefix}-sort`} type="number" min={0} {...register("sortOrder")} />
            </Field>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Icon</legend>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
                  {CATEGORY_ICON_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="radio"
                      aria-checked={field.value === name}
                      aria-label={name}
                      title={name}
                      onClick={() => field.onChange(field.value === name ? "" : name)}
                      className={cn("flex size-9 items-center justify-center rounded-md border transition-colors", field.value === name ? "border-primary bg-primary text-white" : "border-border hover:bg-muted")}
                    >
                      <CategoryIcon name={name} className="size-4" />
                    </button>
                  ))}
                </div>
              )}
            />
          </fieldset>

          <Field label="Image" htmlFor={`${prefix}-image`} error={errors.imageUrl?.message} help="Shown on category cards. 16:9, cropped automatically.">
            <Controller control={control} name="imageUrl" render={({ field }) => <ImageField id={`${prefix}-image`} label="Category image" value={field.value} onChange={field.onChange} crop={16 / 9} />} />
          </Field>

          <Field label="Intro text" htmlFor={`${prefix}-intro`} error={errors.intro?.message}>
            <Controller control={control} name="intro" render={({ field }) => <RichTextEditor id={`${prefix}-intro`} value={field.value ?? ""} onChange={(html) => field.onChange(html)} minHeight={120} />} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meta title" htmlFor={`${prefix}-mt`} error={errors.metaTitle?.message} counter={{ value: (watch("metaTitle") ?? "").length, max: 60 }}>
              <Input id={`${prefix}-mt`} {...register("metaTitle")} />
            </Field>
            <Field label="Meta description" htmlFor={`${prefix}-md`} error={errors.metaDescription?.message} counter={{ value: (watch("metaDescription") ?? "").length, max: 160 }}>
              <Input id={`${prefix}-md`} {...register("metaDescription")} />
            </Field>
          </div>

          {isParent && (
            <Controller
              control={control}
              name="featured"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm font-medium">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> Featured on the homepage pool
                </label>
              )}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              {category ? "Save changes" : "Create category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MergeCategoryDialog({ source, options }: { source: { id: string; name: string }; options: { id: string; name: string; group: string }[] }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={`Merge ${source.name}`} title="Merge into…">
          <GitMerge aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent title={`Merge “${source.name}”`} description="All listings move to the category you pick, then this category is deleted and its URL redirects.">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const res = await mergeCategories({ sourceId: source.id, targetId: target });
            setPending(false);
            if (!res.ok) return toast.error(res.message);
            toast.success(res.message);
            setOpen(false);
            router.refresh();
          }}
        >
          <Field label="Merge into" htmlFor={`merge-target-${source.id}`} required>
            <NativeSelect id={`merge-target-${source.id}`} value={target} onChange={(e) => setTarget(e.target.value)} required>
              <option value="">Choose a category</option>
              {options
                .filter((o) => o.id !== source.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.group ? `${o.group} › ` : ""}
                    {o.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={pending} disabled={!target}>
              Merge
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
