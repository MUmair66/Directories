"use client";
import { useEffect, useState } from "react";
import { openStatus, type HoursRow } from "@/lib/hours";
import { cn } from "@/lib/utils";

/**
 * Live Open now / Closed badge computed in the browser (in the business time zone),
 * so cached HTML never shows a stale status.
 */
export function OpenStatus({ hours, timezone, className }: { hours: HoursRow[]; timezone: string; className?: string }) {
  const [status, setStatus] = useState<ReturnType<typeof openStatus> | null>(null);
  useEffect(() => {
    const update = () => setStatus(openStatus(hours, timezone));
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [hours, timezone]);
  if (!status || status === "unknown") return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", status === "open" ? "text-success" : "text-danger", className)}>
      <span className={cn("size-2 rounded-full", status === "open" ? "bg-success" : "bg-danger")} aria-hidden />
      {status === "open" ? "Open now" : "Closed"}
    </span>
  );
}
