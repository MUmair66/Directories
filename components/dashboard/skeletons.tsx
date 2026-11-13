import { Skeleton } from "@/components/ui/primitives";

export function PageSkeleton({ rows = 6, cards = 0 }: { rows?: number; cards?: number }) {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      {cards > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="grid max-w-3xl gap-5 rounded-lg border border-border bg-card p-6" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10" />
        </div>
      ))}
    </div>
  );
}
