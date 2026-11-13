"use client";
import { useState } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { track } from "@/lib/track";
import { formatPhone, telHref } from "@/lib/text";
import { cn } from "@/lib/utils";
import { MessageDialog } from "@/components/business/message-dialog";

/** Phone + "Send message" actions on a search result row. The message form mounts on first open. */
export function ResultActions({ businessId, name, phone, className }: { businessId: string; name: string; phone: string | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chip =
    "relative z-10 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-semibold transition-colors hover:border-primary/50 hover:bg-secondary hover:text-secondary-foreground";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {phone && (
        <a href={telHref(phone)} onClick={() => track(businessId, "call_click")} className={chip} aria-label={`Call ${name} at ${formatPhone(phone)}`}>
          <Phone className="size-4 text-primary" aria-hidden />
          <span className="tabular-nums">{formatPhone(phone)}</span>
        </a>
      )}
      <button
        type="button"
        className={chip}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        aria-label={`Send a message to ${name}`}
      >
        <MessageSquare className="size-4 text-primary" aria-hidden />
        Send message
      </button>
      {mounted && <MessageDialog open={open} onOpenChange={setOpen} businessId={businessId} businessName={name} />}
    </div>
  );
}
