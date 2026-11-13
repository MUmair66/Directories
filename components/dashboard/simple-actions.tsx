"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, HeartOff } from "lucide-react";
import { markNotificationsRead, removeFavorite } from "@/app/actions/dashboard/engagement";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays";
import { handleResult } from "@/components/dashboard/helpers";

export function RemoveFavoriteButton({ businessId, name }: { businessId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          <HeartOff /> Remove
        </Button>
      }
      title={`Remove ${name} from favorites?`}
      description="You can save it again from its profile page."
      confirmLabel="Remove"
      onConfirm={async () => {
        if (handleResult(await removeFavorite({ businessId })).ok) router.refresh();
      }}
    />
  );
}

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={disabled}
      loading={pending}
      onClick={() =>
        start(async () => {
          if (handleResult(await markNotificationsRead({})).ok) router.refresh();
        })
      }
    >
      <CheckCheck /> Mark all as read
    </Button>
  );
}
