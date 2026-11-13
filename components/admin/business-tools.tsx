"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { Check, Download, FileUp, GitMerge, Star, StarOff, Trash2, X } from "lucide-react";
import { deleteBusinesses, importBusinessesBatch, mergeBusinesses, moderateBusinesses, setFeatured, type ImportResult } from "@/app/actions/admin/businesses";
import { IMPORT_COLUMNS } from "@/app/actions/admin/schemas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Field, Input, NativeSelect } from "@/components/ui/primitives";
import { ActionButton } from "./action-button";
import { BulkBar } from "./bulk";

export function BusinessBulkBar() {
  return (
    <BulkBar>
      {(ids, clear) => (
        <>
          <ActionButton size="sm" action={moderateBusinesses} input={{ ids, decision: "approve" as const }} onDone={(r) => r.ok && clear()}>
            <Check aria-hidden /> Approve
          </ActionButton>
          <ActionButton
            size="sm"
            variant="outline"
            action={moderateBusinesses}
            input={{ ids, decision: "reject" as const }}
            reason={{ title: `Reject ${ids.length} listing(s)`, label: "Reason shown to owners", confirmLabel: "Reject", destructive: true }}
            onDone={(r) => r.ok && clear()}
          >
            <X aria-hidden /> Reject
          </ActionButton>
          <ActionButton size="sm" variant="outline" action={setFeatured} input={{ ids, featured: true }} onDone={(r) => r.ok && clear()}>
            <Star aria-hidden /> Feature
          </ActionButton>
          <ActionButton size="sm" variant="outline" action={setFeatured} input={{ ids, featured: false }} onDone={(r) => r.ok && clear()}>
            <StarOff aria-hidden /> Unfeature
          </ActionButton>
          <ActionButton
            size="sm"
            variant="destructive"
            action={deleteBusinesses}
            input={{ ids }}
            confirm={{ title: `Delete ${ids.length} listing(s)?`, description: "Listings are hidden immediately and can be restored for 30 days before they're purged.", confirmLabel: "Delete" }}
            onDone={(r) => r.ok && clear()}
          >
            <Trash2 aria-hidden /> Delete
          </ActionButton>
        </>
      )}
    </BulkBar>
  );
}

export function MergeDialog({ sourceId, sourceName }: { sourceId: string; sourceName: string }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const id = `merge-${sourceId}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Merge ${sourceName} into another listing`}>
          <GitMerge aria-hidden /> Merge
        </Button>
      </DialogTrigger>
      <DialogContent title="Merge duplicate listing" description={`“${sourceName}” will be merged into the listing you choose, then removed. Reviews, leads, photos and stats move over and its URL redirects.`}>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(undefined);
            const res = await mergeBusinesses({ sourceId, targetSlug: slug });
            setPending(false);
            if (!res.ok) {
              setError(res.fieldErrors?.targetSlug ?? res.message);
              return;
            }
            toast.success(res.message);
            setOpen(false);
            router.refresh();
          }}
        >
          <Field label="Keep this listing (slug or URL)" htmlFor={id} error={error} required help="Example: blue-line-plumbing-chicago-il or https://…/biz/blue-line-plumbing-chicago-il">
            <Input id={id} value={slug} onChange={(e) => setSlug(e.target.value)} required aria-invalid={!!error} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Merge listings
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const BATCH = 500;

/** CSV import: parses in the browser, sends batches of 500 rows; each batch commits in one transaction. */
export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"approved" | "pending_review" | "draft">("approved");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const router = useRouter();

  const downloadTemplate = () => {
    const sample = {
      name: "Example Plumbing", description: "Family-owned plumbers serving Chicago since 1998.", email: "hello@example.com", website: "https://example.com",
      phone: "(312) 555-0100", phone2: "", address: "100 Main St", city: "Chicago", state: "IL", zip: "60601", lat: "", lng: "", categories: "plumbers|hvac",
    };
    saveCsv("business-import-template.csv", Papa.unparse({ fields: IMPORT_COLUMNS, data: [IMPORT_COLUMNS.map((c) => sample[c as keyof typeof sample] ?? "")] }));
  };

  const run = async () => {
    if (!file) return;
    setResult(null);
    const parsed = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) =>
      Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase(), complete: resolve, error: reject }),
    );
    const missing = ["name", "city", "state", "categories"].filter((c) => !parsed.meta.fields?.includes(c));
    if (missing.length) {
      toast.error(`Missing required column(s): ${missing.join(", ")}`);
      return;
    }
    const rows = parsed.data;
    const total: ImportResult = { inserted: 0, errors: [] };
    setProgress({ done: 0, total: rows.length });
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const res = await importBusinessesBatch({ rows: batch, startRow: i + 2, status });
      if (!res.ok || !res.data) {
        total.errors.push({ row: i + 2, message: `Batch starting at row ${i + 2} failed: ${res.ok ? "unknown error" : res.message}` });
      } else {
        total.inserted += res.data.inserted;
        total.errors.push(...res.data.errors);
      }
      setProgress({ done: Math.min(rows.length, i + BATCH), total: rows.length });
    }
    setProgress(null);
    setResult(total);
    if (total.inserted) {
      toast.success(`Imported ${total.inserted.toLocaleString("en-US")} listing(s).`);
      router.refresh();
    }
    if (total.errors.length) toast.warning(`${total.errors.length} row(s) need attention.`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setResult(null);
          setFile(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp aria-hidden /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent title="Import businesses from CSV" description="Required columns: name, city, state (2-letter), categories (slugs separated by |). Rows are processed in batches of 500.">
        <div className="grid gap-4">
          <Button type="button" variant="link" className="justify-start" onClick={downloadTemplate}>
            <Download aria-hidden /> Download template
          </Button>
          <Field label="CSV file" htmlFor="import-file" required>
            <Input id="import-file" type="file" accept=".csv,text/csv" className="py-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Status for imported listings" htmlFor="import-status">
            <NativeSelect id="import-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="approved">Approved (live immediately)</option>
              <option value="pending_review">Pending review</option>
              <option value="draft">Draft</option>
            </NativeSelect>
          </Field>
          {progress && (
            <div role="status" className="grid gap-1.5">
              <p className="text-sm">
                Importing {progress.done.toLocaleString("en-US")} of {progress.total.toLocaleString("en-US")} rows…
              </p>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary transition-[width]" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
            </div>
          )}
          {result && (
            <div role="status" className="grid gap-2 rounded-md border border-border bg-surface p-3 text-sm">
              <p>
                <strong>{result.inserted.toLocaleString("en-US")}</strong> imported, <strong>{result.errors.length}</strong> row error(s).
              </p>
              {result.errors.length > 0 && (
                <>
                  <ul className="max-h-48 overflow-y-auto text-xs text-danger">
                    {result.errors.slice(0, 200).map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                  <Button type="button" size="sm" variant="outline" onClick={() => saveCsv("import-errors.csv", Papa.unparse(result.errors))}>
                    <Download aria-hidden /> Download error report
                  </Button>
                </>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={run} disabled={!file} loading={!!progress}>
              Start import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function saveCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
