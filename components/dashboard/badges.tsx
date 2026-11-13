import { BadgeCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/primitives";

const BUSINESS: Record<string, { label: string; tone: "default" | "primary" | "success" | "warning" | "danger" }> = {
  draft: { label: "Draft", tone: "default" },
  pending_review: { label: "Pending review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

export function BusinessStatusBadge({ status }: { status: string }) {
  const s = BUSINESS[status] ?? { label: status, tone: "default" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function VerificationBadge({ status }: { status: string }) {
  if (status === "verified")
    return (
      <Badge tone="primary">
        <BadgeCheck /> Verified
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge tone="warning">
        <Clock /> Verification pending
      </Badge>
    );
  return <Badge tone="outline">Unverified</Badge>;
}

const LEAD = { new: "primary", contacted: "warning", closed: "default" } as const;
export function LeadStatusBadge({ status }: { status: keyof typeof LEAD }) {
  return <Badge tone={LEAD[status]} className="capitalize">{status}</Badge>;
}

const TICKET = { open: "primary", awaiting_reply: "warning", resolved: "success", closed: "default" } as const;
export function TicketStatusBadge({ status }: { status: keyof typeof TICKET }) {
  return <Badge tone={TICKET[status]}>{status === "awaiting_reply" ? "Awaiting your reply" : status[0]!.toUpperCase() + status.slice(1)}</Badge>;
}

const PRIORITY = { low: "default", medium: "primary", high: "warning", critical: "danger" } as const;
export function PriorityBadge({ priority }: { priority: keyof typeof PRIORITY }) {
  return <Badge tone={PRIORITY[priority]} className="capitalize">{priority}</Badge>;
}
