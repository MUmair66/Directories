"use client";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { Container, Skeleton } from "@/components/ui/primitives";

/** Compact What + Where bar on every inner page (the home hero has its own). */
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <div className="border-t border-border bg-surface">
      <Container className="py-2">
        <Suspense fallback={<Skeleton className="h-11 w-full" />}>
          <SearchBar variant="compact" />
        </Suspense>
      </Container>
    </div>
  );
}
