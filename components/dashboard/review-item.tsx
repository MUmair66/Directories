"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, MessageSquareReply, Pencil, Trash2 } from "lucide-react";
import { deleteReply, replyToReview, reportReviewToAdmin } from "@/app/actions/dashboard/engagement";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Field, Textarea } from "@/components/ui/primitives";
import { Stars } from "@/components/listing/stars";
import { handleResult, LocalDate } from "@/components/dashboard/helpers";

export type OwnerReview = {
  id: string;
  rating: number;
  body: string;
  status: string;
  createdAt: string;
  businessName: string;
  businessSlug: string;
  authorName: string;
  replyBody: string | null;
  replyAt: string | null;
};

export function ReviewItem({ r }: { r: OwnerReview }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(r.replyBody ?? "");
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const submit = () =>
    start(async () => {
      const res = handleResult(await replyToReview({ reviewId: r.id, body: reply }));
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    });

  return (
    <li className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Stars rating={r.rating} size={16} />
            <span className="text-sm font-semibold">{r.authorName}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {r.businessName} · <LocalDate value={r.createdAt} />
            {r.status !== "published" && <span className="ml-1 font-medium text-danger">· {r.status}</span>}
          </p>
        </div>
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Flag /> Report to admin
            </Button>
          </DialogTrigger>
          <DialogContent title="Report this review" description="Tell our moderators why this review breaks the guidelines (spam, fake, offensive, not a customer…).">
            <Field label="Reason" htmlFor={`reason-${r.id}`}>
              <Textarea id={`reason-${r.id}`} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            </Field>
            <Button
              loading={pending}
              disabled={reason.trim().length < 5}
              onClick={() =>
                start(async () => {
                  if (handleResult(await reportReviewToAdmin({ reviewId: r.id, reason })).ok) setReportOpen(false);
                })
              }
            >
              Send report
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm">{r.body}</p>

      {editing ? (
        <div className="mt-4 grid gap-2">
          <Field label="Public reply" htmlFor={`reply-${r.id}`} counter={{ value: reply.length, max: 2000 }}>
            <Textarea id={`reply-${r.id}`} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} autoFocus />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} loading={pending} disabled={reply.trim().length < 2}>
              Publish reply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : r.replyBody ? (
        <div className="mt-4 rounded-md border-l-4 border-primary bg-surface p-3">
          <p className="text-xs font-semibold text-muted-foreground">Your public reply</p>
          <p className="mt-1 whitespace-pre-line text-sm">{r.replyBody}</p>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Edit reply
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm">
                  <Trash2 /> Delete reply
                </Button>
              }
              title="Delete your reply?"
              description="Your public reply will be removed from this review."
              onConfirm={async () => {
                if (handleResult(await deleteReply({ reviewId: r.id })).ok) {
                  setReply("");
                  router.refresh();
                }
              }}
            />
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditing(true)}>
          <MessageSquareReply /> Reply publicly
        </Button>
      )}
    </li>
  );
}
