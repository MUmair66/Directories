"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, XCircle } from "lucide-react";
import { replyTicket, setTicketOpen } from "@/app/actions/dashboard/tickets";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { handleResult } from "@/components/dashboard/helpers";
import { AttachmentPicker, type Attachment } from "./attachment-picker";

export function TicketReply({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [pending, start] = useTransition();

  if (closed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">This ticket is closed. Reopen it to send a reply.</p>
        <Button
          variant="outline"
          loading={pending}
          onClick={() =>
            start(async () => {
              if (handleResult(await setTicketOpen({ ticketId, open: true })).ok) router.refresh();
            })
          }
        >
          <RotateCcw /> Reopen ticket
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = handleResult(await replyTicket({ ticketId, body, attachments }));
          if (res.ok) {
            setBody("");
            setText("");
            setAttachments([]);
            setEditorKey((k) => k + 1);
            router.refresh();
          }
        });
      }}
    >
      <label htmlFor="ticket-reply" className="text-sm font-medium">
        Your reply
      </label>
      <RichTextEditor
        key={editorKey}
        id="ticket-reply"
        value={body}
        onChange={(html, t) => {
          setBody(html);
          setText(t);
        }}
        headings={false}
        minHeight={120}
      />
      <AttachmentPicker value={attachments} onChange={setAttachments} />
      <div className="flex flex-wrap justify-between gap-2">
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost">
              <XCircle /> Close ticket
            </Button>
          }
          title="Close this ticket?"
          description="Close it if your issue is solved. You can reopen it later."
          confirmLabel="Close ticket"
          destructive={false}
          onConfirm={async () => {
            if (handleResult(await setTicketOpen({ ticketId, open: false })).ok) router.refresh();
          }}
        />
        <Button type="submit" loading={pending} disabled={text.trim().length < 2}>
          Send reply
        </Button>
      </div>
    </form>
  );
}
