"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import type { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { forgotSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import { Turnstile } from "@/components/forms/turnstile";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const form = useForm<z.input<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    // Always show the same confirmation so the form never reveals which emails have accounts.
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password", fetchOptions: { headers: token ? { "x-captcha-response": token } : {} } });
    setSent(true);
  });

  if (sent) {
    return (
      <div className="grid gap-4 text-center">
        <MailCheck className="mx-auto size-12 text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground">If an account exists for that address, we sent a link to reset your password. The link expires in 1 hour.</p>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div>
        <h1 className="text-3xl font-bold">Forgot your password?</h1>
        <p className="mt-1 text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
      </div>
      <Field label="Email" htmlFor="email" required error={form.formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
      </Field>
      <Turnstile onToken={setToken} />
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
        Send reset link
      </Button>
      <Link href="/login" className="text-center text-sm font-semibold text-primary hover:underline">
        Back to log in
      </Link>
    </form>
  );
}
