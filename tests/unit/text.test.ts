import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  excerpt,
  formatPhone,
  hostname,
  initials,
  pluralize,
  readMinutes,
  slugify,
  telHref,
  videoEmbedUrl,
  wordCount,
} from "@/lib/text";

describe("slugify", () => {
  it("lowercases, hyphenates and expands ampersands", () => {
    expect(slugify("Joe's Plumbing & Heating")).toBe("joes-plumbing-and-heating");
  });
  it("strips accents", () => {
    expect(slugify("Café Déjà Vu")).toBe("cafe-deja-vu");
  });
  it("trims leading/trailing separators", () => {
    expect(slugify("  --Hello, World!--  ")).toBe("hello-world");
  });
  it("respects maxLength without a trailing hyphen", () => {
    const s = slugify("alpha beta gamma delta", 11);
    expect(s).toBe("alpha-beta");
    expect(s.endsWith("-")).toBe(false);
  });
  it("handles curly apostrophes and parentheses", () => {
    expect(slugify("Internet Service Providers (ISPs)")).toBe("internet-service-providers-isps");
    expect(slugify("Hank’s Handyman")).toBe("hanks-handyman");
  });
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("Tom &amp; Jerry &#39;s &lt;b&gt;")).toBe("Tom & Jerry 's <b>");
  });
  it("decodes double-encoded entities", () => {
    expect(decodeEntities("Tom &amp;amp; Jerry")).toBe("Tom & Jerry");
  });
  it("returns an empty string for null/undefined", () => {
    expect(decodeEntities(null)).toBe("");
    expect(decodeEntities(undefined)).toBe("");
  });
});

describe("excerpt", () => {
  it("strips tags, decodes entities and collapses whitespace", () => {
    expect(excerpt("<p>Hello <b>world</b></p>\n<p>Fast &amp; friendly</p>")).toBe("Hello world Fast & friendly");
  });
  it("truncates on a word boundary with an ellipsis", () => {
    const text = "word ".repeat(100);
    const out = excerpt(text, 50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out).not.toMatch(/\s…$/);
  });
  it("returns short text unchanged", () => {
    expect(excerpt("Short", 160)).toBe("Short");
    expect(excerpt(null)).toBe("");
  });
});

describe("initials", () => {
  it("uses the first letters of the first two words", () => {
    expect(initials("Blue Line Plumbing")).toBe("BL");
  });
  it("uses two letters for a single word", () => {
    expect(initials("Acme")).toBe("AC");
  });
  it("ignores punctuation and entities", () => {
    expect(initials("&amp; Co")).toBe("CO");
  });
  it("falls back to ?", () => {
    expect(initials("")).toBe("?");
  });
});

describe("phones", () => {
  it("formats 10 and 11 digit US numbers", () => {
    expect(formatPhone("3125550199")).toBe("(312) 555-0199");
    expect(formatPhone("+1 312-555-0199")).toBe("(312) 555-0199");
  });
  it("leaves other input alone", () => {
    expect(formatPhone("123")).toBe("123");
    expect(formatPhone(null)).toBe("");
  });
  it("builds E.164 tel links", () => {
    expect(telHref("(312) 555-0199")).toBe("tel:+13125550199");
  });
});

describe("videoEmbedUrl", () => {
  it("supports YouTube watch, short and youtu.be links", () => {
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
  it("supports Vimeo", () => {
    expect(videoEmbedUrl("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
  });
  it("rejects other hosts", () => {
    expect(videoEmbedUrl("https://example.com/video.mp4")).toBeNull();
    expect(videoEmbedUrl(null)).toBeNull();
  });
});

describe("misc", () => {
  it("hostname strips www", () => {
    expect(hostname("https://www.example.com/path")).toBe("example.com");
    expect(hostname("not a url")).toBe("not a url");
  });
  it("counts words in rich text", () => {
    expect(wordCount("<p>one two</p> three")).toBe(3);
    expect(wordCount("")).toBe(0);
    expect(readMinutes("<p>hi</p>")).toBe(1);
    expect(readMinutes("w ".repeat(900))).toBe(4);
  });
  it("pluralizes with thousands separators", () => {
    expect(pluralize(1, "listing")).toBe("1 listing");
    expect(pluralize(1200, "listing")).toBe("1,200 listings");
  });
});
