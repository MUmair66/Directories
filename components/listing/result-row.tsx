import Link from "next/link";
import { BadgeCheck, MapPin, Quote } from "lucide-react";
import type { ListingCard } from "@/lib/search";
import { decodeEntities, excerpt } from "@/lib/text";
import { formatMiles } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { BusinessCover } from "./business-avatar";
import { RatingSummary } from "./stars";
import { OpenUntil } from "./open-status";
import { SaveButton } from "./save-button";
import { ResultActions } from "./result-actions";

export type RowSnippet = { rating: number; body: string; userName: string | null };

/**
 * Numbered search result row: photo on the left; name, rating, category chips, place and
 * open status, a quoted review snippet (or the description), then call / message actions.
 * Works in server and client trees (Load more renders it in the browser).
 */
export function ResultRow({ b, index, snippet, showDistance = false, priority, className }: { b: ListingCard; index?: number; snippet?: RowSnippet | null; showDistance?: boolean; priority?: boolean; className?: string }) {
  const name = decodeEntities(b.name);
  const href = `/biz/${b.slug}`;
  const quote = snippet?.body ? excerpt(snippet.body, 170) : b.description ? excerpt(b.description, 170) : null;
  const titleId = `result-${b.id}`;

  return (
    <article
      data-business-id={b.id}
      aria-labelledby={titleId}
      className={cn(
        "group relative grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 rounded-xl border border-border bg-card p-3 shadow-card transition-[box-shadow,border-color] duration-200 hover:border-primary/30 hover:shadow-card-hover sm:grid-cols-[10rem_minmax(0,1fr)] sm:grid-rows-[auto_1fr] sm:gap-x-5 sm:p-4",
        className,
      )}
    >
      <div className="relative size-[5.5rem] overflow-hidden rounded-lg sm:row-span-2 sm:size-40">
        <BusinessCover name={name} src={b.bannerUrl ?? b.logoUrl} className="absolute inset-0" priority={priority} sizes="(max-width: 640px) 88px, 160px" />
        {b.featured && <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">Featured</span>}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 id={titleId} className="min-w-0 text-base font-bold leading-snug sm:text-lg">
            <Link href={href} className="rounded-sm after:absolute after:inset-0 after:rounded-xl hover:text-primary focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring">
              {index != null && <span className="tabular-nums">{index}. </span>}
              {name}
            </Link>
            {b.verified && <BadgeCheck className="ml-1 inline size-4 -translate-y-px text-primary" aria-label="Verified business" />}
          </h3>
          <SaveButton businessId={b.id} className="relative z-10 -mr-1 -mt-1 size-9 shrink-0 bg-transparent shadow-none hover:bg-muted dark:bg-transparent" />
        </div>

        <RatingSummary rating={b.avgRating} count={b.reviewCount} size={16} />

        <div className="flex flex-wrap items-center gap-1.5">
          {b.categoryName && <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{decodeEntities(b.categoryName)}</span>}
          {b.claimed && <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Claimed</span>}
          {b.isNew && <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">New</span>}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {b.cityName}
            {b.stateCode ? `, ${b.stateCode}` : ""}
            {showDistance && b.distanceMiles != null && <span className="font-medium text-foreground"> · {formatMiles(b.distanceMiles)}</span>}
          </span>
          <OpenUntil hours={b.hours} timezone={b.timezone} className="text-sm" />
        </div>
      </div>

      <div className="col-span-2 flex min-w-0 flex-col gap-2 sm:col-span-1 sm:col-start-2">
        {quote && (
          <p className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <Quote className="mt-0.5 size-4 shrink-0 text-primary/60" aria-hidden />
            <span className="line-clamp-2">
              {snippet?.body ? <span className="sr-only">Review{snippet.userName ? ` by ${snippet.userName}` : ""}: </span> : null}
              &ldquo;{quote}&rdquo;
            </span>
          </p>
        )}

        <ResultActions businessId={b.id} name={name} phone={b.phone} />
      </div>
    </article>
  );
}
