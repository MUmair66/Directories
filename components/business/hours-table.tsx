"use client";
import { useSyncExternalStore } from "react";
import { hoursByDay, localNow, type HoursRow } from "@/lib/hours";
import { cn } from "@/lib/utils";
import { OpenStatus } from "@/components/listing/open-status";

const noopSubscribe = () => () => {};

/** Monday–Sunday table; today (in the business time zone) is highlighted after hydration. */
export function HoursTable({ hours, timezone }: { hours: HoursRow[]; timezone: string }) {
  // Server snapshot is null so cached HTML never bakes in a "today".
  const today = useSyncExternalStore(noopSubscribe, () => localNow(timezone).day, () => null);
  const rows = hoursByDay(hours);
  if (!hours.length) return <p className="text-muted-foreground">Hours not provided. Call ahead to confirm.</p>;
  return (
    <div className="grid gap-3">
      <OpenStatus hours={hours} timezone={timezone} className="text-sm" />
      <table className="w-full max-w-md text-sm">
        <caption className="sr-only">Business hours ({timezone.replace(/_/g, " ")})</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day} className={cn("border-b border-border last:border-0", today === r.day && "bg-secondary font-semibold")} aria-current={today === r.day ? "date" : undefined}>
              <th scope="row" className="py-2 pl-2 pr-4 text-left font-medium">
                {r.name}
                {today === r.day && <span className="sr-only"> (today)</span>}
              </th>
              <td className={cn("py-2 pr-2 text-right", r.closed && "text-danger")}>{r.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">Times shown in the business&apos;s local time zone ({timezone.replace(/_/g, " ")}).</p>
    </div>
  );
}
