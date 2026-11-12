import { cn } from "@/lib/utils";

/** Simple monochrome brand glyphs (lucide-react 1.x no longer ships brand icons). */
const PATHS: Record<string, string> = {
  facebook: "M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6Z",
  x: "M17.7 3H21l-7.2 8.2L22 21h-6.6l-5.2-6.4L4.3 21H1l7.7-8.8L1 3h6.8l4.7 5.9L17.7 3Zm-1.2 16h1.8L6.6 4.9H4.7L16.5 19Z",
  youtube: "M23 12s0-3.6-.5-5.3a2.8 2.8 0 0 0-2-2C18.8 4.2 12 4.2 12 4.2s-6.8 0-8.5.5a2.8 2.8 0 0 0-2 2C1 8.4 1 12 1 12s0 3.6.5 5.3a2.8 2.8 0 0 0 2 2c1.7.5 8.5.5 8.5.5s6.8 0 8.5-.5a2.8 2.8 0 0 0 2-2c.5-1.7.5-5.3.5-5.3ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z",
  linkedin: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.1c.5-1 1.8-1.9 3.7-1.9 4 0 4.7 2.5 4.7 5.8v5.6h-4v-5c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6v5.1h-4v-11Z",
  instagram: "M12 7.4A4.6 4.6 0 1 0 12 16.6 4.6 4.6 0 0 0 12 7.4Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm5.9-7.8a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21 7.3c-.1-1.5-.4-2.8-1.5-3.8S17.2 2.1 15.7 2c-1.5-.1-5.9-.1-7.4 0-1.5.1-2.8.4-3.8 1.5S3.1 5.8 3 7.3c-.1 1.5-.1 5.9 0 7.4.1 1.5.4 2.8 1.5 3.8s2.3 1.4 3.8 1.5c1.5.1 5.9.1 7.4 0 1.5-.1 2.8-.4 3.8-1.5s1.4-2.3 1.5-3.8c.1-1.5.1-5.9 0-7.4Z",
  pinterest: "M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.8 0 1.2.6 1.2 1.4 0 .8-.5 2.1-.8 3.2-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.8 2.3l.1.4-.3 1.1c0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2Z",
};

export function SocialIcon({ name, className }: { name: string; className?: string }) {
  const d = PATHS[name];
  if (!d) {
    return (
      <span className={cn("inline-flex size-5 items-center justify-center text-[10px] font-bold uppercase", className)} aria-hidden>
        {name.slice(0, 2)}
      </span>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-5", className)} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook", x: "X (Twitter)", youtube: "YouTube", linkedin: "LinkedIn", instagram: "Instagram", pinterest: "Pinterest",
  zillow: "Zillow", yelp: "Yelp", bbb: "BBB", angi: "Angi", foursquare: "Foursquare", houzz: "Houzz",
};
