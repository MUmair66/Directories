"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, Copy, ExternalLink, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { deleteBusiness, duplicateBusiness, restoreBusiness } from "@/app/actions/dashboard/businesses";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { handleResult } from "@/components/dashboard/helpers";
import { VerifyDialog } from "./verify-dialog";

export type ActionBusiness = { id: string; name: string; slug: string; status: string; verificationStatus: string; phone: string | null; email: string | null; deletedAt: string | null; wizardStep: number };

export function BusinessActions({ b }: { b: ActionBusiness }) {
  const router = useRouter();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, start] = useTransition();

  if (b.deletedAt) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          start(async () => {
            if (handleResult(await restoreBusiness({ businessId: b.id })).ok) router.refresh();
          })
        }
      >
        <RotateCcw /> Restore
      </Button>
    );
  }
  const editHref = b.status === "draft" ? `/dashboard/businesses/new?id=${b.id}&step=${Math.min(6, Math.max(1, b.wizardStep))}` : `/dashboard/businesses/${b.id}/edit`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${b.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {b.status === "approved" && (
            <DropdownMenuItem asChild>
              <a href={`/biz/${b.slug}`} target="_blank" rel="noopener">
                <ExternalLink /> View public page
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <Pencil /> {b.status === "draft" ? "Continue setup" : "Edit"}
            </Link>
          </DropdownMenuItem>
          {b.verificationStatus !== "verified" && b.status !== "draft" && (
            <DropdownMenuItem onSelect={() => setVerifyOpen(true)}>
              <BadgeCheck /> Verify
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() =>
              start(async () => {
                const res = handleResult(await duplicateBusiness({ businessId: b.id }));
                if (res.ok && res.data) router.push(`/dashboard/businesses/new?id=${res.data.id}&step=1`);
              })
            }
          >
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <VerifyDialog open={verifyOpen} onOpenChange={setVerifyOpen} business={b} />
      {deleteOpen && (
        <DeleteConfirm
          name={b.name}
          onClose={() => setDeleteOpen(false)}
          onConfirm={async () => {
            if (handleResult(await deleteBusiness({ businessId: b.id })).ok) router.refresh();
          }}
        />
      )}
    </>
  );
}

/** Controlled confirm dialog opened from a menu item. */
export function DeleteConfirm({ name, onClose, onConfirm, description }: { name: string; onClose: () => void; onConfirm: () => Promise<void>; description?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent title={`Delete ${name}?`} description={description ?? "The listing is removed from the directory right away. You can restore it from My Businesses for 30 days, then it's permanently deleted."}>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
              } finally {
                setPending(false);
                onClose();
              }
            }}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
