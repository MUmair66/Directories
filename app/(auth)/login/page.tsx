import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

/** Google sign-in shows only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set (lib/auth.ts registers it then). */
const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[460px]" />}>
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
