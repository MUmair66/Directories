"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/overlays";
import { Field, Textarea } from "@/components/ui/primitives";

type Act<I> = (input: I) => Promise<ActionResult<unknown>>;

/**
 * Runs an admin Server Action from a button, with optional confirm dialog
 * (destructive actions) or a "reason" dialog (reject, ban, request changes).
 */
export function ActionButton<I extends object>({
  action,
  input,
  children,
  confirm,
  reason,
  onDone,
  ...button
}: {
  action: Act<I>;
  /** Action input. With `reason`, the reason field is collected in the dialog. */
  input: Omit<I, "reason"> & Partial<I>;
  children: React.ReactNode;
  confirm?: { title: string; description: string; confirmLabel?: string; destructive?: boolean };
  reason?: { title: string; label?: string; placeholder?: string; confirmLabel?: string; destructive?: boolean; field?: string };
  onDone?: (res: ActionResult<unknown>) => void;
} & Omit<ButtonProps, "onClick" | "children">) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();

  const run = (payload: I) =>
    new Promise<void>((resolve) =>
      start(async () => {
        const res = await action(payload);
        if (res.ok) {
          if (res.message) toast.success(res.message);
          setOpen(false);
          setText("");
          router.refresh();
        } else {
          const fieldMsg = reason ? res.fieldErrors?.[reason.field ?? "reason"] : undefined;
          if (fieldMsg) setError(fieldMsg);
          toast.error(res.message);
        }
        onDone?.(res);
        resolve();
      }),
    );

  if (confirm) {
    return (
      <ConfirmDialog
        trigger={
          <Button {...button} loading={pending}>
            {children}
          </Button>
        }
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        destructive={confirm.destructive ?? true}
        onConfirm={() => run(input as I)}
      />
    );
  }

  if (reason) {
    const id = `reason-${Math.abs(hash(reason.title))}`;
    return (
      <>
        <Button {...button} loading={pending} onClick={() => setOpen(true)}>
          {children}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent title={reason.title}>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(undefined);
                void run({ ...input, [reason.field ?? "reason"]: text } as I);
              }}
            >
              <Field label={reason.label ?? "Reason"} htmlFor={id} error={error} required>
                <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder={reason.placeholder} rows={4} required minLength={5} aria-invalid={!!error} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant={reason.destructive ? "destructive" : "default"} loading={pending}>
                  {reason.confirmLabel ?? "Confirm"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button {...button} loading={pending} onClick={() => run(input as I)}>
      {children}
    </Button>
  );
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}
