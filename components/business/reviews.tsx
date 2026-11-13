"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, MessageSquareReply, Star } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { reportReview, submitReview } from "@/app/actions/public-forms";
import { reviewSchema } from "@/lib/validations/forms";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/text";
import { cn } from "@/lib/utils";
import { Stars } from "@/components/listing/stars";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Field, NativeSelect, Textarea } from "@/components/ui/primitives";
import { Turnstile } from "@/components/forms/turnstile";

export type ReviewItem = {
  id: string;
  rating: number;
  body: string;
  createdAt: string | Date;
  user: { name: string; image: string | null; photoUrl: string | null } | null;
  reply: { body: string; createdAt: string | Date } | null;
};

// Fixed time zone so server HTML and hydration agree on the date.
const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

function ReviewCard({ r }: { r: ReviewItem }) {
  const name = r.user?.name ?? "Customer";
  const photo = r.user?.photoUrl || r.user?.image;
  return (
    <li className="grid gap-3 border-b border-border py-6 first:pt-2 last:border-0">
      <div className="flex items-center gap-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-12 rounded-full object-cover" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground" aria-hidden>
            {initials(name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={r.rating} size={18} />
        <time dateTime={new Date(r.createdAt).toISOString()} className="text-sm text-muted-foreground">
          {fmt(r.createdAt)}
        </time>
      </div>
      <p className="whitespace-pre-line leading-relaxed">{r.body}</p>
      {r.reply && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm sm:ml-6">
          <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold">
            <MessageSquareReply className="size-4 text-primary" aria-hidden /> Response from the owner
            <time dateTime={new Date(r.reply.createdAt).toISOString()} className="text-xs font-normal text-muted-foreground">
              {fmt(r.reply.createdAt)}
            </time>
          </p>
          <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{r.reply.body}</p>
        </div>
      )}
      <ReportReview reviewId={r.id} />
    </li>
  );
}

const PAGE = 10;
const MAX_FILTER_LOAD = 200;

/**
 * Reviews block: overall score, a clickable rating histogram (filters by star),
 * sort, and the review list with "Show more".
 * Star filtering runs over the loaded reviews; selecting a star loads the rest first (up to 200).
 */
export function ReviewsPanel({
  businessId,
  initial,
  total,
  avgRating,
  distribution,
  children,
}: {
  businessId: string;
  initial: ReviewItem[];
  total: number;
  avgRating: number;
  distribution: { star: number; n: number }[];
  /** Rendered between the summary and the list (the write-a-review form). */
  children?: React.ReactNode;
}) {
  const [items, setItems] = useState(initial);
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [star, setStar] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(initial.length >= total);

  async function fetchPage(s: typeof sort, offset: number) {
    const res = await fetch(`/api/reviews?businessId=${businessId}&sort=${s}&offset=${offset}`);
    if (!res.ok) throw new Error();
    return (await res.json()) as ReviewItem[];
  }

  async function load(nextSort: typeof sort, offset: number, all = false) {
    setLoading(true);
    try {
      let acc = offset === 0 ? [] : items;
      let page: ReviewItem[];
      do {
        page = await fetchPage(nextSort, acc.length);
        acc = [...acc, ...page];
      } while (all && page.length === PAGE && acc.length < Math.min(total, MAX_FILTER_LOAD));
      setItems(acc);
      setComplete(page.length < PAGE || acc.length >= total);
    } catch {
      toast.error("Couldn't load reviews. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const visible = star ? items.filter((r) => r.rating === star) : items;
  const selectedCount = star ? (distribution.find((d) => d.star === star)?.n ?? 0) : total;

  return (
    <div className="grid gap-6">
      {total > 0 && (
      <div className="grid gap-6 rounded-xl border border-border bg-card p-5 shadow-card sm:grid-cols-[minmax(0,200px)_1fr] sm:p-6">
        <div className="grid content-center justify-items-start gap-1.5 sm:justify-items-center sm:text-center">
          <p className="text-sm font-semibold text-muted-foreground">Overall rating</p>
          <p className="font-heading text-5xl font-extrabold leading-none">{total ? avgRating.toFixed(1) : "–"}</p>
          <Stars rating={avgRating} size={22} />
          <p className="text-sm text-muted-foreground">{total.toLocaleString("en-US")} reviews</p>
        </div>
        <div className="grid gap-1" role="group" aria-label="Filter reviews by rating">
          {distribution.map((d) => {
            const pct = total ? Math.round((d.n / total) * 100) : 0;
            const on = star === d.star;
            return (
              <button
                key={d.star}
                type="button"
                aria-pressed={on}
                disabled={!d.n}
                onClick={() => {
                  const next = on ? null : d.star;
                  setStar(next);
                  if (next && !complete) load(sort, 0, true);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1 text-sm transition-colors enabled:hover:bg-muted disabled:cursor-default disabled:opacity-60",
                  on && "bg-secondary text-secondary-foreground",
                )}
              >
                <span className="w-14 shrink-0 text-left font-medium">{d.star} {d.star === 1 ? "star" : "stars"}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full rounded-full bg-rating" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">{d.n}</span>
                <span className="sr-only">
                  {pct}% of reviews. {on ? "Showing only these reviews." : "Show only these reviews."}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {!total && <p className="text-muted-foreground">No reviews yet. Be the first to share your experience.</p>}

      {children}

      {total > 0 && (
        <div className={cn("grid gap-2 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {star ? (
                <>
                  Showing {visible.length} of {selectedCount} {star}-star {selectedCount === 1 ? "review" : "reviews"}{" "}
                  <button type="button" onClick={() => setStar(null)} className="font-semibold text-primary hover:underline">
                    Show all
                  </button>
                </>
              ) : (
                `${total.toLocaleString("en-US")} reviews`
              )}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="review-sort" className="text-sm text-muted-foreground">
                Sort by
              </label>
              <NativeSelect
                id="review-sort"
                className="h-9 w-auto"
                value={sort}
                onChange={(e) => {
                  const s = e.target.value as typeof sort;
                  setSort(s);
                  load(s, 0, !!star);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="highest">Highest rated</option>
                <option value="lowest">Lowest rated</option>
              </NativeSelect>
            </div>
          </div>
          {visible.length ? (
            <ul>
              {visible.map((r) => (
                <ReviewCard key={r.id} r={r} />
              ))}
            </ul>
          ) : (
            !loading && <p className="py-6 text-sm text-muted-foreground">No {star}-star reviews loaded yet.</p>
          )}
          {!star && !complete && (
            <Button variant="outline" onClick={() => load(sort, items.length)} loading={loading}>
              Show more reviews
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ReportReview({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-danger">
        <Flag className="size-3.5" aria-hidden /> Report
      </DialogTrigger>
      <DialogContent title="Report this review" description="Tell our moderators what's wrong. Reports are anonymous to the reviewer.">
        <Field label="Reason" htmlFor={`report-${reviewId}`} required>
          <Textarea id={`report-${reviewId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Spam, fake review, offensive language…" />
        </Field>
        <Button
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await reportReview({ reviewId, reason });
              if (res.ok) {
                toast.success(res.message ?? "Reported");
                setOpen(false);
                setReason("");
              } else toast.error(res.message);
            })
          }
        >
          Submit report
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewsList({ businessId, initial, total }: { businessId: string; initial: ReviewItem[]; total: number }) {
  const [items, setItems] = useState(initial);
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [loading, setLoading] = useState(false);

  async function load(nextSort: typeof sort, offset: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?businessId=${businessId}&sort=${nextSort}&offset=${offset}`);
      const data = (await res.json()) as ReviewItem[];
      setItems((prev) => (offset === 0 ? data : [...prev, ...data]));
    } catch {
      toast.error("Couldn't load reviews. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!total) return <p className="text-muted-foreground">No reviews yet. Be the first to share your experience.</p>;
  return (
    <div className={cn("grid gap-2 transition-opacity", loading && "opacity-60")}>
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="review-sort" className="text-sm text-muted-foreground">
          Sort by
        </label>
        <NativeSelect
          id="review-sort"
          className="h-9 w-auto"
          value={sort}
          onChange={(e) => {
            const s = e.target.value as typeof sort;
            setSort(s);
            load(s, 0);
          }}
        >
          <option value="newest">Newest</option>
          <option value="highest">Highest</option>
          <option value="lowest">Lowest</option>
        </NativeSelect>
      </div>
      <ul>
        {items.map((r) => (
          <ReviewCard key={r.id} r={r} />
        ))}
      </ul>
      {items.length < total && (
        <Button variant="outline" onClick={() => load(sort, items.length)} loading={loading}>
          Show more reviews
        </Button>
      )}
    </div>
  );
}

type FormValues = z.input<typeof reviewSchema>;

export function WriteReview({ businessId, slug }: { businessId: string; slug: string }) {
  const { data: session, isPending } = authClient.useSession();
  const [hover, setHover] = useState(0);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [done, setDone] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(reviewSchema), defaultValues: { businessId, rating: 0, body: "" } });
  const rating = form.watch("rating");
  const body = form.watch("body") ?? "";
  const errors = form.formState.errors;

  if (isPending) return null;
  if (!session) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-5 text-center">
        <p className="mb-3 font-semibold">Share your experience</p>
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent(`/biz/${slug}#write-review`)}`}>Log in to write a review</Link>
        </Button>
      </div>
    );
  }
  if (done) return <p className="rounded-lg bg-green-50 p-4 text-sm font-medium text-green-800 dark:bg-green-950 dark:text-green-200">Thanks! Your review is live.</p>;

  const onSubmit = form.handleSubmit(async (v) => {
    const res = await submitReview({ ...v, turnstileToken: token });
    if (res.ok) {
      toast.success(res.message ?? "Review posted");
      setDone(true);
    } else {
      toast.error(res.message);
      for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as keyof FormValues, { message: m });
      setResetKey((k) => k + 1);
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-border bg-card p-5" noValidate>
      <h3 className="text-lg font-bold">Write a review</h3>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          Your rating <span className="text-danger">*</span>
        </legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Star rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => form.setValue("rating", n, { shouldValidate: true })}
              className="rounded p-0.5"
            >
              <Star className={cn("size-8 transition-colors", (hover || rating) >= n ? "fill-rating text-rating" : "text-slate-300")} />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p className="mt-1 text-sm text-danger" role="alert">
            {errors.rating.message}
          </p>
        )}
      </fieldset>
      <Field label="Your review" htmlFor="review-body" required error={errors.body?.message} help="At least 30 characters. Describe the service, price and outcome." counter={{ value: body.length, max: 3000 }}>
        <Textarea id="review-body" rows={5} aria-invalid={!!errors.body} {...form.register("body")} />
      </Field>
      <Turnstile onToken={setToken} resetKey={resetKey} />
      <Button type="submit" loading={form.formState.isSubmitting} className="w-fit">
        Post review
      </Button>
    </form>
  );
}
