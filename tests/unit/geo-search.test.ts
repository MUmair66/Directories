import { describe, expect, it } from "vitest";
import { formatMiles, parseBBox } from "@/lib/geo";
import { parseSearchParams, toQueryString } from "@/lib/validations/search";

describe("parseBBox", () => {
  it("parses west,south,east,north", () => {
    expect(parseBBox("-88.1,41.6,-87.5,42.1")).toEqual({ west: -88.1, south: 41.6, east: -87.5, north: 42.1 });
  });
  it("rejects malformed or inverted boxes", () => {
    expect(parseBBox("a,b,c,d")).toBeNull();
    expect(parseBBox("-88,41,-87")).toBeNull();
    expect(parseBBox("-88,42,-87,41")).toBeNull();
    expect(parseBBox("-88,-95,-87,41")).toBeNull();
    expect(parseBBox(null)).toBeNull();
  });
});

describe("formatMiles", () => {
  it("formats distances", () => {
    expect(formatMiles(0.05)).toBe("< 0.1 mi");
    expect(formatMiles(3.14)).toBe("3.1 mi");
    expect(formatMiles(12.6)).toBe("13 mi");
    expect(formatMiles(null)).toBe("");
  });
});

describe("parseSearchParams", () => {
  it("parses valid filters", () => {
    const p = parseSearchParams({ q: " plumber ", page: "3", rating: "4", open_now: "1", verified: "true", sort: "rating", view: "map", posted: "7d" });
    expect(p).toMatchObject({ q: "plumber", page: 3, rating: 4, open_now: true, verified: true, sort: "rating", view: "map", posted: "7d" });
  });

  it("falls back to defaults for invalid values", () => {
    const p = parseSearchParams({ sort: "bogus", page: "-2", rating: "9", view: "table", posted: "1y", lat: "100" });
    expect(p.sort).toBeUndefined();
    expect(p.page).toBe(1);
    expect(p.rating).toBeUndefined();
    expect(p.view).toBe("grid");
    expect(p.posted).toBeUndefined();
    expect(p.lat).toBeUndefined();
    expect(p.open_now).toBe(false);
  });

  it("takes the first value of repeated params and caps the page", () => {
    const p = parseSearchParams({ q: ["roofers", "plumbers"], page: "9999" });
    expect(p.q).toBe("roofers");
    expect(p.page).toBe(500);
  });

  it("keeps coordinates in range", () => {
    const p = parseSearchParams({ lat: "41.88", lng: "-87.63" });
    expect(p.lat).toBeCloseTo(41.88);
    expect(p.lng).toBeCloseTo(-87.63);
  });
});

describe("toQueryString", () => {
  it("drops empty and default values", () => {
    expect(toQueryString({ q: "plumber", page: 1, view: "grid", open_now: true, rating: undefined, verified: false })).toBe("?q=plumber&open_now=1");
  });
  it("keeps non-default page and view", () => {
    expect(toQueryString({ page: 2, view: "map" })).toBe("?page=2&view=map");
  });
  it("returns an empty string with no filters", () => {
    expect(toQueryString({})).toBe("");
  });
});
