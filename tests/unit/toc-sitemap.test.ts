import { describe, expect, it, vi } from "vitest";
import { withToc } from "@/lib/toc";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/lib/db", () => ({ db: {} }));

describe("withToc", () => {
  it("adds ids to headings and collects h2/h3 entries", () => {
    const { html, toc } = withToc("<h2>Getting Started</h2><p>x</p><h3>Step &amp; One</h3><h2>Getting Started</h2>");
    expect(toc).toEqual([
      { id: "getting-started", text: "Getting Started", level: 2 },
      { id: "step-and-one", text: "Step & One", level: 3 },
      { id: "getting-started-2", text: "Getting Started", level: 2 },
    ]);
    expect(html).toContain('<h2 id="getting-started">');
    expect(html).toContain('<h2 id="getting-started-2">');
  });
  it("keeps existing ids", () => {
    const { html, toc } = withToc('<h2 id="section-1">1. Terms</h2>', [2]);
    expect(toc).toEqual([{ id: "section-1", text: "1. Terms", level: 2 }]);
    expect(html).toBe('<h2 id="section-1">1. Terms</h2>');
  });
});

describe("sitemap ids", async () => {
  const { parseSitemapId, sitemapIds } = await import("@/lib/data/sitemap");
  it("splits large types into 45,000-URL files", () => {
    const ids = sitemapIds({ static: 1, categories: 1, states: 1, "top-pros": 1, blog: 1, landing: 1, cities: 10, "city-categories": 0, businesses: 100_000 });
    expect(ids).toContain("businesses-0");
    expect(ids).toContain("businesses-2");
    expect(ids).not.toContain("businesses-3");
    expect(ids).toContain("city-categories-0");
    expect(ids).toContain("landing-0");
  });
  it("parses ids and rejects unknown types", () => {
    expect(parseSitemapId("city-categories-3")).toEqual({ type: "city-categories", page: 3 });
    expect(parseSitemapId("nope-0")).toBeNull();
    expect(parseSitemapId("businesses")).toBeNull();
  });
});
