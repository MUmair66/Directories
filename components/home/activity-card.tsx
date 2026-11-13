import Link from "next/link";
import { MapPin } from "lucide-react";
import { decodeEntities, excerpt, initials } from "@/lib/text";
import { BusinessCover } from "@/components/listing/business-avatar";
import { Stars } from "@/components/listing/stars";

export type ActivityCardData = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  userName: string | null;
  userImage: string | null;
  slug: string;
  businessName: string;
  cityName: string;
  stateCode: string | null;
  categoryName: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
};

/** "Jane Doe" -> "Jane D." so the public feed never shows full surnames. */
function publicName(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A customer";
  return parts.length === 1 ? parts[0]! : `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Recent activity feed card: who reviewed what, the stars, a snippet and the business link. */
export function ActivityCard({ a }: { a: ActivityCardData }) {
  const reviewer = publicName(a.userName);
  const business = decodeEntities(a.businessName);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-center gap-3 p-4">
        {a.userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.userImage} alt="" className="size-10 rounded-full object-cover" loading="lazy" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground" aria-hidden>
            {initials(reviewer)}
          </span>
        )}
        <div className="min-w-0 text-sm leading-tight">
          <p className="truncate">
            <span className="font-semibold">{reviewer}</span> <span className="text-muted-foreground">wrote a review</span>
          </p>
          <time dateTime={a.createdAt} className="text-xs text-muted-foreground">
            {fmt(a.createdAt)}
          </time>
        </div>
      </div>

      <BusinessCover name={business} src={a.bannerUrl ?? a.logoUrl} className="aspect-[16/9]" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-bold leading-snug">
          <Link href={`/biz/${a.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">
            {business}
          </Link>
        </h3>
        <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
          {a.categoryName && <span className="truncate">{decodeEntities(a.categoryName)} ·</span>}
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {a.cityName}
          {a.stateCode ? `, ${a.stateCode}` : ""}
        </p>
        <Stars rating={a.rating} size={16} />
        <p className="line-clamp-3 text-sm leading-relaxed">{excerpt(a.body, 220)}</p>
        <span className="mt-auto pt-1 text-sm font-semibold text-primary" aria-hidden>
          Continue reading
        </span>
      </div>
    </article>
  );
}
