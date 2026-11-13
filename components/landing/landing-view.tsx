import Link from "next/link";
import { Check, Globe, MapPin, Phone, Star } from "lucide-react";
import type { LandingPageData } from "@/lib/data/landing";
import type { LandingSection, LandingTheme } from "@/lib/landing";
import { formatPhone, hostname, initials, telHref } from "@/lib/text";
import { BRAND_NAME } from "@/lib/site";
import { LpImage } from "./lp-image";
import { LandingLeadForm } from "./lead-form";
import { CodeFrame } from "./code-frame";

const RADIUS = { none: "0px", small: "8px", large: "20px" } as const;

/** Visual tokens for one landing page, as CSS variables (colors are validated hex values). */
function themeVars(t: LandingTheme): React.CSSProperties {
  return {
    "--lp-primary": t.primary,
    "--lp-accent": t.accent,
    "--lp-bg": t.background,
    "--lp-text": t.text,
    "--lp-radius": RADIUS[t.radius],
    "--lp-tint": `color-mix(in srgb, ${t.primary} 6%, ${t.background})`,
    backgroundColor: t.background,
    color: t.text,
  } as React.CSSProperties;
}

const card = "rounded-[var(--lp-radius)]";
const btnPrimary = `inline-flex h-12 items-center justify-center gap-2 px-6 text-base font-semibold text-white shadow-sm transition hover:brightness-110 ${card}`;

function sectionStyle(s: LandingSection, tinted: boolean): React.CSSProperties {
  return {
    backgroundColor: s.bgColor || (tinted ? "var(--lp-tint)" : undefined),
    color: s.textColor || undefined,
  };
}

function Heading({ s, center = true }: { s: LandingSection; center?: boolean }) {
  if (!s.title && !s.subtitle) return null;
  return (
    <div className={`mb-10 grid gap-3 ${center ? "mx-auto max-w-2xl text-center" : ""}`}>
      {s.title && <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h2>}
      {s.subtitle && <p className="text-pretty text-lg opacity-80">{s.subtitle}</p>}
    </div>
  );
}

