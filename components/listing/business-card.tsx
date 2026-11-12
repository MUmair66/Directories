import Link from "next/link";
import { BadgeCheck, MapPin, Phone } from "lucide-react";
import type { ListingCard } from "@/lib/search";
import { excerpt, decodeEntities, formatPhone, telHref } from "@/lib/text";
import { formatMiles } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";
import { BusinessAvatar, BusinessCover } from "./business-avatar";
import { RatingSummary } from "./stars";
import { OpenStatus } from "./open-status";
import { SaveButton } from "./save-button";

export function BusinessCard({ b, layout = "grid", showDistance = false, priority }: { b: ListingCard; layout?: "grid" | "list"; showDistance?: boolean; priority?: boolean }) {
  const name = decodeEntities(b.name);
  const isNew = b.isNew;
  const href = `/biz/${b.slug}`;

  return (
    <article
      data-business-id={b.id}
      className={cn(
        "group relative flex overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow duration-200 ease-out hover:shadow-card-hover",
        layout === "grid" ? "flex-col" : "flex-col sm:flex-row",
      )}
    >
      <div className={cn("relative", layout === "grid" ? "aspect-[16/9]" : "aspect-[16/9] sm:aspect-auto sm:w-56 sm:shrink-0")}>
        <BusinessCover name={name} src={b.bannerUrl} className="absolute inset-0" priority={priority} sizes={layout === "grid" ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "224px"} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {b.featured && <Badge className="bg-primary text-white">Featured</Badge>}
          {isNew && <Badge className="bg-white text-ink">New</Badge>}
        </div>
        <SaveButton businessId={b.id} className="absolute right-3 top-3 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-3">
          <BusinessAvatar name={name} src={b.logoUrl} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 text-base font-bold leading-snug">
              <Link href={href} className="line-clamp-2 after:absolute after:inset-0 hover:text-primary">
                {name}
              </Link>
              {b.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />}
            </h3>
            {b.categoryName && <p className="truncate text-sm text-muted-foreground">{decodeEntities(b.categoryName)}</p>}
          </div>
        </div>

        <RatingSummary rating={b.avgRating} count={b.reviewCount} size={14} />

        {b.description && <p className="line-clamp-2 text-sm text-muted-foreground">{excerpt(b.description, 180)}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-sm">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {b.cityName}
            {b.stateCode ? `, ${b.stateCode}` : ""}
            {showDistance && b.distanceMiles != null && <span className="font-medium text-foreground"> · {formatMiles(b.distanceMiles)}</span>}
          </span>
          <OpenStatus hours={b.hours} timezone={b.timezone} />
        </div>
        {b.phone && (
          <a href={telHref(b.phone)} className="relative z-10 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <Phone className="size-4" aria-hidden />
            {formatPhone(b.phone)}
          </a>
        )}
      </div>
    </article>
  );
}
