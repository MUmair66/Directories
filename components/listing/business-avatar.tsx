import { initials } from "@/lib/text";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";

const PALETTE = ["#2563EB", "#1E3A8A", "#0E7490", "#7C3AED", "#BE185D", "#B45309", "#15803D", "#0F766E"];

function colorFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Logo, or a generated initials avatar in brand colors (also used when the logo fails to load). */
export function BusinessAvatar({ name, src, size = 56, className, priority }: { name: string; src?: string | null; size?: number; className?: string; priority?: boolean }) {
  const fallback = (
    <span
      role="img"
      aria-label={`${name} logo`}
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-lg font-heading font-bold text-white", className)}
      style={{ width: size, height: size, background: colorFor(name), fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
  if (!src) return fallback;
  return (
    <SafeImage
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-lg border border-border bg-card object-cover", className)}
      style={{ width: size, height: size }}
      fallback={fallback}
    />
  );
}

/** Banner/thumbnail with an initials panel when there's no photo or it fails to load. Never a blank box. */
export function BusinessCover({ name, src, className, sizes, priority }: { name: string; src?: string | null; className?: string; sizes?: string; priority?: boolean }) {
  const panel = (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colorFor(name)}, #1E3A8A)` }} aria-hidden>
      <span className="font-heading text-4xl font-bold text-white/90">{initials(name)}</span>
    </div>
  );
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? <SafeImage src={src} alt={`${name} photo`} fill sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"} priority={priority} className="object-cover" fallback={panel} /> : panel}
    </div>
  );
}
