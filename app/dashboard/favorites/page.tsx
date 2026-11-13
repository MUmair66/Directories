import Link from "next/link";
import { Suspense } from "react";
import { Heart, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFavorites } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { BusinessAvatar } from "@/components/listing/business-avatar";
import { RatingSummary } from "@/components/listing/stars";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { RemoveFavoriteButton } from "@/components/dashboard/simple-actions";

export const metadata = { title: "Favorites" };

export default function FavoritesPage() {
  return (
    <>
      <PageHeader title="Favorites" description="Businesses you saved with the heart icon." crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Favorites" }]} />
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <Favorites />
      </Suspense>
    </>
  );
}

async function Favorites() {
  const user = await requireUser();
  const items = await getFavorites(user.id);
  if (!items.length) {
    return (
      <EmptyState
        icon={<Heart />}
        title="No favorites yet"
        description="Tap the heart on any business to save it here for later."
        action={
          <Button asChild>
            <Link href="/search">Find businesses</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((b) => (
        <li key={b.id}>
          <Card className="flex h-full flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              <BusinessAvatar name={b.name} src={b.logoUrl} size={48} />
              <div className="min-w-0">
                <Link href={`/biz/${b.slug}`} className="font-semibold hover:text-primary">
                  {b.name}
                </Link>
                {b.categoryName && <p className="truncate text-sm text-muted-foreground">{b.categoryName}</p>}
              </div>
            </div>
            <RatingSummary rating={b.avgRating} count={b.reviewCount} size={14} />
            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden /> {b.cityName}
              {b.stateCode ? `, ${b.stateCode}` : ""}
            </p>
            <div className="mt-auto flex gap-2 pt-2">
              <Button asChild size="sm">
                <Link href={`/biz/${b.slug}`}>View</Link>
              </Button>
              <RemoveFavoriteButton businessId={b.id} name={b.name} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
