import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

export default function DashboardNotFound() {
  return (
    <EmptyState
      icon={<SearchX />}
      title="Not found"
      description="This item doesn't exist or you don't have access to it."
      action={
        <Button asChild>
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      }
    />
  );
}
