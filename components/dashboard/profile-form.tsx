"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { profileSchema } from "@/lib/validations/business";
import { checkUsername, setProfilePhoto, updateProfile } from "@/app/actions/dashboard/account";
import { authClient } from "@/lib/auth-client";
import { uploadFile } from "@/components/forms/upload";
import { initials } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, NativeSelect } from "@/components/ui/primitives";
import { handleResult, useUnsavedWarning } from "@/components/dashboard/helpers";

type Values = z.input<typeof profileSchema>;

export function ProfileForm({ defaults, email, photoUrl, states }: { defaults: Values; email: string; photoUrl: string | null; states: { code: string; name: string }[] }) {
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(profileSchema), defaultValues: defaults, mode: "onTouched" });
  const { register, handleSubmit, formState, watch, reset, setError } = form;
  const [pending, start] = useTransition();
  const [photo, setPhoto] = useState(photoUrl);
  const [uploading, setUploading] = useState(false);
  const [userState, setUserState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [newEmail, setNewEmail] = useState("");
  const [emailPending, startEmail] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const username = watch("username");
  useUnsavedWarning(formState.isDirty);

  useEffect(() => {
    if (!username || username.length < 3 || username.toLowerCase() === defaults.username.toLowerCase()) return setUserState("idle");
    setUserState("checking");
    const t = setTimeout(async () => {
      const res = await checkUsername({ username });
      setUserState(res.ok && res.data?.available ? "ok" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [username, defaults.username]);

  const onPhoto = async (file: File) => {
    setUploading(true);
    try {
      const { key } = await uploadFile(file, { kind: "image", scope: "avatar" });
      const res = handleResult(await setProfilePhoto({ key }));
      if (res.ok && res.data) {
        setPhoto(res.data.url);
        router.refresh();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const e = formState.errors;
  return (
    <div className="grid gap-6">
      <Card className="flex flex-wrap items-center gap-5 p-6">
        <div className="relative size-24 overflow-hidden rounded-full bg-primary text-3xl font-bold text-white">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Your profile photo" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center" aria-hidden>
              {initials(`${defaults.firstName} ${defaults.lastName}`.trim() || email)}
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/50" role="status" aria-label="Uploading">
              <Loader2 className="size-6 animate-spin" />
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <p className="font-semibold">Profile photo</p>
          <p className="text-sm text-muted-foreground">Square images work best. We crop to a circle and convert to WebP.</p>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Upload profile photo" onChange={(ev) => ev.target.files?.[0] && onPhoto(ev.target.files[0])} />
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Camera /> {photo ? "Change photo" : "Upload photo"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <form
          noValidate
          className="grid gap-5"
          onSubmit={handleSubmit((values) =>
            start(async () => {
              if (userState === "taken") return void setError("username", { message: "That username is taken" });
              const res = handleResult(await updateProfile(values), { setError });
              if (res.ok) {
                reset(values);
                router.refresh();
              }
            }),
          )}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName" required error={e.firstName?.message}>
              <Input id="firstName" autoComplete="given-name" {...register("firstName")} />
            </Field>
            <Field label="Last name" htmlFor="lastName" required error={e.lastName?.message}>
              <Input id="lastName" autoComplete="family-name" {...register("lastName")} />
            </Field>
            <Field label="Username" htmlFor="username" required error={e.username?.message ?? (userState === "taken" ? "That username is taken" : undefined)}>
              <div className="relative">
                <Input id="username" autoComplete="username" className="pr-10" aria-invalid={userState === "taken" || !!e.username} {...register("username")} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-live="polite">
                  {userState === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Checking" />}
                  {userState === "ok" && <CheckCircle2 className="size-4 text-success" aria-label="Available" />}
                  {userState === "taken" && <XCircle className="size-4 text-danger" aria-label="Taken" />}
                </span>
              </div>
            </Field>
            <Field label="Gender" htmlFor="gender" error={e.gender?.message}>
              <NativeSelect id="gender" {...register("gender")}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </NativeSelect>
            </Field>
            <Field label="Secondary email" htmlFor="email2" error={e.email2?.message}>
              <Input id="email2" type="email" {...register("email2")} />
            </Field>
            <Field label="Phone" htmlFor="phone" required error={e.phone?.message}>
              <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
            </Field>
            <Field label="Country" htmlFor="country" required error={e.country?.message}>
              <NativeSelect id="country" autoComplete="country-name" {...register("country")}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="MX">Mexico</option>
                <option value="Other">Other</option>
              </NativeSelect>
            </Field>
            <Field label="State" htmlFor="state" error={e.state?.message}>
              <NativeSelect id="state" autoComplete="address-level1" {...register("state")}>
                <option value="">Select</option>
                {states.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="City" htmlFor="city" error={e.city?.message}>
              <Input id="city" autoComplete="address-level2" {...register("city")} />
            </Field>
            <Field label="ZIP code" htmlFor="zip" error={e.zip?.message}>
              <Input id="zip" autoComplete="postal-code" inputMode="numeric" {...register("zip")} />
            </Field>
            <Field label="Address" htmlFor="address" error={e.address?.message} className="sm:col-span-2">
              <Input id="address" autoComplete="street-address" {...register("address")} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pending} disabled={!formState.isDirty}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>

      <Card className="grid gap-4 p-6">
        <div>
          <h2 className="font-bold">Primary email</h2>
          <p className="text-sm text-muted-foreground">
            Currently <strong>{email}</strong>. Changing it requires confirming the new address.
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            startEmail(async () => {
              const { error } = await authClient.changeEmail({ newEmail, callbackURL: "/dashboard/profile?email=changed" });
              if (error) toast.error(error.message ?? "Couldn't change email.");
              else {
                toast.success(`Check ${newEmail} for a confirmation link.`);
                setNewEmail("");
              }
            });
          }}
        >
          <Field label="New email" htmlFor="newEmail" className="min-w-64 flex-1">
            <Input id="newEmail" type="email" autoComplete="email" value={newEmail} onChange={(ev) => setNewEmail(ev.target.value)} required />
          </Field>
          <Button type="submit" variant="outline" loading={emailPending} disabled={!newEmail.includes("@")}>
            Change email
          </Button>
        </form>
      </Card>
    </div>
  );
}
