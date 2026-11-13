"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

type Result<T> = { ok: true; message?: string; data?: T } | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Shows the action's message as a toast and maps field errors onto a react-hook-form instance. */
export function handleResult<T, F extends FieldValues = FieldValues>(res: Result<T>, opts: { setError?: UseFormSetError<F>; success?: string | false } = {}) {
  if (res.ok) {
    if (opts.success !== false) toast.success(opts.success ?? res.message ?? "Saved");
  } else {
    toast.error(res.message);
    if (opts.setError && res.fieldErrors) {
      for (const [field, message] of Object.entries(res.fieldErrors)) opts.setError(field as Path<F>, { message });
    }
  }
  return res;
}

/**
 * Light polling so new reviews, leads and ticket replies show up within a minute.
 * Refreshes server components every `interval` ms while the tab is visible.
 */
export function AutoRefresh({ interval = 30_000 }: { interval?: number }) {
  const router = useRouter();
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      stop();
      t = setInterval(() => router.refresh(), interval);
    };
    const stop = () => t && clearInterval(t);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else stop();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [interval, router]);
  return null;
}

/** Warns before leaving the page with unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-US", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

export function LocalDate({ value, withTime }: { value: string | Date | null | undefined; withTime?: boolean }) {
  return <time dateTime={value ? new Date(value).toISOString() : undefined} suppressHydrationWarning>{formatDate(value, withTime)}</time>;
}
