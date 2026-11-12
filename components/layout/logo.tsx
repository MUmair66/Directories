import Link from "next/link";
import { MapPin } from "lucide-react";
import { BRAND_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-heading text-xl font-extrabold tracking-tight", light ? "text-white" : "text-ink dark:text-white", className)} aria-label={`${BRAND_NAME} home`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
        <MapPin className="size-5" aria-hidden />
      </span>
      {BRAND_NAME}
    </Link>
  );
}
