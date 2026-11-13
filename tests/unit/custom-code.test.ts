import { describe, expect, it, vi } from "vitest";
import { blankSection, defaultLandingContent } from "@/lib/landing";
import { landingContentSchema } from "@/lib/validations/landing";

vi.mock("server-only", () => ({}));

describe("custom code sections", async () => {
  const { sanitizeCustomCode } = await import("@/lib/sanitize");

  it("keeps HTML, CSS, classes, inline styles and https embeds", () => {
    const out = sanitizeCustomCode('<style>.promo{color:red}</style><div class="promo" style="padding:8px">Hi</div><iframe src="https://www.youtube.com/embed/x" allowfullscreen></iframe>');
    expect(out).toContain("<style>.promo{color:red}</style>");
    expect(out).toContain('class="promo"');
    expect(out).toContain('style="padding:8px"');
    expect(out).toContain('src="https://www.youtube.com/embed/x"');
  });

  it("removes scripts, event handlers and javascript: URLs", () => {
    const out = sanitizeCustomCode('<div onclick="alert(1)">x</div><script>alert(2)</script><a href="javascript:alert(3)">y</a><img src=x onerror="alert(4)">');
    expect(out).not.toMatch(/onclick|onerror|<script|javascript:/i);
  });

  it("validates a page with a code section", () => {
    const c = defaultLandingContent({ name: "Acme" });
    c.sections.push(blankSection("code", { codeMode: "sandbox", code: "<script>console.log(1)</script>" }));
    expect(c.sections.at(-1)!.anchor).toMatch(/^Code-/);
    expect(landingContentSchema.safeParse(c).success).toBe(true);
  });
});
