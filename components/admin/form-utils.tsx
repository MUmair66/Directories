"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { uploadFile } from "@/components/forms/upload";
import { processContentImage } from "@/app/actions/admin/content";
import { Button } from "@/components/ui/button";

/** Submit handler for admin forms: calls the action, maps field errors, toasts, refreshes. */
export function useAdminSubmit<TIn extends FieldValues, TOut, R = unknown>(
  form: UseFormReturn<TIn, unknown, TOut>,
  act: (v: TOut) => Promise<ActionResult<R>>,
  onSuccess?: (res: ActionResult<R> & { ok: true }) => void,
) {
  const router = useRouter();
  return form.handleSubmit(async (values) => {
    const res = await act(values);
    if (!res.ok) {
      toast.error(res.message);
      for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as Path<TIn>, { message: m });
      return;
    }
    toast.success(res.message ?? "Saved");
    router.refresh();
    onSuccess?.(res);
  });
}

/** Image upload to R2 (scope "content") → WebP processing → public URL. */
export function ImageField({ id, value, onChange, crop, label }: { id: string; value: string | null | undefined; onChange: (url: string) => void; crop?: number; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<number | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={label} className="h-20 w-32 rounded-md border border-border object-cover" />
      ) : (
        <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed border-border bg-surface text-xs text-muted-foreground">No image</div>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            setBusy(0);
            const { key } = await uploadFile(file, { kind: "image", scope: "content", onProgress: setBusy });
            const res = await processContentImage({ key, crop });
            if (!res.ok || !res.data) throw new Error(res.ok ? "Processing failed" : res.message);
            onChange(res.data.url);
            toast.success("Image uploaded");
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setBusy(null);
          }
        }}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} loading={busy !== null}>
          <ImageUp aria-hidden /> {busy !== null ? `Uploading ${busy}%` : value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} aria-label={`Remove ${label}`}>
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
