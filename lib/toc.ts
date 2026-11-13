import { decodeEntities, slugify } from "@/lib/text";

export type TocItem = { id: string; text: string; level: 2 | 3 };

/**
 * Builds a table of contents from h2/h3 tags and makes sure every heading has an id.
 * Returns the (possibly modified) HTML and the TOC entries.
 */
export function withToc(html: string, levels: (2 | 3)[] = [2, 3]): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, lvl: string, attrs: string, inner: string) => {
    const level = Number(lvl) as 2 | 3;
    const text = decodeEntities(inner.replace(/<[^>]*>/g, "")).trim();
    if (!text) return match;
    const existing = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
    let id = existing ?? (slugify(text, 60) || `section-${toc.length + 1}`);
    if (!existing) {
      let n = 2;
      const base = id;
      while (used.has(id)) id = `${base}-${n++}`;
    }
    used.add(id);
    if (levels.includes(level)) toc.push({ id, text, level });
    return existing ? match : `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
}
