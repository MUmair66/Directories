"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, FileUp, Mail, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { confirmVerification, startVerification, submitVerificationDocument } from "@/app/actions/dashboard/verification";
import { uploadFile } from "@/components/forms/upload";
import { ALLOWED_DOC_TYPES } from "@/lib/validations/forms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Input } from "@/components/ui/primitives";

type Stage = { name: "choose" } | { name: "code"; verificationId: string; sentTo: string; method: "sms" | "email" } | { name: "document" } | { name: "done"; message: string };

/**
 * Verify flow: SMS code to the listing phone, email code to the listing email, or document upload.
 * Every async step has a bounded state (no endless spinners): requests time out into an error message.
 */
export function VerifyDialog({ open, onOpenChange, business }: { open: boolean; onOpenChange: (v: boolean) => void; business: { id: string; name: string; phone: string | null; email: string | null } }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "choose" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const withTimeout = <T,>(p: Promise<T>, ms = 20000) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("This is taking too long. Please try again.")), ms))]);

  const send = (method: "sms" | "email") =>
    start(async () => {
      setError(null);
      try {
        const res = await withTimeout(startVerification({ businessId: business.id, method }));
        if (!res.ok || !res.data) return setError(res.ok ? "Couldn't send the code." : res.message);
        setStage({ name: "code", verificationId: res.data.verificationId, sentTo: res.data.sentTo, method });
        setCooldown(res.data.resendIn);
        setCode("");
      } catch (e) {
        setError((e as Error).message);
      }
    });

  const confirm = () =>
    start(async () => {
      if (stage.name !== "code") return;
      setError(null);
      try {
        const res = await withTimeout(confirmVerification({ verificationId: stage.verificationId, code }));
        if (!res.ok) return setError(res.message);
        setStage({ name: "done", message: res.message ?? "Verified!" });
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  const submitDoc = () =>
    start(async () => {
      if (!file) return setError("Choose a file to upload.");
      setError(null);
      try {
        const doc = await withTimeout(uploadFile(file, { kind: "document", scope: "verification" }), 60000);
        const res = await withTimeout(submitVerificationDocument({ businessId: business.id, document: { ...doc, contentType: doc.contentType as (typeof ALLOWED_DOC_TYPES)[number] } }));
        if (!res.ok) return setError(res.message);
        setStage({ name: "done", message: res.message ?? "Document submitted" });
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });


  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setStage({ name: "choose" });
          setCode("");
          setError(null);
          setFile(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent title={`Verify ${business.name}`} description="Verified listings get a badge and rank higher in search.">
        {stage.name === "choose" && (
          <div className="grid gap-3">
            <Option icon={MessageSquareText} title="Text me a code" desc={business.phone ? `We'll text a 6-digit code to the listing phone.` : "Add a phone number to the listing first."} disabled={!business.phone || pending} onClick={() => send("sms")} />
            <Option icon={Mail} title="Email me a code" desc={business.email ? `We'll email a 6-digit code to the listing email.` : "Add an email address to the listing first."} disabled={!business.email || pending} onClick={() => send("email")} />
            <Option icon={FileUp} title="Upload a document" desc="Business license, utility bill or tax document. Reviewed by our team." disabled={pending} onClick={() => setStage({ name: "document" })} />
            {pending && <p className="text-sm text-muted-foreground" role="status">Sending code…</p>}
          </div>
        )}

        {stage.name === "code" && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <p className="text-sm">
              Enter the 6-digit code we sent to <strong>{stage.sentTo}</strong>. It expires in 10 minutes.
            </p>
            <label htmlFor="verify-code" className="sr-only">
              Verification code
            </label>
            <Input
              id="verify-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              aria-invalid={!!error}
              className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
              placeholder="••••••"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="link" size="sm" disabled={cooldown > 0 || pending} onClick={() => send(stage.method)}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStage({ name: "choose" })}>
                Use another method
              </Button>
            </div>
            <Button type="submit" loading={pending} disabled={code.length !== 6}>
              Verify
            </Button>
          </form>
        )}

        {stage.name === "document" && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">Upload a JPG, PNG, BMP, PDF, DOC or DOCX up to 10 MB that shows the business name and address.</p>
            <input
              ref={fileInput}
              type="file"
              accept=".jpg,.jpeg,.png,.bmp,.pdf,.doc,.docx"
              className="sr-only"
              aria-label="Verification document"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 10 * 1024 * 1024) {
                  setError("Files must be 10 MB or smaller.");
                  return;
                }
                setError(null);
                setFile(f);
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
              <FileUp /> {file ? file.name : "Choose file"}
            </Button>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStage({ name: "choose" })}>
                Back
              </Button>
              <Button type="button" onClick={submitDoc} loading={pending} disabled={!file}>
                Submit document
              </Button>
            </div>
          </div>
        )}

        {stage.name === "done" && (
          <div className="grid justify-items-center gap-3 py-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
              <BadgeCheck className="size-8" />
            </span>
            <p className="font-semibold">{stage.message}</p>
            <Button
              onClick={() => {
                onOpenChange(false);
                toast.success(stage.message);
              }}
            >
              Done
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Option({ icon: Icon, title, desc, disabled, onClick }: { icon: typeof Mail; title: string; desc: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}
