"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { resetSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";
import { PasswordInput, StrengthMeter } from "@/components/auth/auth-ui";

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const invalid = params.get("error") === "INVALID_TOKEN" || !token;
  const [done, setDone] = useState(false);
  const form = useForm<z.input<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const errors = form.formState.errors;

  if (invalid) {
    return (
      <div className="grid gap-4 text-center">
        <TriangleAlert className="mx-auto size-12 text-amber-500" aria-hidden />
        <h1 className="text-2xl font-bold">This link has expired</h1>
        <p className="text-muted-foreground">Password reset links work once and expire after 1 hour.</p>
        <Button asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="grid gap-4 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">Password updated</h1>
        <p className="text-muted-foreground">You can now log in with your new password.</p>
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    if (error) form.setError("password", { message: "This reset link is invalid or expired. Request a new one." });
    else setDone(true);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div>
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        <p className="mt-1 text-muted-foreground">Use at least 8 characters with letters and a number.</p>
      </div>
      <Field label="New password" htmlFor="password" required error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
      </Field>
      <StrengthMeter password={form.watch("password") ?? ""} />
      <Field label="Confirm password" htmlFor="confirm" required error={errors.confirm?.message}>
        <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!errors.confirm} {...form.register("confirm")} />
      </Field>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
