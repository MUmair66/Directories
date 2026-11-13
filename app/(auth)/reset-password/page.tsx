import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "./reset-form";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <ResetForm />
    </Suspense>
  );
}
