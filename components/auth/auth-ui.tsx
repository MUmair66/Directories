"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { passwordStrength } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className={cn("pr-10", props.className)} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-danger", "bg-danger", "bg-amber-500", "bg-primary", "bg-success"];

export function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordStrength(password);
  return (
    <div className="grid gap-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < score ? COLORS[score] : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Strength: {LABELS[score]}</p>
    </div>
  );
}

export function GoogleButton({ callbackURL, label = "Continue with Google" }: { callbackURL: string; label?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await authClient.signIn.social({ provider: "google", callbackURL, newUserCallbackURL: "/dashboard/welcome", errorCallbackURL: "/login?error=google" });
        setPending(false);
        if (error) toast.error("Google sign-in isn't available right now. Please use email and password.");
      }}
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12Z" />
      </svg>
      {label}
    </Button>
  );
}

export function Divider() {
  return (
    <div className="relative my-1 text-center text-xs uppercase text-muted-foreground">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
      <span className="relative bg-background px-3">or</span>
    </div>
  );
}

/** Only allow same-site relative redirect targets. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
