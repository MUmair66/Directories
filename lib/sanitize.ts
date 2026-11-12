import "server-only";
import DOMPurify from "isomorphic-dompurify";

/** Sanitizes rich text on save (descriptions, blog, tickets, CMS). */
export function sanitizeHtml(html: string | null | undefined) {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "code", "pre", "hr", "img", "table", "thead", "tbody", "tr", "th", "td"],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "id"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
  }).replace(/<a /g, '<a rel="nofollow noopener" ');
}

/** Plain text only (strip every tag). */
export function stripHtml(html: string | null | undefined) {
  return DOMPurify.sanitize(html ?? "", { ALLOWED_TAGS: [] });
}
