import Link from "next/link";
import { Suspense } from "react";
import { Star } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOwnerBusinessOptions, getOwnerReviews, getRatingTrend } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, NativeSelect } from "@/components/ui/primitives";
import { RatingTrendChart } from "@/components/dashboard/charts";
import { AutoRefresh } from "@/components/dashboard/helpers";
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { ReviewItem } from "@/components/dashboard/review-item";

export const metadata = { title: "Reviews" };

export default function ReviewsPage({ searchParams }: PageProps<"/dashboard/reviews">) {
  return (
    <>
      <PageHeader title="Reviews" description="Every review across your businesses. Replies are public." crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reviews" }]} />
      <Suspense fallback={<PageSkeleton rows={5} />}>
        <Reviews searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Reviews({ searchParams }: { searchParams: PageProps<"/dashboard/reviews">["searchParams"] }) {
  const sp = await searchParams;
  const user = await requireUser();
  const businessId = typeof sp.business === "string" && /^[0-9a-f-]{36}$/i.test(sp.business) ? sp.business : undefined;
  const rating = Number(sp.rating) >= 1 && Number(sp.rating) <= 5 ? Number(sp.rating) : undefined;
  const replied = sp.replied === "yes" || sp.replied === "no" ? sp.replied : undefined;
  const [reviews, trend, businesses] = await Promise.all([getOwnerReviews(user.id, { businessId, rating, replied }), getRatingTrend(user.id), getOwnerBusinessOptions(user.id)]);
  const filtered = !!(businessId || rating || replied);

  return (
    <div className="grid gap-6">
      <AutoRefresh />
      <Card>
        <CardHeader>
          <CardTitle>Rating trend</CardTitle>
        </CardHeader>
        <CardContent>
          <RatingTrendChart data={trend} />
        </CardContent>
      </Card>

      <form className="flex flex-wrap gap-2" aria-label="Filter reviews">
        <label className="sr-only" htmlFor="f-business">Business</label>
        <NativeSelect id="f-business" name="business" defaultValue={businessId ?? ""} className="w-56">
          <option value="">All businesses</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
        <label className="sr-only" htmlFor="f-rating">Rating</label>
        <NativeSelect id="f-rating" name="rating" defaultValue={rating ?? ""} className="w-40">
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </NativeSelect>
        <label className="sr-only" htmlFor="f-replied">Reply status</label>
        <NativeSelect id="f-replied" name="replied" defaultValue={replied ?? ""} className="w-40">
          <option value="">Replied or not</option>
          <option value="no">Unreplied</option>
          <option value="yes">Replied</option>
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {filtered && (
          <Button asChild variant="ghost">
            <Link href="/dashboard/reviews">Reset</Link>
          </Button>
        )}
      </form>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star />}
          title={filtered ? "No reviews match these filters" : "No reviews yet"}
          description={filtered ? "Try different filters." : "Share your business page with happy customers and ask them to leave a review."}
          action={
            filtered ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/reviews">Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard/businesses">Go to My Businesses</Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4">
          {reviews.map((r) => (
            <ReviewItem key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
