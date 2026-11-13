"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, RefreshCw, Search, Star } from "lucide-react";
import { createLandingPage, landingSuggestion } from "@/app/actions/admin/landing";
import { searchBusinessesForPicker } from "@/app/actions/admin/businesses";
import { suggestLandingSlug } from "@/lib/landing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Field, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Hit = { id: string; name: string; cityName: string; stateCode: string | null; avgRating: number; reviewCount: number };
type Seed = { name: string; categoryName: string | null; cityName: string | null; stateCode: string | null };

export function NewLandingForm({ siteUrl }: { siteUrl: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [seed, setSeed] = useState<Seed | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

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

  const pick = async (h: Hit) => {
    setPicked(h);
    setQ("");
    const res = await landingSuggestion({ businessId: h.id });
    if (res.ok && res.data) {
      const s = res.data;
      setSeed(s);
      const place = [s.cityName, s.stateCode].filter(Boolean).join(", ");
      setTitle(s.categoryName ? `Best ${s.categoryName} in ${place || "your area"}` : `${s.name}${place ? ` – ${place}` : ""}`);
      setSlug(suggestLandingSlug(s));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) return setErrors({ businessId: "Choose a business" });
    start(async () => {
      const res = await createLandingPage({ businessId: picked.id, title, slug });
      if (!res.ok || !res.data) {
        setErrors(res.ok ? {} : (res.fieldErrors ?? {}));
        toast.error(res.ok ? "Could not create the page." : res.message);
        return;
      }
      toast.success(res.message ?? "Created");
      router.push(`/admin/landing-pages/${res.data.id}`);
    });
  };

  const visible = q.trim().length >= 2 ? hits : [];

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-6" noValidate>
      <Card>
        <CardContent className="grid gap-4 p-6">
          <h2 className="text-lg font-semibold">1. Choose the business</h2>
          {picked ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-secondary/40 p-4">
              <div className="flex items-center gap-3">
                <Check className="size-5 text-primary" aria-hidden />
                <div>
                  <p className="font-semibold">{picked.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {picked.cityName}
                    {picked.stateCode ? `, ${picked.stateCode}` : ""}
                    {seed?.categoryName ? ` · ${seed.categoryName}` : ""}
                  </p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setPicked(null); setSeed(null); }}>
                Change
              </Button>
            </div>
          ) : (
            <Field label="Search approved businesses" htmlFor="nl-q" error={errors.businessId}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="nl-q" className="pl-9" placeholder="Type a business name…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              </div>
            </Field>
          )}
          {!picked && visible.length > 0 && (
            <ul className="grid max-h-80 divide-y divide-border overflow-auto rounded-md border border-border">
              {visible.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => pick(h)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted">
                    <span>
                      <span className="block font-medium">{h.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {h.cityName}
                        {h.stateCode ? `, ${h.stateCode}` : ""}
                      </span>
                    </span>
                    {h.reviewCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden /> {Number(h.avgRating).toFixed(1)} ({h.reviewCount})
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className={cn(!picked && "pointer-events-none opacity-50")} aria-disabled={!picked}>
        <CardContent className="grid gap-4 p-6">
          <h2 className="text-lg font-semibold">2. Title and URL</h2>
          <Field label="Page title" htmlFor="nl-title" required error={errors.title}>
            <Input id="nl-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="URL slug (your choice)" htmlFor="nl-slug" required error={errors.slug} help={`${siteUrl}/${slug || "…"}#Intro`}>
            <div className="flex gap-2">
              <Input id="nl-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="font-mono" />
              <Button type="button" variant="outline" size="icon" aria-label="Suggest another URL" disabled={!seed} onClick={() => seed && setSlug(suggestLandingSlug(seed))}>
                <RefreshCw aria-hidden />
              </Button>
            </div>
          </Field>
          <Button type="submit" loading={pending} disabled={!picked} className="w-fit">
            Create page and open editor
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
