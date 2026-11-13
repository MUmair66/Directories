"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { replyToTicket, updatePricingLead, updateTicket } from "@/app/actions/admin/tickets";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/primitives";
import { RichTextEditor } from "@/components/forms/rich-text-editor";

export function TicketControls({ ticketId, status, priority, assignedTo, staff }: { ticketId: string; status: string; priority: string; assignedTo: string | null; staff: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const change = (patch: Parameters<typeof updateTicket>[0]) =>
    start(async () => {
      const res = await updateTicket(patch);
      if (res.ok) {
        if (res.message) toast.success(res.message);
        router.refresh();
      } else toast.error(res.message);
    });
  return (
    <div className="grid gap-4" aria-busy={pending}>
      <Field label="Status" htmlFor="tk-status">
        <NativeSelect id="tk-status" defaultValue={status} disabled={pending} onChange={(e) => change({ ticketId, status: e.target.value as "open" })}>
          <option value="open">Open</option>
          <option value="awaiting_reply">Awaiting reply</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </NativeSelect>
      </Field>
      <Field label="Priority" htmlFor="tk-priority">
        <NativeSelect id="tk-priority" defaultValue={priority} disabled={pending} onChange={(e) => change({ ticketId, priority: e.target.value as "low" })}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </NativeSelect>
      </Field>
      <Field label="Assigned to" htmlFor="tk-assign">
        <NativeSelect id="tk-assign" defaultValue={assignedTo ?? ""} disabled={pending} onChange={(e) => change({ ticketId, assignedTo: e.target.value || null })}>
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
}

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const [body, setBody] = useState("");
  const [text, setText] = useState("");
  const [resolve, setResolve] = useState(false);
  const [error, setError] = useState<string>();
  const [key, setKey] = useState(0);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim().length < 2) {
          setError("Write a reply");
          return;
        }
        start(async () => {
          const res = await replyToTicket({ ticketId, body, status: resolve ? "resolved" : "awaiting_reply" });
          if (!res.ok) {
            setError(res.fieldErrors?.body);
            toast.error(res.message);
            return;
          }
          toast.success(res.message);
          setBody("");
          setText("");
          setError(undefined);
          setKey((k) => k + 1);
          router.refresh();
        });
      }}
    >
      <Field label="Reply" htmlFor="tk-reply" error={error} help="The user gets an email and an in-app notification.">
        <RichTextEditor
          key={key}
          id="tk-reply"
          value=""
          headings={false}
          minHeight={140}
          invalid={!!error}
          onChange={(html, t) => {
            setBody(html);
            setText(t);
          }}
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={resolve} onChange={(e) => setResolve(e.target.checked)} />
          Mark as resolved after sending
        </label>
        <Button type="submit" loading={pending}>
          Send reply
        </Button>
      </div>
    </form>
  );
}

export function LeadStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <label htmlFor={`lead-${id}`} className="sr-only">
        Lead status
      </label>
      <NativeSelect
        id={`lead-${id}`}
        defaultValue={status}
        disabled={pending}
        className="h-8 w-32 text-xs"
        onChange={(e) =>
          start(async () => {
            const res = await updatePricingLead({ id, status: e.target.value as "new" });
            if (res.ok) {
              toast.success(res.message ?? "Updated");
              router.refresh();
            } else toast.error(res.message);
          })
        }
      >
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="closed">Closed</option>
      </NativeSelect>
    </>
  );
}
