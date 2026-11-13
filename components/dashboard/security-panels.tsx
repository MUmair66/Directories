"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Laptop, LogOut, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { setNotifyPrefs } from "@/app/actions/dashboard/engagement";
import { Button } from "@/components/ui/button";
import { Badge, Card, Field, Input, Skeleton } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { handleResult, LocalDate } from "@/components/dashboard/helpers";
import { cn } from "@/lib/utils";

/* ── Password ──────────────────────────────────────────────────── */

export function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(4, score);
  return { level, label: ["Too weak", "Weak", "Fair", "Good", "Strong"][level]! };
}

export function PasswordPanel({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revoke, setRevoke] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const strength = passwordStrength(next);

  if (!hasPassword) {
    return (
      <Card className="p-6">
        <h2 className="font-bold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">You sign in with Google. To add a password, use “Forgot password” on the login page.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-bold">Change password</h2>
      <form
        className="grid max-w-md gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (next.length < 8) return setError("New password must be at least 8 characters.");
          if (next !== confirm) return setError("Passwords don't match.");
          if (strength.level < 2) return setError("Choose a stronger password.");
          start(async () => {
            const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: revoke });
            if (error) return setError(error.message ?? "Couldn't change password.");
            toast.success("Password changed");
            setCurrent("");
            setNext("");
            setConfirm("");
          });
        }}
      >
        <Field label="Current password" htmlFor="pw-current" required>
          <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="New password" htmlFor="pw-new" required help="At least 8 characters. Mix upper and lower case, numbers and symbols.">
          <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required aria-describedby="pw-strength" />
        </Field>
        {next && (
          <div id="pw-strength" aria-live="polite">
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < strength.level ? (strength.level <= 1 ? "bg-danger" : strength.level === 2 ? "bg-amber-500" : "bg-success") : "bg-muted")} />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Strength: {strength.label}</p>
          </div>
        )}
        <Field label="Confirm new password" htmlFor="pw-confirm" required error={confirm && confirm !== next ? "Passwords don't match" : undefined}>
          <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={revoke} onCheckedChange={setRevoke} aria-label="Log out other devices" /> Log out other devices
        </label>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <Button type="submit" loading={pending} className="w-fit">
          Update password
        </Button>
      </form>
    </Card>
  );
}

/* ── Sessions ──────────────────────────────────────────────────── */

type SessionRow = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date | string; expiresAt: Date | string };

function describeAgent(ua?: string | null) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua) ? "macOS" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : "";
  return { label: `${browser}${os ? ` on ${os}` : ""}`, mobile };
}

export function SessionsPanel({ currentToken }: { currentToken: string }) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const apply = ({ data, error }: Awaited<ReturnType<typeof authClient.listSessions>>) => {
    setFailed(!!error || !data);
    setSessions(error || !data ? [] : (data as SessionRow[]));
  };
  const load = async () => apply(await authClient.listSessions());
  useEffect(() => {
    let live = true;
    authClient.listSessions().then((r) => live && apply(r));
    return () => {
      live = false;
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Active sessions</h2>
        <Button
          variant="outline"
          size="sm"
          loading={pending}
          disabled={!sessions || sessions.length <= 1}
          onClick={() =>
            start(async () => {
              const { error } = await authClient.revokeOtherSessions();
              if (error) toast.error(error.message ?? "Couldn't log out other devices.");
              else {
                toast.success("Logged out of all other devices");
                await load();
              }
            })
          }
        >
          <LogOut /> Log out other devices
        </Button>
      </div>
      {sessions === null ? (
        <div className="grid gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : failed ? (
        <p className="text-sm text-danger">
          Couldn&apos;t load sessions.{" "}
          <button type="button" className="font-semibold underline" onClick={load}>
            Try again
          </button>
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((s) => {
            const d = describeAgent(s.userAgent);
            const current = s.token === currentToken;
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                {d.mobile ? <Smartphone className="size-5 text-muted-foreground" aria-hidden /> : <Laptop className="size-5 text-muted-foreground" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {d.label} {current && <Badge tone="success" className="ml-1">This device</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress ? `${s.ipAddress} · ` : ""}Signed in <LocalDate value={s.createdAt} withTime />
                  </p>
                </div>
                {!current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      start(async () => {
                        const { error } = await authClient.revokeSession({ token: s.token });
                        if (error) toast.error(error.message ?? "Couldn't log out that device.");
                        else await load();
                      })
                    }
                  >
                    Log out
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}


export function NotifyPanel({ prefs }: { prefs: { review: boolean; lead: boolean; ticket: boolean; listingStatus: boolean } }) {
  const [value, setValue] = useState(prefs);
  const [, start] = useTransition();
  const rows = [
    ["review", "New review", "When a customer reviews one of your businesses."],
    ["lead", "New lead", "When someone sends you a message from your business profile."],
    ["ticket", "Ticket reply", "When our support team replies to your ticket."],
    ["listingStatus", "Listing status change", "When a listing is approved, rejected or needs changes."],
  ] as const;
  return (
    <Card className="p-6" id="notifications">
      <h2 className="mb-1 font-bold">Email notifications</h2>
      <p className="mb-4 text-sm text-muted-foreground">In-app notifications are always on.</p>
      <ul className="divide-y divide-border">
        {rows.map(([key, title, desc]) => (
          <li key={key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
            <Switch
              checked={value[key]}
              aria-label={title}
              onCheckedChange={(v) => {
                const next = { ...value, [key]: v };
                setValue(next);
                start(async () => {
                  const res = handleResult(await setNotifyPrefs(next), { success: "Saved" });
                  if (!res.ok) setValue(value);
                });
              }}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── Delete account ────────────────────────────────────────────── */

export function DeleteAccountPanel({ hasPassword }: { hasPassword: boolean }) {
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="border-red-200 p-6 dark:border-red-900">
      <h2 className="font-bold text-danger">Delete account</h2>
      <p className="mt-1 text-sm text-muted-foreground">Permanently deletes your account, favorites, reviews and tickets. Your businesses become unclaimed listings. This can&apos;t be undone.</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-4">
            <Trash2 /> Delete my account
          </Button>
        </DialogTrigger>
        <DialogContent title="Delete your account?" description='Type DELETE to confirm. This permanently removes your account.'>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                setError(null);
                const { error } = await authClient.deleteUser(hasPassword ? { password, callbackURL: "/" } : { callbackURL: "/" });
                if (error) return setError(error.message ?? "Couldn't delete your account.");
                toast.success(hasPassword ? "Your account was deleted." : "Check your email to confirm deletion.");
                window.location.href = "/";
              });
            }}
          >
            <Field label='Type "DELETE"' htmlFor="del-typed" required>
              <Input id="del-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </Field>
            {hasPassword && (
              <Field label="Password" htmlFor="del-password" required>
                <Input id="del-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            )}
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <Button type="submit" variant="destructive" loading={pending} disabled={typed !== "DELETE" || (hasPassword && !password)}>
              Permanently delete
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
