"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { registerSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Field, Input, Label } from "@/components/ui/primitives";
import { Turnstile } from "@/components/forms/turnstile";
import { Divider, GoogleButton, PasswordInput, StrengthMeter, safeNext } from "@/components/auth/auth-ui";

type Values = z.input<typeof registerSchema>;

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/dashboard/welcome");
  const router = useRouter();
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const form = useForm<Values>({ resolver: zodResolver(registerSchema), defaultValues: { firstName: "", lastName: "", email: "", password: "", acceptTerms: false as unknown as true } });
  const errors = form.formState.errors;
  const password = form.watch("password") ?? "";

  const onSubmit = form.handleSubmit(async (v) => {
    const { error } = await authClient.signUp.email({
      email: v.email,
      password: v.password,
      name: `${v.firstName} ${v.lastName}`.trim(),
      firstName: v.firstName,
      lastName: v.lastName,
      fetchOptions: { headers: token ? { "x-captcha-response": token } : {} },
    });
    if (error) {
      setResetKey((k) => k + 1);
      if (error.code === "USER_ALREADY_EXISTS" || error.status === 422) form.setError("email", { message: "An account with this email already exists. Try logging in." });
      else toast.error(error.message ?? "We couldn't create your account. Please try again.");
      return;
    }
    // Signed in immediately: go straight to onboarding (or the page they came from).
    router.push(next);
    router.refresh();
  });


  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Create your free account</h1>
        <p className="mt-1 text-muted-foreground">
          Already have an account?{" "}
          <Link href={`/login${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
      {googleEnabled && (
        <>
          <GoogleButton callbackURL={next} label="Sign up with Google" />
          <Divider />
        </>
      )}
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" required error={errors.firstName?.message}>
            <Input id="firstName" autoComplete="given-name" aria-invalid={!!errors.firstName} {...form.register("firstName")} />
          </Field>
          <Field label="Last name" htmlFor="lastName" required error={errors.lastName?.message}>
            <Input id="lastName" autoComplete="family-name" aria-invalid={!!errors.lastName} {...form.register("lastName")} />
          </Field>
        </div>
        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" required error={errors.password?.message} help="At least 8 characters with letters and a number.">
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
        </Field>
        <StrengthMeter password={password} />
        <div className="grid gap-1">
          <div className="flex items-start gap-2.5">
            <Checkbox id="acceptTerms" checked={!!form.watch("acceptTerms")} onCheckedChange={(v) => form.setValue("acceptTerms", (v === true) as true, { shouldValidate: true })} aria-invalid={!!errors.acceptTerms} />
            <Label htmlFor="acceptTerms" className="font-normal leading-snug">
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="font-medium text-primary underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="font-medium text-primary underline">
                Privacy Policy
              </Link>
            </Label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-danger" role="alert">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>
        <Turnstile onToken={setToken} resetKey={resetKey} />
        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          Create account
        </Button>
      </form>
    </div>
  );
}
