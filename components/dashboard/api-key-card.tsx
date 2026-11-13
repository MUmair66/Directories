"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { generateApiKey, revokeApiKey } from "@/app/actions/dashboard/account";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/overlays";
import { handleResult, LocalDate } from "@/components/dashboard/helpers";

export function ApiKeyCard({ apiKey }: { apiKey: { last4: string; createdAt: string; lastUsedAt: string | null; requestCount: number } | null }) {
  const router = useRouter();
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const generate = async () => {
    const res = handleResult(await generateApiKey({}));
    if (res.ok && res.data) {
      setFresh(res.data.key);
      router.refresh();
    }
  };

  const copy = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh);
      setCopied(true);
      toast.success("API key copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed. Select the key and copy it manually.");
    }
  };

  return (
    <Card className="grid gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold">API key</h2>
            <p className="text-sm text-muted-foreground">Use it to manage your listings and read leads from your own software.</p>
          </div>
        </div>
        {apiKey ? <Badge tone="success">Active</Badge> : <Badge>No key</Badge>}
      </div>

      {fresh && (
        <div className="grid gap-2 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950" role="alert">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Copy your key now. For your security it won&apos;t be shown again.</p>
          <div className="flex gap-2">
            <label htmlFor="new-api-key" className="sr-only">
              New API key
            </label>
            <input id="new-api-key" readOnly value={fresh} onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 font-mono text-sm" />
            <Button type="button" onClick={copy} variant="outline">
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {apiKey ? (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Key</dt>
              <dd className="font-mono">lfk_••••••••{apiKey.last4}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd><LocalDate value={apiKey.createdAt} /></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last used</dt>
              <dd>{apiKey.lastUsedAt ? <LocalDate value={apiKey.lastUsedAt} withTime /> : "Never"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Requests</dt>
              <dd className="tabular-nums">{apiKey.requestCount.toLocaleString("en-US")}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <RefreshCw /> Regenerate
                </Button>
              }
              title="Regenerate API key?"
              description="Your current key stops working immediately. Update any integrations with the new key."
              confirmLabel="Regenerate"
              onConfirm={generate}
            />
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-danger">
                  <ShieldOff /> Revoke
                </Button>
              }
              title="Revoke API key?"
              description="Requests using this key will be rejected immediately."
              confirmLabel="Revoke"
              onConfirm={async () => {
                if (handleResult(await revokeApiKey({})).ok) {
                  setFresh(null);
                  router.refresh();
                }
              }}
            />
          </div>
        </>
      ) : (
        <div>
          <Button loading={pending} onClick={() => start(generate)}>
            <KeyRound /> Generate API key
          </Button>
        </div>
      )}
    </Card>
  );
}
