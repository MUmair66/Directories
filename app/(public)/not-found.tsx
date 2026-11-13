import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

/** 404 inside the public layout (unknown business, category, city…). The header search bar stays available. */
export default function PublicNotFound() {
  return (
    <Container className="flex max-w-xl flex-col items-center gap-5 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
        <SearchX className="size-7" aria-hidden />
      </span>
      <h1 className="text-3xl font-bold">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground">It may have moved or been removed. Use the search bar above, or start from one of these:</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/categories">Browse categories</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/states">Browse states</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Homepage</Link>
        </Button>
      </div>
    </Container>
  );
}
