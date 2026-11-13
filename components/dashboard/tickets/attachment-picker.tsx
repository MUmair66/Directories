"use client";
import { useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/components/forms/upload";
import { ALLOWED_DOC_TYPES } from "@/lib/validations/forms";
import { Button } from "@/components/ui/button";

export type Attachment = { key: string; fileName: string; contentType: string; size: number };

/** Uploads ticket attachments to the private bucket (max 5 files, 10 MB each). */
export function AttachmentPicker({ value, onChange, max = 5 }: { value: Attachment[]; onChange: (v: Attachment[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  const add = async (files: FileList) => {
    const list = Array.from(files).slice(0, max - value.length);
    let next = [...value];
    for (const f of list) {
      if (!(ALLOWED_DOC_TYPES as readonly string[]).includes(f.type)) {
        toast.error(`${f.name}: use JPG, PNG, BMP, PDF, DOC or DOCX.`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 10 MB.`);
        continue;
      }
      setBusy((b) => b + 1);
      try {
        const up = await uploadFile(f, { kind: "document", scope: "ticket" });
        next = [...next, up];
        onChange(next);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };

  return (
    <div className="grid gap-2">
      <input ref={input} type="file" multiple accept=".jpg,.jpeg,.png,.bmp,.pdf,.doc,.docx" className="sr-only" aria-label="Attach files" onChange={(e) => e.target.files && add(e.target.files)} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={value.length >= max || busy > 0}>
          {busy > 0 ? <Loader2 className="animate-spin" /> : <Paperclip />} Attach files
        </Button>
        <span className="text-xs text-muted-foreground">Up to {max} files, 10 MB each.</span>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((a) => (
            <li key={a.key} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface py-1 pl-2 pr-1 text-sm">
              <Paperclip className="size-3.5" aria-hidden /> <span className="max-w-48 truncate">{a.fileName}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x.key !== a.key))} className="rounded p-0.5 hover:bg-muted" aria-label={`Remove ${a.fileName}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
