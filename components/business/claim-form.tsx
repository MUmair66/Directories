"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { submitClaim } from "@/app/actions/claims";
import { ALLOWED_DOC_TYPES, MAX_DOC_BYTES, claimSchema } from "@/lib/validations/forms";
import { uploadFile } from "@/components/forms/upload";
import { Turnstile } from "@/components/forms/turnstile";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/primitives";

type Values = z.input<typeof claimSchema>;
type Doc = Values["documents"][number] & { progress?: number; uploading?: boolean; error?: string; localId: string };

const ACCEPT = ".jpg,.jpeg,.png,.bmp,.pdf,.doc,.docx";

export function ClaimForm({ businessId, defaults }: { businessId: string; defaults: { name: string; email: string; phone: string } }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<Values>({ resolver: zodResolver(claimSchema), defaultValues: { businessId, ...defaults, details: "", documents: [] } });
  const errors = form.formState.errors;
  const uploading = docs.some((d) => d.uploading);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const localId = crypto.randomUUID();
      if (!(ALLOWED_DOC_TYPES as readonly string[]).includes(file.type)) {
        toast.error(`${file.name}: upload a JPG, JPEG, PNG, BMP, PDF, DOC or DOCX file.`);
        continue;
      }
      if (file.size > MAX_DOC_BYTES) {
        toast.error(`${file.name} is larger than 10 MB.`);
        continue;
      }
      setDocs((d) => [...d, { localId, key: "", fileName: file.name, contentType: file.type as Doc["contentType"], size: file.size, uploading: true, progress: 0 }]);
      try {
        const res = await uploadFile(file, { kind: "document", scope: "claim", onProgress: (p) => setDocs((d) => d.map((x) => (x.localId === localId ? { ...x, progress: p } : x))) });
        setDocs((d) => d.map((x) => (x.localId === localId ? { ...x, key: res.key, uploading: false } : x)));
      } catch (e) {
        setDocs((d) => d.map((x) => (x.localId === localId ? { ...x, uploading: false, error: (e as Error).message } : x)));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const documents = docs.filter((d) => d.key && !d.error).map(({ key, fileName, contentType, size }) => ({ key, fileName, contentType, size }));
    const res = await submitClaim({ ...values, documents, turnstileToken: token });
    if (res.ok) setDone(true);
    else {
      toast.error(res.message);
      for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as keyof Values, { message: m });
      setResetKey((k) => k + 1);
    }
  });

  if (done) {
    return (
      <div className="grid justify-items-center gap-3 rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <h2 className="text-xl font-bold">Claim submitted</h2>
        <p className="max-w-md text-muted-foreground">Our team will review your documents within 1 to 2 business days. We&apos;ll email you as soon as there&apos;s an update.</p>
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 rounded-lg border border-border bg-card p-6 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" required error={errors.name?.message}>
          <Input id="c-name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
        </Field>
        <Field label="Phone" htmlFor="c-phone" required error={errors.phone?.message}>
          <Input id="c-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...form.register("phone")} />
        </Field>
      </div>
      <Field label="Email" htmlFor="c-email" required error={errors.email?.message}>
        <Input id="c-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
      </Field>
      <Field label="Details" htmlFor="c-details" help="Your role at the business and anything that helps us verify ownership." error={errors.details?.message}>
        <Textarea id="c-details" rows={4} {...form.register("details")} />
      </Field>

      <div className="grid gap-2">
        <p className="text-sm font-medium">
          Proof of ownership <span className="text-danger">*</span>
        </p>
        <p className="text-sm text-muted-foreground">Business license, utility bill, tax document or similar. JPG, JPEG, PNG, BMP, PDF, DOC or DOCX, up to 10 MB each. Files are stored privately.</p>
        <label htmlFor="claim-files" className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary hover:bg-secondary/50">
          <Upload className="size-6 text-primary" aria-hidden />
          <span className="text-sm font-semibold">Choose files or drag them here</span>
          <input
            ref={fileRef}
            id="claim-files"
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        {docs.length > 0 && (
          <ul className="grid gap-2">
            {docs.map((d) => (
              <li key={d.localId} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{d.fileName}</span>
                {d.uploading ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> {d.progress ?? 0}%
                  </span>
                ) : d.error ? (
                  <span className="text-danger">{d.error}</span>
                ) : (
                  <CheckCircle2 className="size-4 text-success" aria-label="Uploaded" />
                )}
                <button type="button" onClick={() => setDocs((all) => all.filter((x) => x.localId !== d.localId))} aria-label={`Remove ${d.fileName}`} className="rounded p-1 hover:bg-muted">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {errors.documents && (
          <p className="text-sm text-danger" role="alert">
            {errors.documents.message ?? "Upload at least one document"}
          </p>
        )}
      </div>

      <Turnstile onToken={setToken} resetKey={resetKey} />
      <Button
        type="submit"
        size="lg"
        loading={form.formState.isSubmitting}
        disabled={uploading}
        onClick={() => form.setValue("documents", docs.filter((d) => d.key && !d.error).map(({ key, fileName, contentType, size }) => ({ key, fileName, contentType, size })))}
      >
        {uploading ? "Uploading…" : "Submit claim"}
      </Button>
    </form>
  );
}
