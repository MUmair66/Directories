"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, ChevronDown, Copy, ExternalLink, Eye, EyeOff, GripVertical, Palette, Plus, Save, Search, Settings2, Trash2,
} from "lucide-react";
import { saveLandingPage, duplicateLandingPage } from "@/app/actions/admin/landing";
import { searchBusinessesForPicker } from "@/app/actions/admin/businesses";
import {
  blankItem, blankSection, SECTION_TYPES, sectionLabel, THEME_PRESETS,
  type LandingContent, type LandingItem, type LandingSection, type LandingSectionType, type LandingTheme,
} from "@/lib/landing";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { ImageField } from "@/components/admin/form-utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export type LandingEditorPage = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  seoTitle: string;
  seoDescription: string;
  businessId: string;
  businessName: string;
  businessApproved: boolean;
  content: LandingContent;
};

type Errors = Record<string, string>;

/** What each section type lets the admin edit. */
const CAPS: Record<LandingSectionType, { body?: boolean; image?: boolean; cta?: string; layout?: [string, string][]; items?: { label: string; title: string; text?: string; image?: boolean; add: string } }> = {
  intro: { body: true, image: true, cta: "Button text (scrolls to Contact)", layout: [["centered", "Centered"], ["image-left", "Left aligned"]], items: { label: "Trust badges", title: "Badge", add: "Add badge" } },
  services: { body: true, items: { label: "Service cards", title: "Service name", text: "Short description", image: true, add: "Add service" } },
  about: { body: true, image: true, cta: "Button text (optional)", layout: [["image-right", "Image right"], ["image-left", "Image left"], ["centered", "Centered"]], items: { label: "Highlights", title: "Highlight", text: "Detail (optional)", add: "Add highlight" } },
  gallery: { items: { label: "Photos", title: "Caption (optional)", image: true, add: "Add photo" } },
  reviews: {},
  faq: { items: { label: "Questions", title: "Question", text: "Answer", add: "Add question" } },
  contact: { body: true, cta: "Form button text" },
  custom: { body: true, image: true, cta: "Button text (optional, scrolls to Contact)", layout: [["image-right", "Image right"], ["image-left", "Image left"], ["centered", "Centered"]], items: { label: "Bullet points", title: "Point", text: "Detail (optional)", add: "Add point" } },
  code: {},
};

