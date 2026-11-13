import { describe, expect, it } from "vitest";
import { formatTime, hoursByDay, localNow, openStatus, type HoursRow } from "@/lib/hours";

// Wednesday 2026-11-11. New York is UTC-5 (EST), Chicago UTC-6, Los Angeles UTC-8.
const at = (iso: string) => new Date(iso);
const WED_10AM_NY = at("2026-11-11T15:00:00Z");

const row = (day: number, openTime: string | null, closeTime: string | null, extra: Partial<HoursRow> = {}): HoursRow => ({
  day,
  openTime,
  closeTime,
  isClosed: false,
  is24h: false,
  sequence: 0,
  ...extra,
});

const WEEKDAYS_9_TO_5 = [0, 1, 2, 3, 4].map((d) => row(d, "09:00", "17:00"));

describe("localNow", () => {
  it("returns the Monday-based day index and minutes in the given zone", () => {
    expect(localNow("America/New_York", WED_10AM_NY)).toEqual({ day: 2, minutes: 600 });
    expect(localNow("America/Chicago", WED_10AM_NY)).toEqual({ day: 2, minutes: 540 });
    expect(localNow("America/Los_Angeles", WED_10AM_NY)).toEqual({ day: 2, minutes: 420 });
  });
});

describe("openStatus", () => {
  it("is open inside regular hours", () => {
    expect(openStatus(WEEKDAYS_9_TO_5, "America/New_York", WED_10AM_NY)).toBe("open");
  });

  it("uses the business time zone, not the server's", () => {
    // 7 AM in Los Angeles at the same instant
    expect(openStatus(WEEKDAYS_9_TO_5, "America/Los_Angeles", WED_10AM_NY)).toBe("closed");
  });

  it("treats the close time as exclusive", () => {
    expect(openStatus(WEEKDAYS_9_TO_5, "America/New_York", at("2026-11-11T22:00:00Z"))).toBe("closed"); // 5:00 PM
    expect(openStatus(WEEKDAYS_9_TO_5, "America/New_York", at("2026-11-11T21:59:00Z"))).toBe("open"); // 4:59 PM
  });

  it("handles split shifts", () => {
    const split = [row(2, "08:00", "09:30"), row(2, "11:00", "14:00", { sequence: 1 })];
    expect(openStatus(split, "America/New_York", WED_10AM_NY)).toBe("closed"); // 10:00, between shifts
    expect(openStatus(split, "America/New_York", at("2026-11-11T16:30:00Z"))).toBe("open"); // 11:30
    expect(openStatus(split, "America/New_York", at("2026-11-11T13:15:00Z"))).toBe("open"); // 8:15
  });

  it("handles ranges past midnight (spilling into the next day)", () => {
    const lateTuesday = [row(1, "18:00", "02:00")];
    expect(openStatus(lateTuesday, "America/New_York", at("2026-11-11T06:00:00Z"))).toBe("open"); // Wed 1:00 AM
    expect(openStatus(lateTuesday, "America/New_York", at("2026-11-11T08:00:00Z"))).toBe("closed"); // Wed 3:00 AM
    expect(openStatus(lateTuesday, "America/New_York", at("2026-11-11T00:00:00Z"))).toBe("open"); // Tue 7:00 PM
  });

  it("is open all day on 24-hour days", () => {
    expect(openStatus([row(2, null, null, { is24h: true })], "America/New_York", at("2026-11-11T08:00:00Z"))).toBe("open");
  });

  it("is closed on closed days", () => {
    expect(openStatus([row(2, "09:00", "17:00", { isClosed: true })], "America/New_York", WED_10AM_NY)).toBe("closed");
  });

  it("accepts HH:MM:SS from Postgres time columns", () => {
    expect(openStatus([row(2, "09:00:00", "17:00:00")], "America/New_York", WED_10AM_NY)).toBe("open");
  });

  it("is unknown without hours", () => {
    expect(openStatus([], "America/New_York", WED_10AM_NY)).toBe("unknown");
  });
});

describe("formatting", () => {
  it("formats times in 12-hour style", () => {
    expect(formatTime("09:00")).toBe("9 AM");
    expect(formatTime("13:30")).toBe("1:30 PM");
    expect(formatTime("00:00")).toBe("12 AM");
    expect(formatTime("12:00:00")).toBe("12 PM");
    expect(formatTime(null)).toBe("");
  });

  it("builds one label per day", () => {
    const days = hoursByDay([
      row(0, "09:00", "17:00"),
      row(1, "08:00", "12:00"),
      row(1, "13:00", "18:00", { sequence: 1 }),
      row(2, null, null, { is24h: true }),
      row(3, null, null, { isClosed: true }),
    ]);
    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ name: "Monday", label: "9 AM – 5 PM", closed: false });
    expect(days[1]!.label).toBe("8 AM – 12 PM, 1 PM – 6 PM");
    expect(days[2]!.label).toBe("Open 24 hours");
    expect(days[3]).toMatchObject({ label: "Closed", closed: true });
    expect(days[6]).toMatchObject({ name: "Sunday", label: "Closed", closed: true });
  });
});
