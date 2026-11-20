import Link from "next/link";
import { BadgeCheck, Camera, ShieldCheck, Sparkles } from "lucide-react";
import type { HoursRow } from "@/lib/hours";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";
import { BusinessAvatar } from "@/components/listing/business-avatar";
import { Stars } from "@/components/listing/stars";
import { OpenUntil } from "@/components/listing/open-status";

type Photo = { id: string; url: string; alt: string | null };

const noPhoto = <span className="absolute inset-0 bg-gradient-to-br from-brand-deep via-ink to-slate-950" aria-hidden />;

/**
 * Profile header: a photo strip (up to 3 photos) under a dark overlay with the name,
 * big stars, review count, Claimed / Verified badges, categories and live open status.
 */
export function ProfileHero({
  name,
  logoUrl,
  photos,
  photoCount,
  rating,
  reviewCount,
  claimed,
  verified,
  featured,
  categories,
  hours,
  timezone,
}: {
  name: string;
  logoUrl?: string | null;
  photos: Photo[];
  photoCount: number;
  rating: number;
  reviewCount: number;
  claimed: boolean;
  verified: boolean;
  featured: boolean;
  categories: { id: string; name: string; href: string }[];
  hours: HoursRow[];
  timezone: string;
}) {
  const strip = photos.slice(0, 3);
  return (
    <header className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div className={cn("absolute inset-0 -z-10 grid gap-0.5", strip.length >= 3 ? "md:grid-cols-[2fr_1fr_1fr]" : strip.length === 2 ? "md:grid-cols-2" : "")} aria-hidden>
        {strip.length === 0
          ? noPhoto
          : strip.map((p, i) => (
              <div key={p.id} className={cn("relative", i > 0 && "hidden md:block")}>
                <SafeImage src={p.url} alt="" fill priority={i === 0} sizes={i === 0 ? "(max-width: 768px) 100vw, 50vw" : "25vw"} className="object-cover" fallback={noPhoto} />
              </div>
            ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/25" aria-hidden />

      <div className="relative mx-auto flex min-h-[300px] w-full max-w-7xl flex-col justify-end px-4 pb-6 pt-16 sm:min-h-[380px] sm:px-6 sm:pb-8 lg:px-8">
        <div className="flex items-end gap-4 sm:gap-5">
          <BusinessAvatar name={name} src={logoUrl} size={88} priority className="hidden border-2 border-white/80 shadow-lg sm:inline-flex" />
          <div className="grid min-w-0 gap-2.5">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.35)] sm:text-4xl lg:text-5xl">{name}</h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars rating={rating} size={26} />
              {reviewCount > 0 ? (
                <a href="#reviews" className="font-semibold hover:underline">
                  <span className="text-lg font-bold">{rating.toFixed(1)}</span>{" "}
                  <span className="text-white/85">
                    ({reviewCount.toLocaleString("en-US")} {reviewCount === 1 ? "review" : "reviews"})
                  </span>
                </a>
              ) : (
                <a href="#write-review" className="text-white/85 hover:underline">
                  No reviews yet. Be the first.
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              {claimed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 font-semibold ring-1 ring-white/25 backdrop-blur">
                  <ShieldCheck className="size-4 text-purple-300" aria-hidden /> Claimed
                </span>
              )}
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 font-semibold ring-1 ring-white/25 backdrop-blur">
                  <BadgeCheck className="size-4 text-emerald-300" aria-hidden /> Verified
                </span>
              )}
              {featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 font-semibold">
                  <Sparkles className="size-4" aria-hidden /> Featured
                </span>
              )}
              {categories.length > 0 && (
                <ul className="flex flex-wrap items-center gap-x-1 text-white/90" aria-label="Categories">
                  {categories.map((c, i) => (
                    <li key={c.id}>
                      <Link href={c.href} className="font-medium underline-offset-2 hover:underline">
                        {c.name}
                      </Link>
                      {i < categories.length - 1 && <span aria-hidden>,</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <OpenUntil hours={hours} timezone={timezone} tone="onDark" className="text-base" />
              {hours.length > 0 && (
                <a href="#hours" className="text-sm font-semibold text-white/90 underline-offset-2 hover:underline">
                  See hours
                </a>
              )}
            </div>
          </div>
        </div>

        {photoCount > 0 && (
          <a
            href="#photos"
            className="mt-5 inline-flex h-10 w-fit items-center gap-2 self-start rounded-md bg-white/15 px-4 text-sm font-semibold ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/25 sm:absolute sm:bottom-8 sm:right-6 sm:mt-0 lg:right-8"
          >
            <Camera className="size-4" aria-hidden /> See all {photoCount} photos
          </a>
        )}
      </div>
    </header>
  );
}
