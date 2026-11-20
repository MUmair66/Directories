import Link from "next/link";
import { BRAND_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * LocalSpecific brand mark: a map pin holding a storefront, wrapped by a swoosh.
 * Drawn as inline SVG so it stays crisp at any size and works on light and dark surfaces.
 * Gradient ids are suffixed per variant so header and footer marks never clash.
 */
export function BrandMark({ className, light }: { className?: string; light?: boolean }) {
  const v = light ? "l" : "d";
  return (
    <svg viewBox="0 0 64 72" className={cn("shrink-0", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`ls-pin-${v}`} x1="0.9" y1="0" x2="0.1" y2="1">
          <stop offset="0" stopColor={light ? "#B24FD8" : "#8E24AA"} />
          <stop offset="1" stopColor={light ? "#5E2A9E" : "#2B1452"} />
        </linearGradient>
        <linearGradient id={`ls-swoosh-${v}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={light ? "#C77DFF" : "#7B1FA2"} />
          <stop offset="1" stopColor={light ? "#E1B5FA" : "#B040D0"} />
        </linearGradient>
      </defs>
      {/* Pin */}
      <path d="M32 3C18.2 3 7 14 7 27.6 7 45 32 69 32 69s25-24 25-41.4C57 14 45.8 3 32 3Z" fill={`url(#ls-pin-${v})`} />
      <circle cx="32" cy="27" r="15.5" fill="#fff" />
      {/* Storefront */}
      <rect x="23.5" y="25" width="17" height="12" rx="1" fill="#3A1663" />
      <rect x="25.6" y="27.6" width="6" height="6" rx="0.6" fill="#fff" />
      <rect x="34" y="27.6" width="4.6" height="9.4" rx="0.6" fill="#D8A7F5" />
      <path d="M22 18.5h20l1.4 5.8H20.6Z" fill="#7B1FA2" />
      <path d="M26 18.5h4v5.8h-4.6ZM34 18.5h4l.6 5.8H34Z" fill="#fff" />
      <path d="M20.6 24.3a2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.6 0 2.4 2.4 0 0 0 4.6 0 2.4 2.4 0 0 0 4.6 0 2.4 2.4 0 0 0 4.2 0Z" fill="#7B1FA2" />
      {/* Swoosh */}
      <path d="M1.5 64.5C6 55 30 46.5 61 40.5 39 49 15 56.5 7.5 66.6c-2 2.6-7.3 1.3-6-2.1Z" fill={`url(#ls-swoosh-${v})`} />
    </svg>
  );
}

/** Splits "LocalSpecific" into ["Local", "Specific"] for the two-tone wordmark. */
function splitBrand(name: string): [string, string] {
  const m = name.match(/^(.+?)([A-Z][a-z].*)$/);
  return m ? [m[1], m[2]] : [name, ""];
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  const [first, second] = splitBrand(BRAND_NAME);
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-heading text-[1.4rem] font-extrabold leading-none tracking-tight", className)}
      aria-label={`${BRAND_NAME} home`}
    >
      <BrandMark className="h-9 w-auto" light={light} />
      <span>
        <span className={light ? "text-white" : "text-ink dark:text-white"}>{first}</span>
        {second && <span className={light ? "text-[#DFA9F7]" : "text-brand-gradient"}>{second}</span>}
      </span>
    </Link>
  );
}
