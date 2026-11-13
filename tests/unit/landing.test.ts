import { describe, expect, it } from "vitest";
import { blankSection, defaultLandingContent, suggestLandingSlug } from "@/lib/landing";
import { landingContentSchema, landingSlug, saveLandingSchema } from "@/lib/validations/landing";

const biz = { name: "Westlake Pro Painters", categoryName: "Painting Services", cityName: "Westlake", stateCode: "OH", photoUrls: ["https://example.com/a.jpg"] };

describe("landing pages", () => {
  it("default content follows the shared structure and validates", () => {
    const c = defaultLandingContent(biz);
    expect(c.sections.map((s) => s.anchor)).toEqual(["Intro", "Services", "About", "Gallery", "Reviews", "FAQ", "Contact"]);
    expect(c.sections[0]!.title).toBe("Best Painting Services in Westlake, OH");
    expect(landingContentSchema.safeParse(c).success).toBe(true);
  });

  it("suggests slugs like 11538-best-painting-services-westlake-oh", () => {
    expect(suggestLandingSlug(biz, 11538)).toBe("11538-best-painting-services-westlake-oh");
  });

  it("rejects reserved, uppercase-invalid and malformed slugs", () => {
    expect(landingSlug.safeParse("admin").success).toBe(false);
    expect(landingSlug.safeParse("search").success).toBe(false);
    expect(landingSlug.safeParse("bad slug!").success).toBe(false);
    expect(landingSlug.parse("11538-Best-Painting")).toBe("11538-best-painting");
  });

  it("rejects duplicate anchors and bad colors", () => {
    const c = defaultLandingContent(biz);
    c.sections.push(blankSection("custom", { anchor: "intro" }));
    const r = landingContentSchema.safeParse(c);
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path.join(".") === "sections.7.anchor")).toBe(true);

    const bad = defaultLandingContent(biz);
    bad.theme.primary = "red";
    expect(landingContentSchema.safeParse(bad).success).toBe(false);
  });

  it("validates a full save payload", () => {
    const r = saveLandingSchema.safeParse({
      id: "0194f3c2-7d55-7c3a-9a3e-2f6b1f6b3c11",
      businessId: "0194f3c2-7d55-7c3a-9a3e-2f6b1f6b3c12",
      title: "Best Painting Services in Westlake, OH",
      slug: "11538-best-painting-services-westlake-oh",
      status: "published",
      seoTitle: "",
      seoDescription: "",
      content: defaultLandingContent(biz),
    });
    expect(r.success).toBe(true);
  });
});
