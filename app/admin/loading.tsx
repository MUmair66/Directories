import { Skeleton } from "@/components/ui/primitives";

export default function AdminLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
