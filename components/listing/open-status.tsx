"use client";
import { useEffect, useState } from "react";
import { DAYS, formatTime, localNow, openStatus, type HoursRow } from "@/lib/hours";
import { cn } from "@/lib/utils";

/** Re-evaluates a time-dependent value every minute, only in the browser (cached HTML never bakes in "now"). */
function useLiveValue<T>(compute: () => T, deps: unknown[]): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    const update = () => setValue(compute());
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

/**
 * Live Open now / Closed badge computed in the browser (in the business time zone),
 * so cached HTML never shows a stale status.
 */
export function OpenStatus({ hours, timezone, className }: { hours: HoursRow[]; timezone: string; className?: string }) {
  const status = useLiveValue(() => openStatus(hours, timezone), [hours, timezone]);
  if (!status || status === "unknown") return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", status === "open" ? "text-success" : "text-danger", className)}>
      <span className={cn("size-2 rounded-full", status === "open" ? "bg-success" : "bg-danger")} aria-hidden />
      {status === "open" ? "Open now" : "Closed"}
    </span>
  );
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

type Detail = { open: boolean; text: string };

/** "until 5 PM" when open, "opens 9 AM tomorrow" when closed. */
export function describeHours(rows: HoursRow[], timeZone: string, now = new Date()): Detail | null {
  const status = openStatus(rows, timeZone, now);
  if (status === "unknown") return null;
  const { day, minutes } = localNow(timeZone, now);
  const active = rows.filter((r) => !r.isClosed);

  if (status === "open") {
    if (active.some((r) => r.day === day && r.is24h)) return { open: true, text: "24 hours" };
    for (const r of active) {
      if (!r.openTime || !r.closeTime) continue;
      const o = toMinutes(r.openTime);
      const c = toMinutes(r.closeTime);
      const inToday = r.day === day && ((c > o && minutes >= o && minutes < c) || (c <= o && minutes >= o));
      const fromYesterday = r.day === (day + 6) % 7 && c <= o && minutes < c;
      if (inToday || fromYesterday) return { open: true, text: `until ${formatTime(r.closeTime)}` };
    }
    return { open: true, text: "" };
  }

  for (let offset = 0; offset < 7; offset++) {
    const d = (day + offset) % 7;
    const opens = active
      .filter((r) => r.day === d && (r.is24h || r.openTime))
      .map((r) => (r.is24h ? 0 : toMinutes(r.openTime!)))
      .filter((m) => offset > 0 || m > minutes)
      .sort((a, b) => a - b);
    if (opens.length) {
      const m = opens[0]!;
      const time = formatTime(`${Math.floor(m / 60)}:${m % 60}`);
      const when = offset === 0 ? "" : offset === 1 ? " tomorrow" : ` ${DAYS[d]!.slice(0, 3)}`;
      return { open: false, text: `opens ${time}${when}` };
    }
  }
  return { open: false, text: "" };
}

/** "Open now · until 5 PM" / "Closed · opens 9 AM tomorrow". Client-only, refreshed every minute. */
export function OpenUntil({ hours, timezone, className, tone = "default" }: { hours: HoursRow[]; timezone: string; className?: string; tone?: "default" | "onDark" }) {
  const detail = useLiveValue(() => describeHours(hours, timezone), [hours, timezone]);
  if (!detail) return null;
  const onDark = tone === "onDark";
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1.5 text-sm", className)}>
      <span className={cn("font-semibold", detail.open ? (onDark ? "text-emerald-300" : "text-success") : onDark ? "text-red-300" : "text-danger")}>{detail.open ? "Open now" : "Closed"}</span>
      {detail.text && <span className={onDark ? "text-white/85" : "text-muted-foreground"}>· {detail.text}</span>}
    </span>
  );
}
