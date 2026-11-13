"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";

/**
 * Handles /verify-email?token=… (manual verification links) and shows a resend form otherwise.
 * Better Auth's own link (/api/auth/verify-email) redirects straight to the callbackURL.
 */
export function VerifyEmail() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [state, setState] = useState<"idle" | "verifying" | "done" | "error">(token ? "verifying" : params.get("error") ? "error" : "idle");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const timeout = setTimeout(() => !cancelled && setState((s) => (s === "verifying" ? "error" : s)), 15000);
    authClient
      .verifyEmail({ query: { token } })
      .then(({ error }) => {
        if (cancelled) return;
        setState(error ? "error" : "done");
        if (!error) setTimeout(() => router.push("/dashboard/welcome"), 1200);
      })
      .catch(() => !cancelled && setState("error"))
      .finally(() => clearTimeout(timeout));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [token, router]);

  if (state === "verifying") {
    return (
      <div className="grid justify-items-center gap-3 text-center" aria-live="polite">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p>Verifying your email…</p>
      </div>
    );
  }
  if (state === "done") {
    return (
      <div className="grid justify-items-center gap-3 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">Email verified</h1>
        <p className="text-muted-foreground">Taking you to your dashboard…</p>
        <Button asChild>
          <Link href="/dashboard/welcome">Continue</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard/welcome" });
        setSending(false);
        if (error) toast.error(error.message ?? "Couldn't send the email. Try again shortly.");
        else toast.success("Verification email sent. Check your inbox.");
      }}
    >
      {state === "error" && <TriangleAlert className="size-10 text-amber-500" aria-hidden />}
      <div>
        <h1 className="text-2xl font-bold">{state === "error" ? "This link is invalid or expired" : "Verify your email"}</h1>
        <p className="mt-1 text-muted-foreground">Enter your email and we&apos;ll send a new verification link.</p>
      </div>
      <Field label="Email" htmlFor="email" required>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Field>
      <Button type="submit" loading={sending}>
        Send verification link
      </Button>
    </form>
  );
}
