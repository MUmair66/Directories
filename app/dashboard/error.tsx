"use client";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-lg border border-border bg-card p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-danger dark:bg-red-950">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">We couldn&apos;t load this page. Please try again. If it keeps happening, open a support ticket.</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}
