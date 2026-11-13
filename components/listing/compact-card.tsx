import Link from "next/link";
import { MapPin } from "lucide-react";
import type { ListingCard } from "@/lib/search";
import { decodeEntities } from "@/lib/text";
import { formatMiles } from "@/lib/geo";
import { BusinessCover } from "./business-avatar";
import { RatingSummary } from "./stars";

/** Small photo-first card for "People also viewed" style rails. */
export function CompactCard({ b, showDistance = false }: { b: ListingCard; showDistance?: boolean }) {
  const name = decodeEntities(b.name);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
      <BusinessCover name={name} src={b.bannerUrl ?? b.logoUrl} className="aspect-[16/10]" sizes="(max-width: 640px) 100vw, 280px" />
      <div className="grid gap-1 p-3.5">
        <h3 className="line-clamp-1 font-bold leading-snug">
          <Link href={`/biz/${b.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">
            {name}
          </Link>
        </h3>
        <RatingSummary rating={b.avgRating} count={b.reviewCount} size={14} />
        <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
          {b.categoryName && <span className="truncate">{decodeEntities(b.categoryName)} ·</span>}
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {b.cityName}
            {showDistance && b.distanceMiles != null ? ` · ${formatMiles(b.distanceMiles)}` : ""}
          </span>
        </p>
      </div>
    </article>
  );
}
