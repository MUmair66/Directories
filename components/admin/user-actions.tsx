"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, UserCog } from "lucide-react";
import { banUser, impersonateUser, setUserRole, unbanUser } from "@/app/actions/admin/users";
import { ASSIGNABLE_ROLES } from "@/app/actions/admin/schemas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/primitives";
import { ActionButton } from "./action-button";

export function RoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled?: boolean }) {
  const [value, setValue] = useState(role);
  const [pending, start] = useTransition();
  const router = useRouter();
  // Admin accounts are fixed (managed in the database); show the role without a picker.
  if (role === "admin") return <span className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-xs font-semibold text-secondary-foreground">Admin</span>;
  return (
    <>
      <label htmlFor={`role-${userId}`} className="sr-only">
        Role
      </label>
      <NativeSelect
        id={`role-${userId}`}
        value={value}
        disabled={disabled || pending}
        className="h-8 w-28 text-xs"
        onChange={(e) => {
          const next = e.target.value as (typeof ASSIGNABLE_ROLES)[number];
          const prev = value;
          setValue(next);
          start(async () => {
            const res = await setUserRole({ userId, role: next });
            if (res.ok) {
              toast.success(res.message);
              router.refresh();
            } else {
              setValue(prev);
              toast.error(res.message);
            }
          });
        }}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {r[0]!.toUpperCase() + r.slice(1)}
          </option>
        ))}
      </NativeSelect>
    </>
  );
}

export function BanControls({ userId, name, banned }: { userId: string; name: string; banned: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (banned) {
    return (
      <ActionButton size="sm" variant="outline" action={unbanUser} input={{ userId }}>
        Unban
      </ActionButton>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Ban aria-hidden /> Ban
        </Button>
      </DialogTrigger>
      <DialogContent title={`Ban ${name}`} description="Banned users are signed out and can't log in until unbanned or the ban expires.">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await banUser({ userId, reason, days: days ? Number(days) : undefined });
              if (res.ok) {
                toast.success(res.message);
                setOpen(false);
                router.refresh();
              } else toast.error(res.message);
            });
          }}
        >
          <Field label="Reason" htmlFor={`ban-reason-${userId}`} required>
            <Textarea id={`ban-reason-${userId}`} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} rows={3} />
          </Field>
          <Field label="Duration in days" htmlFor={`ban-days-${userId}`} help="Leave empty for a permanent ban.">
            <Input id={`ban-days-${userId}`} type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={pending}>
              Ban user
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ImpersonateButton({ userId, name }: { userId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      title={`View the site as ${name}`}
      onClick={() =>
        start(async () => {
          const res = await impersonateUser({ userId });
          if (!res.ok) {
            toast.error(res.message);
            return;
          }
          toast.success(res.message);
          // Full reload so every component picks up the impersonated session cookie.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/dashboard";
        })
      }
    >
      <UserCog aria-hidden /> Impersonate
    </Button>
  );
}
