"use client";
import { useState } from "react";
import { MessageDialog } from "./message-dialog";

/** Email is never shown publicly; visitors contact the business through the message form. */
export function MessageButton({ businessId, name }: { businessId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="font-semibold text-primary hover:underline">
        Send an email message
      </button>
      <MessageDialog open={open} onOpenChange={setOpen} businessId={businessId} businessName={name} />
    </>
  );
}
