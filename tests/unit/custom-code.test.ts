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

describe("rich text sanitizer", async () => {
  const { sanitizeCustomCode } = await import("@/lib/sanitize");
  const { sanitizeHtml, stripHtml } = await import("@/lib/sanitize");
  it("keeps formatting, forces nofollow links, drops scripts and handlers", () => {
    const out = sanitizeHtml('<p onclick="x()">Hi <strong>there</strong> <a href="https://a.com">link</a> <a href="javascript:alert(1)">bad</a></p><script>alert(1)</script><img src="https://a.com/x.png" onerror="y()">');
    expect(out).toContain("<strong>there</strong>");
    expect(out).toContain('rel="nofollow noopener"');
    expect(out).toContain('src="https://a.com/x.png"');
    expect(out).not.toMatch(/onclick|onerror|<script|javascript:/i);
  });
  it("strips every tag for plain text", () => {
    expect(stripHtml("<b>Bold</b> & <i>it</i><script>bad()</script>")).toBe("Bold &amp; it");
  });
  it("keeps SVG and data images in custom code", () => {
    const out = sanitizeCustomCode('<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red"/></svg><img src="data:image/png;base64,AAA">');
    expect(out).toContain("<circle");
    expect(out).toContain('src="data:image/png;base64,AAA"');
  });
});