function Prose({ html }: { html: string }) {
  if (!html) return null;
  // Sanitized server-side (lib/data/landing.ts) before it reaches this component.
  return <div className="prose-landing grid gap-4 text-lg leading-relaxed opacity-90 [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function LandingView({ page, preview = false }: { page: LandingPageData; preview?: boolean }) {
  const { content, business: b } = page;
  const sections = content.sections.filter((s) => s.enabled);
  const contactAnchor = sections.find((s) => s.type === "contact")?.anchor;
  const reviewsAnchor = sections.find((s) => s.type === "reviews")?.anchor;
  const ctaHref = contactAnchor ? `#${contactAnchor}` : b.phone ? telHref(b.phone) : `/biz/${b.slug}`;
  const nav = sections.filter((s) => s.navLabel);
  const place = [b.cityName, b.state?.code].filter(Boolean).join(", ");
  const rating = Number(b.avgRating);

  return (
    <div style={themeVars(content.theme)} className="min-h-dvh">
      <style>{"html{scroll-behavior:smooth}"}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-black/5 backdrop-blur" style={{ backgroundColor: `color-mix(in srgb, ${content.theme.background} 92%, transparent)` }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <a href={`#${sections[0]?.anchor ?? ""}`} className="flex min-w-0 items-center gap-3 font-bold">
            {b.logoUrl ? (
              <LpImage src={b.logoUrl} alt="" className={`size-9 object-cover ${card}`} />
            ) : (
              <span className={`grid size-9 shrink-0 place-items-center text-sm text-white ${card}`} style={{ backgroundColor: "var(--lp-primary)" }}>
                {initials(b.name)}
              </span>
            )}
            <span className="truncate">{b.name}</span>
          </a>
          <nav aria-label="Page sections" className="ml-auto hidden items-center gap-1 md:flex">
            {nav.map((s) => (
              <a key={s.id} href={`#${s.anchor}`} className="rounded-md px-3 py-2 text-sm font-medium opacity-80 hover:opacity-100">
                {s.navLabel}
              </a>
            ))}
          </nav>
          {b.phone ? (
            <a href={telHref(b.phone)} className={`ml-auto inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold text-white md:ml-2 ${card}`} style={{ backgroundColor: "var(--lp-primary)" }}>
              <Phone className="size-4" aria-hidden /> <span className="hidden sm:inline">{formatPhone(b.phone)}</span>
              <span className="sm:hidden">Call</span>
            </a>
          ) : (
            <a href={ctaHref} className={`ml-auto inline-flex h-10 items-center px-4 text-sm font-semibold text-white md:ml-2 ${card}`} style={{ backgroundColor: "var(--lp-primary)" }}>
              Contact
            </a>
          )}
        </div>
      </header>

      <main id="main">
        {sections.map((s, i) => {
          const tinted = i % 2 === 1;
          const common = { id: s.anchor, className: "scroll-mt-16", style: sectionStyle(s, tinted) };
          switch (s.type) {
            case "intro":
              return (
                <section key={s.id} {...common} style={{ color: s.textColor || "#fff", backgroundColor: s.bgColor || "var(--lp-primary)" }} className="relative isolate scroll-mt-16 overflow-hidden">
                  {s.imageUrl && <LpImage src={s.imageUrl} alt="" className="absolute inset-0 -z-20 size-full object-cover" />}
                  <div className="absolute inset-0 -z-10" style={{ backgroundColor: `rgba(0,0,0,${s.imageUrl ? content.theme.heroOverlay / 100 : 0})`, backgroundImage: s.imageUrl ? undefined : "linear-gradient(135deg, rgba(255,255,255,.12), rgba(0,0,0,.25))" }} />
                  <div className={`mx-auto grid max-w-6xl gap-6 px-4 py-24 sm:px-6 sm:py-32 ${s.layout === "centered" ? "justify-items-center text-center" : ""}`}>
                    {b.reviewCount > 0 && (
                      <a href={reviewsAnchor ? `#${reviewsAnchor}` : `/biz/${b.slug}#reviews`} className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
                        <Star className="size-4 fill-current" style={{ color: "var(--lp-accent)" }} aria-hidden /> {rating.toFixed(1)} from {b.reviewCount} reviews
                      </a>
                    )}
                    <h1 className="max-w-4xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">{s.title || b.name}</h1>
                    {s.subtitle && <p className="max-w-2xl text-pretty text-lg opacity-90 sm:text-xl">{s.subtitle}</p>}
                    <Prose html={s.body} />
                    <div className="flex flex-wrap gap-3">
                      {s.ctaLabel && (
                        <a href={ctaHref} className={btnPrimary} style={{ backgroundColor: "var(--lp-accent)" }}>
                          {s.ctaLabel}
                        </a>
                      )}
                      {b.phone && (
                        <a href={telHref(b.phone)} className={`inline-flex h-12 items-center gap-2 border border-white/40 bg-white/10 px-6 font-semibold backdrop-blur hover:bg-white/20 ${card}`}>
                          <Phone className="size-4" aria-hidden /> {formatPhone(b.phone)}
                        </a>
                      )}
                    </div>
                    {s.items.length > 0 && (
                      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
                        {s.items.filter((it) => it.title).map((it, k) => (
                          <li key={k} className="flex items-center gap-2">
                            <Check className="size-4" style={{ color: "var(--lp-accent)" }} aria-hidden /> {it.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              );

            case "services":
              return (
                <section key={s.id} {...common}>
                  <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                    <Heading s={s} />
                    <Prose html={s.body} />
                    <div className="mt-2 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {s.items.map((it, k) => (
                        <article key={k} className={`overflow-hidden border border-black/5 bg-white/70 shadow-sm ${card}`} style={{ color: "var(--lp-text)" }}>
                          {it.imageUrl && <LpImage src={it.imageUrl} alt={it.title} className="aspect-[16/10] w-full object-cover" />}
                          <div className="grid gap-2 p-6">
                            {!it.imageUrl && <span className="mb-1 block h-1.5 w-10 rounded-full" style={{ backgroundColor: "var(--lp-accent)" }} />}
                            <h3 className="text-xl font-semibold">{it.title}</h3>
                            {it.text && <p className="opacity-75">{it.text}</p>}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              );

            case "about":
            case "custom": {
              const img = s.imageUrl ? <LpImage src={s.imageUrl} alt={s.title} className={`aspect-[4/3] w-full object-cover shadow-lg ${card}`} /> : null;
              const centered = s.layout === "centered" || !img;
              return (
                <section key={s.id} {...common}>
                  <div className={`mx-auto max-w-6xl px-4 py-20 sm:px-6 ${centered ? "max-w-3xl text-center" : "grid items-center gap-12 lg:grid-cols-2"}`}>
                    {!centered && s.layout === "image-left" && img}
                    <div className="grid gap-5">
                      {s.title && <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h2>}
                      {s.subtitle && <p className="text-lg font-medium" style={{ color: s.textColor ? undefined : "var(--lp-primary)" }}>{s.subtitle}</p>}
                      <Prose html={s.body} />
                      {s.items.length > 0 && (
                        <ul className={`grid gap-3 ${centered ? "justify-items-center" : ""}`}>
                          {s.items.filter((it) => it.title).map((it, k) => (
                            <li key={k} className="flex gap-3 text-left">
                              <Check className="mt-1 size-5 shrink-0" style={{ color: "var(--lp-primary)" }} aria-hidden />
                              <span>
                                <strong className="font-semibold">{it.title}</strong>
                                {it.text && <span className="block opacity-75">{it.text}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {s.ctaLabel && (
                        <a href={ctaHref} className={`${btnPrimary} w-fit ${centered ? "mx-auto" : ""}`} style={{ backgroundColor: "var(--lp-primary)" }}>
                          {s.ctaLabel}
                        </a>
                      )}
                    </div>
                    {!centered && s.layout !== "image-left" && img}
                    {centered && img}
                  </div>
                </section>
              );
            }

            case "gallery":
              return (
                <section key={s.id} {...common}>
                  <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                    <Heading s={s} />
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                      {s.items.filter((it) => it.imageUrl).map((it, k) => (
                        <figure key={k} className={`group relative overflow-hidden ${card}`}>
                          <LpImage src={it.imageUrl} alt={it.title || `${b.name} photo ${k + 1}`} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" />
                          {it.title && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-sm font-medium text-white">{it.title}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  </div>
                </section>
              );

            case "reviews":
              return (
                <section key={s.id} {...common}>
                  <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                    <Heading s={s} />
                    {b.reviewCount > 0 ? (
                      <>
                        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-lg">
                          <span className="text-4xl font-extrabold">{rating.toFixed(1)}</span>
                          <StarRow value={rating} />
                          <span className="opacity-70">based on {b.reviewCount} reviews</span>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                          {b.reviews.map((r) => (
                            <figure key={r.id} className={`grid content-start gap-3 border border-black/5 bg-white/80 p-6 shadow-sm ${card}`} style={{ color: "var(--lp-text)" }}>
                              <StarRow value={r.rating} />
                              <blockquote className="line-clamp-6 opacity-85">“{r.body}”</blockquote>
                              <figcaption className="text-sm font-semibold">{r.user?.name ?? "Verified customer"}</figcaption>
                            </figure>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-center opacity-70">Be one of the first customers to leave a review.</p>
                    )}
                    <p className="mt-8 text-center">
                      <Link href={`/biz/${b.slug}#reviews`} className="font-semibold underline underline-offset-4" style={{ color: s.textColor ? undefined : "var(--lp-primary)" }}>
                        Read all reviews on {BRAND_NAME}
                      </Link>
                    </p>
                  </div>
                </section>
              );

            case "faq":
              return (
                <section key={s.id} {...common}>
                  <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
                    <Heading s={s} />
                    <div className="grid gap-3">
                      {s.items.filter((it) => it.title).map((it, k) => (
                        <details key={k} className={`group border border-black/10 bg-white/70 px-5 py-4 open:shadow-sm ${card}`} style={{ color: "var(--lp-text)" }}>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                            {it.title}
                            <span className="text-xl transition group-open:rotate-45" style={{ color: "var(--lp-primary)" }} aria-hidden>
                              +
                            </span>
                          </summary>
                          <p className="mt-3 opacity-80">{it.text}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                </section>
              );

            case "code": {
              if (!s.code?.trim()) return null;
              return (
                <section key={s.id} id={s.anchor} className="scroll-mt-16" style={{ backgroundColor: s.bgColor || undefined, color: s.textColor || undefined }}>
                  <div className={s.fullWidth ? "" : "mx-auto max-w-6xl px-4 py-16 sm:px-6"}>
                    {!s.fullWidth && <Heading s={s} />}
                    {s.codeMode === "sandbox" ? (
                      <CodeFrame code={s.code} title={s.title} background={s.bgColor} />
                    ) : (
                      // Sanitized in lib/data/landing.ts (scripts and event handlers removed).
                      <div className="lp-code" dangerouslySetInnerHTML={{ __html: s.code }} />
                    )}
                  </div>
                </section>
              );
            }

            case "contact":
              return (
                <section key={s.id} {...common}>
                  <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
                    <div className="grid content-start gap-5">
                      {s.title && <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h2>}
                      {s.subtitle && <p className="text-lg opacity-80">{s.subtitle}</p>}
                      <Prose html={s.body} />
                      <ul className="grid gap-4 text-lg">
                        {b.phone && (
                          <li className="flex items-center gap-3">
                            <Phone className="size-5" style={{ color: "var(--lp-primary)" }} aria-hidden />
                            <a href={telHref(b.phone)} className="font-semibold hover:underline">{formatPhone(b.phone)}</a>
                          </li>
                        )}
                        {!b.hideAddress && (b.address || place) && (
                          <li className="flex items-start gap-3">
                            <MapPin className="mt-1 size-5" style={{ color: "var(--lp-primary)" }} aria-hidden />
                            <span>{[b.address, place, b.zip].filter(Boolean).join(", ")}</span>
                          </li>
                        )}
                        {b.website && (
                          <li className="flex items-center gap-3">
                            <Globe className="size-5" style={{ color: "var(--lp-primary)" }} aria-hidden />
                            <a href={b.website} target="_blank" rel="noopener nofollow" className="hover:underline">{hostname(b.website)}</a>
                          </li>
                        )}
                      </ul>
                    </div>
                    <div className={`border border-black/5 bg-white p-6 shadow-lg sm:p-8 ${card}`} style={{ color: "#0f172a" }}>
                      <LandingLeadForm businessId={b.id} landingPageId={page.id} submitLabel={s.ctaLabel || "Send request"} disabled={preview} />
                    </div>
                  </div>
                </section>
              );
          }
        })}
      </main>

      <footer className="border-t border-black/5 px-4 py-8 text-center text-sm opacity-70">
        {b.name}
        {place ? ` · ${place}` : ""} ·{" "}
        <Link href={`/biz/${b.slug}`} className="underline underline-offset-4">
          View profile on {BRAND_NAME}
        </Link>
      </footer>
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className="size-5" style={{ color: "var(--lp-accent)", fill: n <= Math.round(value) ? "currentColor" : "transparent" }} aria-hidden />
      ))}
    </span>
  );
}
