"use client";
import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/app/actions/favorites";
import { cn } from "@/lib/utils";

/** Save heart. Logged-out visitors are sent to login and returned here. */
export function SaveButton({ businessId, saved = false, className, withLabel }: { businessId: string; saved?: boolean; className?: string; withLabel?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full transition-colors duration-150",
        withLabel ? "h-10 px-3 text-sm font-semibold hover:bg-muted" : "size-9 bg-white/90 shadow-sm hover:bg-white dark:bg-slate-900/90",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        start(async () => {
          setOptimistic(!optimistic);
          const res = await toggleFavorite({ businessId });
          if (!res.ok) {
            if (res.message.includes("log in")) router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
            else toast.error(res.message);
            return;
          }
          toast.success(res.message);
        });
      }}
    >
      <Heart className={cn("size-5", optimistic ? "fill-danger text-danger" : "text-slate-600 dark:text-slate-300")} />
      {withLabel && <span>{optimistic ? "Saved" : "Save"}</span>}
    </button>
  );
}