export function LandingEditor({ page, siteUrl }: { page: LandingEditorPage; siteUrl: string }) {
  const router = useRouter();
  const [state, setState] = useState(page);
  const [open, setOpen] = useState<string | null>(page.content.sections[0]?.id ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const [addType, setAddType] = useState<LandingSectionType>("custom");

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = (p: Partial<LandingEditorPage>) => {
    setState((s) => ({ ...s, ...p }));
    setDirty(true);
  };
  const setContent = (fn: (c: LandingContent) => LandingContent) => {
    setState((s) => ({ ...s, content: fn(s.content) }));
    setDirty(true);
  };
  const setSection = (id: string, p: Partial<LandingSection>) => setContent((c) => ({ ...c, sections: c.sections.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const setTheme = (p: Partial<LandingTheme>) => setContent((c) => ({ ...c, theme: { ...c.theme, ...p } }));
  const move = (i: number, d: -1 | 1) =>
    setContent((c) => {
      const next = [...c.sections];
      const [it] = next.splice(i, 1);
      next.splice(i + d, 0, it!);
      return { ...c, sections: next };
    });
  const remove = (id: string) => setContent((c) => ({ ...c, sections: c.sections.filter((x) => x.id !== id) }));
  const add = () => {
    const sec = blankSection(addType);
    const used = new Set(state.content.sections.map((x) => x.anchor.toLowerCase()));
    let anchor = sec.anchor;
    for (let n = 2; used.has(anchor.toLowerCase()); n++) anchor = `${sec.anchor}-${n}`;
    setContent((c) => ({ ...c, sections: [...c.sections, { ...sec, anchor }] }));
    setOpen(sec.id);
  };

  const save = (status?: "draft" | "published") =>
    startSave(async () => {
      const payload = { ...state, status: status ?? state.status };
      const res = await saveLandingPage(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        const first = Object.keys(res.fieldErrors ?? {})[0];
        const m = first?.match(/^content\.sections\.(\d+)\./);
        if (m) setOpen(state.content.sections[Number(m[1])]?.id ?? null);
        toast.error(res.message);
        return;
      }
      setErrors({});
      setDirty(false);
      if (status) setState((s) => ({ ...s, status }));
      toast.success(res.message ?? "Saved");
      router.refresh();
    });

  const liveUrl = `${siteUrl}/${state.slug}`;
  const errorCount = Object.keys(errors).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="grid min-w-0 content-start gap-6">
        {errorCount > 0 && (
          <div role="alert" className="rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
            <p className="font-semibold">Please fix {errorCount} field{errorCount > 1 ? "s" : ""}:</p>
            <ul className="mt-1 list-disc pl-5">
              {Object.entries(errors).slice(0, 6).map(([k, v]) => (
                <li key={k}>{describePath(k, state.content.sections)}: {v}</li>
              ))}
            </ul>
          </div>
        )}

        <Tabs defaultValue="sections">
          <TabsList>
            <TabsTrigger value="sections">
              <GripVertical aria-hidden className="size-4" /> Sections
            </TabsTrigger>
            <TabsTrigger value="design">
              <Palette aria-hidden className="size-4" /> Colors & style
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings2 aria-hidden className="size-4" /> Page & SEO
            </TabsTrigger>
          </TabsList>

          {/* ── Sections ─────────────────────────────────── */}
          <TabsContent value="sections" className="mt-4 grid gap-3">
            <p className="text-sm text-muted-foreground">
              Every landing page uses the same structure. Reorder, hide, edit or add sections. Each section has an anchor link, e.g.{" "}
              <code className="rounded bg-muted px-1">/{state.slug}#{state.content.sections[0]?.anchor ?? "Intro"}</code>
            </p>
            {state.content.sections.map((sec, i) => (
              <SectionCard
                key={sec.id}
                sec={sec}
                index={i}
                count={state.content.sections.length}
                open={open === sec.id}
                errors={errors}
                onToggleOpen={() => setOpen(open === sec.id ? null : sec.id)}
                onChange={(p) => setSection(sec.id, p)}
                onMove={(d) => move(i, d)}
                onRemove={() => {
                  if (confirm(`Delete the “${sec.title || sectionLabel(sec.type)}” section?`)) remove(sec.id);
                }}
              />
            ))}
            <Card>
              <CardContent className="flex flex-wrap items-end gap-3 p-4">
                <Field label="Add a section" htmlFor="lp-add" className="min-w-56 flex-1">
                  <NativeSelect id="lp-add" value={addType} onChange={(e) => setAddType(e.target.value as LandingSectionType)}>
                    {SECTION_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}: {t.description}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Button type="button" onClick={add}>
                  <Plus aria-hidden /> Add section
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Design ───────────────────────────────────── */}
          <TabsContent value="design" className="mt-4 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Color presets</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setTheme(p.theme)}
                    className={cn("flex items-center gap-3 rounded-lg border border-border p-3 text-left text-sm font-semibold hover:bg-muted", state.content.theme.primary === p.theme.primary && "ring-2 ring-primary")}
                  >
                    <span className="flex -space-x-1.5">
                      {[p.theme.primary, p.theme.accent, p.theme.background].map((c) => (
                        <span key={c} className="size-6 rounded-full border-2 border-card" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    {p.name}
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Custom colors</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <ColorField id="th-primary" label="Primary (header, buttons)" value={state.content.theme.primary} onChange={(v) => setTheme({ primary: v })} error={errors["content.theme.primary"]} />
                <ColorField id="th-accent" label="Accent (hero button, stars)" value={state.content.theme.accent} onChange={(v) => setTheme({ accent: v })} error={errors["content.theme.accent"]} />
                <ColorField id="th-bg" label="Page background" value={state.content.theme.background} onChange={(v) => setTheme({ background: v })} error={errors["content.theme.background"]} />
                <ColorField id="th-text" label="Text color" value={state.content.theme.text} onChange={(v) => setTheme({ text: v })} error={errors["content.theme.text"]} />
                <Field label={`Hero image darkness: ${state.content.theme.heroOverlay}%`} htmlFor="th-overlay">
                  <input id="th-overlay" type="range" min={0} max={90} step={5} value={state.content.theme.heroOverlay} onChange={(e) => setTheme({ heroOverlay: Number(e.target.value) })} className="w-full accent-primary" />
                </Field>
                <Field label="Corners" htmlFor="th-radius">
                  <NativeSelect id="th-radius" value={state.content.theme.radius} onChange={(e) => setTheme({ radius: e.target.value as LandingTheme["radius"] })}>
                    <option value="large">Rounded</option>
                    <option value="small">Slightly rounded</option>
                    <option value="none">Square</option>
                  </NativeSelect>
                </Field>
              </CardContent>
            </Card>
            <ThemeSample theme={state.content.theme} />
          </TabsContent>

          {/* ── Settings ─────────────────────────────────── */}
          <TabsContent value="settings" className="mt-4 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Page</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field label="Internal title" htmlFor="lp-title" required error={errors.title} help="Shown in the admin and owner dashboards.">
                  <Input id="lp-title" value={state.title} onChange={(e) => patch({ title: e.target.value })} />
                </Field>
                <Field label="URL slug" htmlFor="lp-slug" required error={errors.slug} help={`${siteUrl}/${state.slug || "…"}`}>
                  <Input id="lp-slug" value={state.slug} onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
                </Field>
                <p className="text-xs text-muted-foreground">Changing the slug of a published page automatically redirects the old URL to the new one.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Search engines</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field label="SEO title" htmlFor="lp-seo-title" error={errors.seoTitle} counter={{ value: state.seoTitle.length, max: 70 }}>
                  <Input id="lp-seo-title" value={state.seoTitle} maxLength={70} onChange={(e) => patch({ seoTitle: e.target.value })} />
                </Field>
                <Field label="Meta description" htmlFor="lp-seo-desc" error={errors.seoDescription} counter={{ value: state.seoDescription.length, max: 170 }}>
                  <Textarea id="lp-seo-desc" rows={3} value={state.seoDescription} maxLength={170} onChange={(e) => patch({ seoDescription: e.target.value })} />
                </Field>
              </CardContent>
            </Card>
            <BusinessSwitcher
              current={{ id: state.businessId, name: state.businessName }}
              error={errors.businessId}
              onPick={(b) => patch({ businessId: b.id, businessName: b.name, businessApproved: true })}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="grid content-start gap-4 xl:sticky xl:top-20">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Publish</CardTitle>
            <Badge tone={state.status === "published" ? "success" : "default"}>{state.status === "published" ? "Live" : "Draft"}</Badge>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1 rounded-md bg-muted p-3 text-xs">
              <span className="font-semibold text-muted-foreground">Page URL</span>
              <span className="break-all font-mono">{liveUrl}</span>
              <button
                type="button"
                className="flex w-fit items-center gap-1 font-semibold text-primary hover:underline"
                onClick={() => navigator.clipboard.writeText(liveUrl).then(() => toast.success("URL copied"))}
              >
                <Copy className="size-3" aria-hidden /> Copy URL
              </button>
            </div>
            {!page.businessApproved && <p className="text-xs text-amber-700 dark:text-amber-400">The business isn&apos;t approved yet; publish becomes possible after approval.</p>}
            <Button type="button" onClick={() => save()} loading={saving} variant={dirty ? "default" : "outline"}>
              <Save aria-hidden /> {dirty ? "Save changes" : "Saved"}
            </Button>
            {state.status === "published" ? (
              <Button type="button" variant="outline" onClick={() => save("draft")} disabled={saving}>
                <EyeOff aria-hidden /> Unpublish (back to draft)
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => save("published")} disabled={saving}>
                <Eye aria-hidden /> Save & publish
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/landing-pages/${page.id}/preview`} target="_blank">
                  <Eye aria-hidden /> Preview
                </Link>
              </Button>
              {state.status === "published" && page.status === "published" && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`/${page.slug}`} target="_blank" rel="noopener">
                    <ExternalLink aria-hidden /> View live
                  </a>
                </Button>
              )}
            </div>
            {dirty && <p className="text-xs text-muted-foreground">Preview shows the last saved version.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p className="font-semibold">{state.businessName}</p>
            <p className="text-muted-foreground">Phone, address, logo and reviews on the page come from this business&apos;s listing. Change it under Page & SEO.</p>
            <DuplicateButton id={page.id} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function describePath(path: string, sections: LandingSection[]) {
  const m = path.match(/^content\.sections\.(\d+)\.(.+)$/);
  if (!m) return path.replace(/^content\.theme\./, "Color: ");
  const sec = sections[Number(m[1])];
  return `${sec ? sec.title || sectionLabel(sec.type) : "Section"} → ${m[2]!.replace(/^items\.(\d+)\./, (_, n) => `item ${Number(n) + 1} `)}`;
}

function SectionCard({
  sec, index, count, open, errors, onToggleOpen, onChange, onMove, onRemove,
}: {
  sec: LandingSection; index: number; count: number; open: boolean; errors: Errors;
  onToggleOpen: () => void; onChange: (p: Partial<LandingSection>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const caps = CAPS[sec.type];
  const e = (f: string) => errors[`content.sections.${index}.${f}`];
  const hasError = Object.keys(errors).some((k) => k.startsWith(`content.sections.${index}.`));
  const pid = `sec-${sec.id}`;
  return (
    <Card className={cn(!sec.enabled && "opacity-70", hasError && "border-danger")}>
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-col">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="h-6">
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)} className="h-6">
            <ArrowDown aria-hidden />
          </Button>
        </div>
        <button type="button" onClick={onToggleOpen} aria-expanded={open} aria-controls={pid} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Badge tone="primary" className="shrink-0">{sectionLabel(sec.type)}</Badge>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{sec.title || "(no title)"}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground">#{sec.anchor}</span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 transition", open && "rotate-180")} aria-hidden />
        </button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={sec.enabled} onCheckedChange={(v) => onChange({ enabled: v })} aria-label={sec.enabled ? "Hide section" : "Show section"} />
          <span className="hidden sm:inline">{sec.enabled ? "Visible" : "Hidden"}</span>
        </label>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete section" onClick={onRemove}>
          <Trash2 className="text-danger" aria-hidden />
        </Button>
      </div>

      {open && (
        <CardContent id={pid} className="grid gap-4 border-t border-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Anchor (link after #)" htmlFor={`${pid}-anchor`} error={e("anchor")} help={`Links to …#${sec.anchor || "Anchor"}`}>
              <Input id={`${pid}-anchor`} value={sec.anchor} onChange={(ev) => onChange({ anchor: ev.target.value.replace(/[^A-Za-z0-9_-]/g, "") })} />
            </Field>
            <Field label="Menu label" htmlFor={`${pid}-nav`} error={e("navLabel")} help="Leave empty to keep it out of the top menu.">
              <Input id={`${pid}-nav`} value={sec.navLabel} onChange={(ev) => onChange({ navLabel: ev.target.value })} />
            </Field>
          </div>
          <Field label={sec.type === "intro" ? "Headline (H1)" : "Heading"} htmlFor={`${pid}-title`} error={e("title")}>
            <Input id={`${pid}-title`} value={sec.title} onChange={(ev) => onChange({ title: ev.target.value })} />
          </Field>
          <Field label="Sub-heading" htmlFor={`${pid}-sub`} error={e("subtitle")}>
            <Textarea id={`${pid}-sub`} rows={2} value={sec.subtitle} onChange={(ev) => onChange({ subtitle: ev.target.value })} />
          </Field>
          {caps.body && (
            <Field label="Text" htmlFor={`${pid}-body`} error={e("body")}>
              <RichTextEditor id={`${pid}-body`} value={sec.body} onChange={(h) => onChange({ body: h })} minHeight={sec.type === "about" || sec.type === "custom" ? 160 : 90} />
            </Field>
          )}
          {caps.image && <ImageInput id={`${pid}-img`} label={sec.type === "intro" ? "Background image" : "Image"} value={sec.imageUrl} onChange={(v) => onChange({ imageUrl: v })} error={e("imageUrl")} />}
          <div className="grid gap-4 sm:grid-cols-2">
            {caps.cta && (
              <Field label={caps.cta} htmlFor={`${pid}-cta`} error={e("ctaLabel")}>
                <Input id={`${pid}-cta`} value={sec.ctaLabel} onChange={(ev) => onChange({ ctaLabel: ev.target.value })} />
              </Field>
            )}
            {caps.layout && (
              <Field label="Layout" htmlFor={`${pid}-layout`}>
                <NativeSelect id={`${pid}-layout`} value={sec.layout} onChange={(ev) => onChange({ layout: ev.target.value as LandingSection["layout"] })}>
                  {caps.layout.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField id={`${pid}-bg`} label="Section background" value={sec.bgColor} onChange={(v) => onChange({ bgColor: v })} optional error={e("bgColor")} />
            <ColorField id={`${pid}-fg`} label="Section text color" value={sec.textColor} onChange={(v) => onChange({ textColor: v })} optional error={e("textColor")} />
          </div>
          {sec.type === "code" && <CodeEditor pid={pid} sec={sec} onChange={onChange} error={e("code")} />}
          {sec.type === "reviews" && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Shows the business&apos;s live star rating and its best recent reviews automatically.</p>}
          {sec.type === "contact" && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Shows the business phone, address and website plus a request form. Submissions arrive as leads in the owner&apos;s dashboard.</p>}
          {caps.items && <ItemsEditor id={pid} cfg={caps.items} items={sec.items} onChange={(items) => onChange({ items })} errors={errors} prefix={`content.sections.${index}.items`} />}
        </CardContent>
      )}
    </Card>
  );
}

function CodeEditor({ pid, sec, onChange, error }: { pid: string; sec: LandingSection; onChange: (p: Partial<LandingSection>) => void; error?: string }) {
  const mode = sec.codeMode ?? "html";
  const code = sec.code ?? "";
  return (
    <div className="grid gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code type" htmlFor={`${pid}-mode`}>
          <NativeSelect id={`${pid}-mode`} value={mode} onChange={(ev) => onChange({ codeMode: ev.target.value as "html" | "sandbox" })}>
            <option value="html">HTML & CSS (SEO-friendly)</option>
            <option value="sandbox">HTML + JavaScript (safe box)</option>
          </NativeSelect>
        </Field>
        <label className="flex items-center gap-3 self-end pb-2 text-sm">
          <Switch checked={!!sec.fullWidth} onCheckedChange={(v) => onChange({ fullWidth: v })} />
          Full width (no padding or heading)
        </label>
      </div>
      <Field label="Your code" htmlFor={`${pid}-code`} error={error} counter={{ value: code.length, max: 100_000 }}>
        <Textarea
          id={`${pid}-code`}
          value={code}
          onChange={(ev) => onChange({ code: ev.target.value })}
          rows={14}
          spellCheck={false}
          className="font-mono text-xs leading-relaxed"
          placeholder={'<div class="promo">…</div>\n<style>.promo { … }</style>'}
          onKeyDown={(ev) => {
            // Tab inserts two spaces instead of leaving the field.
            if (ev.key !== "Tab") return;
            ev.preventDefault();
            const t = ev.currentTarget;
            const { selectionStart: a, selectionEnd: b } = t;
            onChange({ code: code.slice(0, a) + "  " + code.slice(b) });
            requestAnimationFrame(() => t.setSelectionRange(a + 2, a + 2));
          }}
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        {mode === "html"
          ? "Write any HTML and put CSS inside <style>. Embeds (YouTube, Google Maps iframes) work. <script> tags and onclick-style attributes are removed. Switch to JavaScript mode if you need them. Tip: prefix your CSS classes (e.g. .my-promo) so they don't affect the rest of the page."
          : "Everything works here, including <script> tags and external libraries. The code runs in an isolated frame that resizes to fit, so it can't affect the rest of the page."}
      </p>
    </div>
  );
}

function ItemsEditor({
  id, cfg, items, onChange, errors, prefix,
}: {
  id: string; cfg: NonNullable<(typeof CAPS)[LandingSectionType]["items"]>; items: LandingItem[]; onChange: (v: LandingItem[]) => void; errors: Errors; prefix: string;
}) {
  const set = (i: number, p: Partial<LandingItem>) => onChange(items.map((it, k) => (k === i ? { ...it, ...p } : it)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    const [it] = next.splice(i, 1);
    next.splice(i + d, 0, it!);
    onChange(next);
  };
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-semibold">
        {cfg.label} <span className="font-normal text-muted-foreground">({items.length})</span>
      </legend>
      {items.map((it, i) => (
        <div key={i} className="grid gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
            <span className="flex-1" />
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp aria-hidden />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown aria-hidden />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))}>
              <Trash2 className="text-danger" aria-hidden />
            </Button>
          </div>
          {cfg.image && <ImageInput id={`${id}-it${i}-img`} label="Image" value={it.imageUrl} onChange={(v) => set(i, { imageUrl: v })} error={errors[`${prefix}.${i}.imageUrl`]} />}
          <Field label={cfg.title} htmlFor={`${id}-it${i}-t`} error={errors[`${prefix}.${i}.title`]}>
            <Input id={`${id}-it${i}-t`} value={it.title} onChange={(e) => set(i, { title: e.target.value })} />
          </Field>
          {cfg.text && (
            <Field label={cfg.text} htmlFor={`${id}-it${i}-x`} error={errors[`${prefix}.${i}.text`]}>
              <Textarea id={`${id}-it${i}-x`} rows={2} value={it.text} onChange={(e) => set(i, { text: e.target.value })} />
            </Field>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...items, blankItem()])} disabled={items.length >= 30}>
        <Plus aria-hidden /> {cfg.add}
      </Button>
    </fieldset>
  );
}

/** Upload to storage, or paste any image URL. */
function ImageInput({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label={label} htmlFor={`${id}-url`} error={error} help="Upload an image or paste an image URL.">
      <div className="grid gap-2">
        <ImageField id={`${id}-file`} label={label} value={value} onChange={onChange} />
        <Input id={`${id}-url`} placeholder="https://…" value={value} onChange={(e) => onChange(e.target.value.trim())} />
      </div>
    </Field>
  );
}

function ColorField({ id, label, value, onChange, optional, error }: { id: string; label: string; value: string; onChange: (v: string) => void; optional?: boolean; error?: string }) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-border bg-card p-1"
        />
        <Input id={id} value={value} placeholder={optional ? "Default" : "#000000"} onChange={(e) => onChange(e.target.value.trim())} className="font-mono" />
        {optional && value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Reset
          </Button>
        )}
      </div>
    </Field>
  );
}

function ThemeSample({ theme }: { theme: LandingTheme }) {
  const r = { none: "0px", small: "8px", large: "20px" }[theme.radius];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sample</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden border border-border" style={{ borderRadius: r, backgroundColor: theme.background, color: theme.text }}>
          <div className="grid gap-3 p-6 text-white" style={{ backgroundColor: theme.primary }}>
            <p className="text-2xl font-extrabold">Best Painting Services in Westlake, OH</p>
            <span className="w-fit px-4 py-2 font-semibold" style={{ backgroundColor: theme.accent, borderRadius: r }}>
              Get a free quote
            </span>
          </div>
          <div className="grid gap-2 p-6">
            <p className="text-lg font-bold">Our services</p>
            <p className="opacity-75">Body text looks like this on the page background.</p>
            <span className="w-fit px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: theme.primary, borderRadius: r }}>
              Primary button
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessSwitcher({ current, onPick, error }: { current: { id: string; name: string }; onPick: (b: { id: string; name: string }) => void; error?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; cityName: string; stateCode: string | null }[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchBusinessesForPicker({ q: term });
      if (!cancelled) setHits(res.ok && res.data ? res.data : []);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);
  const visible = useMemo(() => (q.trim().length >= 2 ? hits : []), [q, hits]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm">
          Linked to <strong>{current.name}</strong>
        </p>
        <Field label="Move this page to another business" htmlFor="lp-biz-q" error={error}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="lp-biz-q" className="pl-9" placeholder="Search approved businesses…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </Field>
        {visible.length > 0 && (
          <ul className="grid max-h-64 overflow-auto rounded-md border border-border">
            {visible.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onPick({ id: h.id, name: h.name });
                    setQ("");
                  }}
                >
                  <span className="font-medium">{h.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {h.cityName}
                    {h.stateCode ? `, ${h.stateCode}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-2 w-fit"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await duplicateLandingPage({ id });
          if (!res.ok || !res.data) return void toast.error(res.ok ? "Could not duplicate" : res.message);
          toast.success(res.message ?? "Copied");
          router.push(`/admin/landing-pages/${res.data.id}`);
        })
      }
    >
      <Copy aria-hidden /> Duplicate page
    </Button>
  );
}
