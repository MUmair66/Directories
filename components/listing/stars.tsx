import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star rating with half stars. */
export function Stars({ rating, size = 16, className }: { rating: number; size?: number; className?: string }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const full = rounded >= i;
        const half = !full && rounded >= i - 0.5;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-slate-300 dark:text-slate-600" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            {full && <Star className="absolute inset-0 text-rating" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />}
            {half && <StarHalf className="absolute inset-0 text-rating" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />}
          </span>
        );
      })}
    </span>
  );
}

export function RatingSummary({ rating, count, size = 16, className }: { rating: number; count: number; size?: number; className?: string }) {
  if (!count) return <span className={cn("text-sm text-muted-foreground", className)}>No reviews yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
      <Stars rating={rating} size={size} />
      <span className="text-muted-foreground">({count.toLocaleString("en-US")})</span>
    </span>
  );
}
