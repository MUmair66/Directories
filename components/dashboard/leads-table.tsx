"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { setLeadStatus, setNotifyPrefs } from "@/app/actions/dashboard/engagement";
import { formatPhone, telHref } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/overlays";
import { Checkbox, Switch } from "@/components/ui/controls";
import { Badge, NativeSelect } from "@/components/ui/primitives";
import { LeadStatusBadge } from "@/components/dashboard/badges";
import { handleResult, LocalDate } from "@/components/dashboard/helpers";

export type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: "message" | "landing_page" | "pricing" | "api";
  status: "new" | "contacted" | "closed";
  createdAt: string;
  businessName: string;
};

const SOURCE: Record<LeadRow["source"], string> = { message: "Profile message", landing_page: "Landing page", pricing: "Pricing", api: "API" };

export function LeadsTable({ leads, notify }: { leads: LeadRow[]; notify: { review: boolean; lead: boolean; ticket: boolean; listingStatus: boolean } }) {
  const router = useRouter();
  const [open, setOpen] = useState<LeadRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [emailOn, setEmailOn] = useState(notify.lead);

  const update = (ids: string[], status: LeadRow["status"]) =>
    start(async () => {
      const res = handleResult(await setLeadStatus({ leadIds: ids, status }));
      if (res.ok) {
        setSelected([]);
        if (open && ids.includes(open.id)) setOpen({ ...open, status });
        router.refresh();
      }
    });

  const all = selected.length === leads.length && leads.length > 0;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={emailOn}
            onCheckedChange={(v) => {
              setEmailOn(v);
              start(async () => {
                handleResult(await setNotifyPrefs({ ...notify, lead: v }), { success: v ? "Email alerts on for new leads" : "Email alerts off for new leads" });
              });
            }}
            aria-label="Email me when I get a new lead"
          />
          Email me when I get a new lead
        </label>
        {selected.length > 0 && (
          <div className="flex items-center gap-2" role="group" aria-label="Bulk actions">
            <span className="text-sm text-muted-foreground">{selected.length} selected</span>
            <Button size="sm" variant="outline" onClick={() => update(selected, "contacted")} disabled={pending}>
              Mark contacted
            </Button>
            <Button size="sm" variant="outline" onClick={() => update(selected, "closed")} disabled={pending}>
              Mark closed
            </Button>
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 px-4 py-3">
                <Checkbox checked={all} onCheckedChange={(v) => setSelected(v ? leads.map((l) => l.id) : [])} aria-label="Select all leads" />
              </th>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Business</th>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Contact</th>
              <th scope="col" className="px-4 py-3">Message</th>
              <th scope="col" className="px-4 py-3">Source</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((l) => (
              <tr key={l.id} className={l.status === "new" ? "bg-secondary/40" : undefined}>
                <td className="px-4 py-3">
                  <Checkbox checked={selected.includes(l.id)} onCheckedChange={(v) => setSelected((s) => (v ? [...s, l.id] : s.filter((x) => x !== l.id)))} aria-label={`Select lead from ${l.name}`} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground"><LocalDate value={l.createdAt} /></td>
                <td className="max-w-40 truncate px-4 py-3">{l.businessName}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setOpen(l)} className="font-semibold text-primary hover:underline">
                    {l.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="grid">
                    {l.phone && <span>{formatPhone(l.phone)}</span>}
                    {l.email && <span className="max-w-48 truncate">{l.email}</span>}
                  </div>
                </td>
                <td className="max-w-64 px-4 py-3 text-muted-foreground">
                  <span className="line-clamp-2">{l.message}</span>
                </td>
                <td className="px-4 py-3"><Badge tone="outline">{SOURCE[l.source]}</Badge></td>
                <td className="px-4 py-3"><LeadStatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {leads.map((l) => (
          <li key={l.id}>
            <button type="button" onClick={() => setOpen(l)} className="w-full rounded-lg border border-border bg-card p-4 text-left shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{l.name}</span>
                <LeadStatusBadge status={l.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {l.businessName} · <LocalDate value={l.createdAt} />
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{l.message}</p>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <SheetContent side="right" title={`Lead from ${open.name}`}>
            <div className="grid gap-5 p-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Business</dt>
                <dd>{open.businessName}</dd>
                <dt className="text-muted-foreground">Received</dt>
                <dd><LocalDate value={open.createdAt} withTime /></dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd>{SOURCE[open.source]}</dd>
                {open.email && (
                  <>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="break-all">{open.email}</dd>
                  </>
                )}
                {open.phone && (
                  <>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>{formatPhone(open.phone)}</dd>
                  </>
                )}
              </dl>
              <div>
                <p className="mb-1 text-sm font-medium">Message</p>
                <p className="whitespace-pre-line rounded-md bg-surface p-3 text-sm">{open.message || "—"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {open.phone && (
                  <Button asChild variant="outline">
                    <a href={telHref(open.phone)}>
                      <Phone /> Call
                    </a>
                  </Button>
                )}
                {open.email && (
                  <Button asChild variant="outline">
                    <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: your message to ${open.businessName}`)}`}>
                      <Mail /> Email
                    </a>
                  </Button>
                )}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="lead-status" className="text-sm font-medium">
                  Status
                </label>
                <NativeSelect id="lead-status" value={open.status} onChange={(e) => update([open.id], e.target.value as LeadRow["status"])} disabled={pending}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </NativeSelect>
              </div>
            </div>
          </SheetContent>
        )}
      </Dialog>
    </div>
  );
}
