"use client";
import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

/** Friendly error state for public pages. Never shows raw error details. */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <Container className="flex max-w-xl flex-col items-center gap-5 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-danger dark:bg-red-950">
        <TriangleAlert className="size-7" aria-hidden />
      </span>
      <h1 className="text-3xl font-bold">This page didn&apos;t load</h1>
      <p className="text-muted-foreground">Something went wrong on our side. Try again, or search for what you need.</p>
      <form action="/search" role="search" className="flex w-full gap-2">
        <label htmlFor="err-q" className="sr-only">
          Search businesses
        </label>
        <input id="err-q" name="q" placeholder="Search businesses" className="h-11 flex-1 rounded-md border border-input bg-card px-3 focus-visible:outline-2 focus-visible:outline-ring" />
        <Button type="submit" size="lg" variant="outline">
          Search
        </Button>
      </form>
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RotateCcw aria-hidden /> Try again
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Go home</Link>
        </Button>
      </div>
      {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </Container>
  );
}
