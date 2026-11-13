import { decode } from "he";

/** Lowercase, hyphenated, ASCII-only slug. "Joe's Plumbing & Heating" -> "joes-plumbing-and-heating". */
export function slugify(input: string, maxLength = 80) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

/** Decodes HTML entities (handles double-encoded "&amp;amp;"). */
export function decodeEntities(input: string | null | undefined) {
  if (!input) return "";
  let out = input;
  for (let i = 0; i < 3; i++) {
    const next = decode(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Plain-text excerpt from rich text: strips tags, decodes entities, collapses whitespace. */
export function excerpt(html: string | null | undefined, maxChars = 160) {
  const text = decodeEntities((html ?? "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > maxChars * 0.6 ? lastSpace : maxChars).trimEnd()}…`;
}

export function wordCount(html: string | null | undefined) {
  const text = (html ?? "").replace(/<[^>]*>/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

export function readMinutes(html: string) {
  return Math.max(1, Math.round(wordCount(html) / 225));
}

export function initials(name: string) {
  const parts = decodeEntities(name)
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** (312) 555-0199 */
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length !== 10) return phone;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export function telHref(phone: string) {
  const d = phone.replace(/\D/g, "");
  return `tel:+${d.length === 10 ? `1${d}` : d}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

export function hostname(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** YouTube / Vimeo URL -> embed URL, or null when unsupported. */
export function videoEmbedUrl(url: string | null | undefined) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
