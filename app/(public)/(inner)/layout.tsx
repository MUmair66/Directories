import { Suspense } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { Container, Skeleton } from "@/components/ui/primitives";

/**
 * Inner public pages: compact What + Where search under the header.
 * The home page sits outside this group because its hero has the full search.
 * (Deciding this by route group instead of usePathname() keeps every page's static shell prerenderable.)
 */
export default function InnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-border bg-surface">
        <Container className="py-2">
          <Suspense fallback={<Skeleton className="h-11 w-full" />}>
            <SearchBar variant="compact" />
          </Suspense>
        </Container>
      </div>
      {children}
    </>
  );
}
