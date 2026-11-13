import "server-only";
import sanitize from "sanitize-html";

/*
 * HTML sanitizing with sanitize-html (pure JavaScript parser, no jsdom), so it runs the same
 * on any Node runtime, including Vercel functions.
 */

/** Sanitizes rich text on save (descriptions, blog, tickets, CMS). */
export function sanitizeHtml(html: string | null | undefined) {
  if (!html) return "";
  return sanitize(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "code", "pre", "hr", "img", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { "*": ["href", "target", "rel", "src", "alt", "title", "id"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: { a: sanitize.simpleTransform("a", { rel: "nofollow noopener" }, true) },
  });
}

/** Tags allowed in admin "Custom code" sections (everything except scripts and document-level tags). */
const CODE_TAGS = [
  ...sanitize.defaults.allowedTags,
  "style", "iframe", "img", "picture", "source", "video", "audio", "track", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "section", "header", "footer", "main", "article", "aside", "nav",
  "button", "form", "input", "label", "select", "option", "textarea", "fieldset", "legend", "details", "summary",
  "small", "mark", "sup", "sub", "del", "ins", "center", "font",
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "text", "tspan", "defs", "lineargradient", "radialgradient", "stop", "use", "symbol", "clippath", "mask",
];

const CODE_ATTRS = [
  "class", "style", "id", "title", "lang", "dir", "role", "tabindex", "aria-*", "data-*",
  "href", "target", "rel", "src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding",
  "allow", "allowfullscreen", "frameborder", "referrerpolicy", "scrolling",
  "controls", "autoplay", "muted", "loop", "playsinline", "poster", "type", "media",
  "name", "value", "placeholder", "for", "method", "action", "min", "max", "step", "required", "checked", "selected", "disabled", "open",
  "colspan", "rowspan", "align", "valign", "color", "size", "face",
  "viewbox", "xmlns", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "points", "transform", "offset", "stop-color", "opacity", "fill-rule", "clip-rule", "gradientunits",
];

/**
 * Admin "Custom code" sections rendered inline in a landing page: any HTML + <style> CSS, classes,
 * inline styles and https iframes (YouTube, Maps…). Scripts and on* event handlers are removed
 * (they're not in the attribute allow-list); code that needs JavaScript uses the sandboxed-iframe mode.
 */
export function sanitizeCustomCode(html: string | null | undefined) {
  if (!html) return "";
  return sanitize(html, {
    allowedTags: CODE_TAGS,
    allowedAttributes: { "*": CODE_ATTRS },
    allowVulnerableTags: true, // <style> is intended here; scripts stay blocked.
    nonTextTags: ["script", "noscript"],
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"], source: ["http", "https", "data"] },
    allowProtocolRelative: false,
    parseStyleAttributes: false,
  });
}

/** Plain text only (strip every tag). */
export function stripHtml(html: string | null | undefined) {
  return sanitize(html ?? "", { allowedTags: [], allowedAttributes: {} });
}
