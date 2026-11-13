"use client";
import { useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { getDocumentUrl } from "@/app/actions/admin/moderation";

/** Opens a private R2 document through a 5-minute signed URL. */
export function DocumentLink({ kind, id, name }: { kind: "claim" | "verification"; id: string; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const win = window.open("", "_blank");
        const res = await getDocumentUrl({ kind, id });
        setBusy(false);
        if (!res.ok || !res.data) {
          win?.close();
          toast.error(res.ok ? "Could not open document." : res.message);
          return;
        }
        if (win) win.location.href = res.data.url;
        else window.location.href = res.data.url;
      }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary disabled:opacity-60"
    >
      <FileText className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{busy ? "Opening…" : name}</span>
    </button>
  );
}
