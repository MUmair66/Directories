import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmail } from "./verify-email";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <VerifyEmail />
    </Suspense>
  );
}
