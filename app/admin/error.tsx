"use client";
import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-danger dark:bg-red-950">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold">This admin page couldn&apos;t load</h1>
      <p className="text-muted-foreground">Something went wrong on our side. Try again, or go back to the admin overview.{error.digest ? ` (Ref: ${error.digest})` : ""}</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Admin dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
