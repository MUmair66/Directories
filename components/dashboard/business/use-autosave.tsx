"use client";
import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Wizard autosave: 3 seconds after the last change, if the form is dirty and valid,
 * saves silently and marks the form clean. Returns a status label for the UI.
 */
export function useAutosave<T extends FieldValues>(form: UseFormReturn<T>, save: (values: T) => Promise<boolean>, enabled: boolean, delay = 3000) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const inflight = useRef(false);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = form.watch(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (inflight.current || !form.formState.isDirty) return;
        const valid = await form.trigger(undefined, { shouldFocus: false });
        if (!valid) {
          form.clearErrors();
          return;
        }
        inflight.current = true;
        setStatus("saving");
        const values = form.getValues();
        const ok = await saveRef.current(values).catch(() => false);
        inflight.current = false;
        setStatus(ok ? "saved" : "error");
        if (ok) form.reset(values, { keepValues: true });
      }, delay);
    });
    return () => {
      clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [form, enabled, delay]);

  return status;
}

export function AutosaveStatus({ status }: { status: ReturnType<typeof useAutosave> }) {
  if (status === "idle") return null;
  const text = { saving: "Saving draft…", saved: "Draft saved", error: "Couldn't autosave. Use Save and continue." }[status];
  return (
    <p className={status === "error" ? "text-sm text-danger" : "text-sm text-muted-foreground"} role="status" aria-live="polite">
      {text}
    </p>
  );
}

/** (312) 555-0199 mask while typing. */
export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
