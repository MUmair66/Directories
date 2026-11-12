export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type HoursRow = {
  day: number; // 0 = Monday
  openTime: string | null; // "09:00" or "09:00:00"
  closeTime: string | null;
  isClosed: boolean;
  is24h: boolean;
  sequence: number;
};

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Day index (0 = Monday) and minutes since midnight in the given IANA time zone. */
export function localNow(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { day: weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * Open-now status in the business time zone. Handles split shifts, 24-hour days,
 * and ranges past midnight (e.g. 18:00–02:00 spills into the next day).
 */
export function openStatus(rows: HoursRow[], timeZone: string, now = new Date()): "open" | "closed" | "unknown" {
  if (rows.length === 0) return "unknown";
  const { day, minutes } = localNow(timeZone, now);
  const prevDay = (day + 6) % 7;

  for (const r of rows) {
    if (r.isClosed) continue;
    if (r.day === day && r.is24h) return "open";
    if (!r.openTime || !r.closeTime || r.is24h) continue;
    const open = toMinutes(r.openTime);
    const close = toMinutes(r.closeTime);
    if (r.day === day) {
      if (close > open && minutes >= open && minutes < close) return "open";
      if (close <= open && minutes >= open) return "open";
    }
    if (r.day === prevDay && close <= open && minutes < close) return "open";
  }
  return "closed";
}

export function formatTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const hour = h ?? 0;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** One display line per day: "9 AM – 5 PM, 6 PM – 10 PM" | "Open 24 hours" | "Closed". */
export function hoursByDay(rows: HoursRow[]) {
  return DAYS.map((name, day) => {
    const dayRows = rows.filter((r) => r.day === day).sort((a, b) => a.sequence - b.sequence);
    if (dayRows.length === 0) return { day, name, label: "Closed", closed: true };
    if (dayRows.some((r) => r.is24h)) return { day, name, label: "Open 24 hours", closed: false };
    if (dayRows.every((r) => r.isClosed)) return { day, name, label: "Closed", closed: true };
    const label = dayRows
      .filter((r) => !r.isClosed && r.openTime && r.closeTime)
      .map((r) => `${formatTime(r.openTime)} – ${formatTime(r.closeTime)}`)
      .join(", ");
    return { day, name, label: label || "Closed", closed: !label };
  });
}
