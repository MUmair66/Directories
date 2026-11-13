"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Field, Input, Label } from "@/components/ui/primitives";
import { Turnstile } from "@/components/forms/turnstile";
import { Divider, GoogleButton, PasswordInput, safeNext } from "@/components/auth/auth-ui";

type Values = z.input<typeof loginSchema>;

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("next");
  const next = safeNext(requested);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "", rememberMe: true } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    const headers = token ? { "x-captcha-response": token } : {};
    const isEmail = v.identifier.includes("@");
    const { data, error } = isEmail
      ? await authClient.signIn.email({ email: v.identifier, password: v.password, rememberMe: v.rememberMe, fetchOptions: { headers } })
      : await authClient.signIn.username({ username: v.identifier, password: v.password, rememberMe: v.rememberMe, fetchOptions: { headers } });
    if (error) {
      setResetKey((k) => k + 1);
      if (error.status === 429) toast.error("Too many attempts. Wait a minute and try again.");
      else form.setError("password", { message: "Incorrect email/username or password" });
      return;
    }
    // Each role has its own dashboard: admins/editors → /admin/dashboard, everyone else → /dashboard.
    let target = next;
    if (!requested) {
      // The sign-in response carries the user (with role); fall back to a fresh session read.
      let role = (data as { user?: { role?: string } } | null)?.user?.role;
      if (!role) {
        const { data: session } = await authClient.getSession({ query: { disableCookieCache: true } });
        role = (session?.user as { role?: string } | undefined)?.role;
      }
      if (role === "admin" || role === "editor") target = "/admin/dashboard";
    }
    router.push(target);
    router.refresh();
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="mt-1 text-muted-foreground">
          New here?{" "}
          <Link href={`/register${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="font-semibold text-primary hover:underline">
            Create a free account
          </Link>
        </p>
      </div>
      {params.get("error") === "google" && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200" role="alert">Google sign-in didn&apos;t complete. Please try again.</p>}
      {googleEnabled && (
        <>
          <GoogleButton callbackURL={next} />
          <Divider />
        </>
      )}
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <Field label="Email or username" htmlFor="identifier" required error={errors.identifier?.message}>
          <Input id="identifier" autoComplete="username" aria-invalid={!!errors.identifier} {...form.register("identifier")} />
        </Field>
        <Field label="Password" htmlFor="password" required error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register("password")} />
        </Field>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox id="rememberMe" checked={!!form.watch("rememberMe")} onCheckedChange={(v) => form.setValue("rememberMe", v === true)} />
            <Label htmlFor="rememberMe" className="font-normal">
              Remember me
            </Label>
          </div>
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Turnstile onToken={setToken} resetKey={resetKey} />
        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          Log in
        </Button>
      </form>
    </div>
  );
}
