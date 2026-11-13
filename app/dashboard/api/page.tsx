import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getActiveApiKey } from "@/lib/data/dashboard";
import { SITE_URL } from "@/lib/site";
import { PageHeader } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/primitives";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/controls";
import { ApiKeyCard } from "@/components/dashboard/api-key-card";
import { PageSkeleton } from "@/components/dashboard/skeletons";

export const metadata = { title: "API Access" };

const BASE = `${SITE_URL}/api/v1`;

const ENDPOINTS: { method: string; path: string; title: string; curl: string; notes?: string }[] = [
  { method: "GET", path: "/businesses", title: "List your businesses", curl: `curl ${BASE}/businesses?page=1&per_page=25 \\\n  -H "Authorization: Bearer $API_KEY"` },
  {
    method: "POST",
    path: "/businesses",
    title: "Create a business",
    notes: 'Set "submit": true to send it for review right away; otherwise it is saved as a draft.',
    curl: `curl -X POST ${BASE}/businesses \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{
    "details": {
      "name": "Blue Line Plumbing",
      "slug": "blue-line-plumbing-chicago",
      "categoryIds": ["<category-uuid>"],
      "description": "<p>Licensed plumbers serving Chicago since 2005.</p>",
      "phone": "(312) 555-0199",
      "website": "https://example.com"
    },
    "location": {
      "address": "100 Main St", "cityName": "Chicago", "stateId": "<state-uuid>",
      "zip": "60601", "lat": 41.8781, "lng": -87.6298, "timezone": "America/Chicago"
    },
    "submit": true
  }'`,
  },
  { method: "GET", path: "/businesses/{id}", title: "Get one business", curl: `curl ${BASE}/businesses/<id> \\\n  -H "Authorization: Bearer $API_KEY"` },
  {
    method: "PUT",
    path: "/businesses/{id}",
    title: "Update a business",
    notes: "Send only the sections you want to change: details, location, hours, videoUrl, seo. Name, category and address changes on an approved listing go back to review.",
    curl: `curl -X PUT ${BASE}/businesses/<id> \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "details": { "phone": "(312) 555-0100" } }'`,
  },
  { method: "DELETE", path: "/businesses/{id}", title: "Delete a business", notes: "Soft delete; restorable from the dashboard for 30 days.", curl: `curl -X DELETE ${BASE}/businesses/<id> \\\n  -H "Authorization: Bearer $API_KEY"` },
  {
    method: "PUT",
    path: "/businesses/{id}/hours",
    title: "Replace business hours",
    notes: "day: 0 = Monday … 6 = Sunday. Use sequence 1 for a second (split-shift) range.",
    curl: `curl -X PUT ${BASE}/businesses/<id>/hours \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "hours": [
    { "day": 0, "openTime": "09:00", "closeTime": "17:00" },
    { "day": 5, "is24h": true },
    { "day": 6, "isClosed": true }
  ] }'`,
  },
  {
    method: "POST",
    path: "/businesses/{id}/media",
    title: "Add a photo from a URL",
    notes: 'type: "logo", "banner" or "gallery". We download the image, convert it to WebP and resize it.',
    curl: `curl -X POST ${BASE}/businesses/<id>/media \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "type": "gallery", "url": "https://example.com/photo.jpg" }'`,
  },
  { method: "GET", path: "/categories", title: "List categories", curl: `curl ${BASE}/categories \\\n  -H "Authorization: Bearer $API_KEY"` },
  { method: "GET", path: "/leads", title: "List leads", notes: "Filters: status (new, contacted, closed), business_id, since (ISO date), page, per_page.", curl: `curl "${BASE}/leads?status=new&since=2026-01-01" \\\n  -H "Authorization: Bearer $API_KEY"` },
];

const METHOD_COLOR: Record<string, string> = {
  GET: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export default function ApiPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="API Access" description="REST API v1 for managing your listings programmatically." crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "API Access" }]} />
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <KeyLoader />
      </Suspense>

      <Card className="mt-6 grid gap-4 p-6">
        <h2 className="text-lg font-bold">Documentation</h2>
        <ul className="grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
          <li>
            Base URL: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{BASE}</code>
          </li>
          <li>
            Authenticate with <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">Authorization: Bearer &lt;your key&gt;</code>
          </li>
          <li>Rate limit: 60 requests per minute per key. Exceeding it returns 429 with a Retry-After header.</li>
          <li>
            Responses are JSON. Errors look like <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{`{ "error": { "message": "…", "fields": [{ "field": "details.name", "message": "…" }] } }`}</code>
          </li>
          <li>Status codes: 200 OK, 201 Created, 204 Deleted, 401 bad key, 404 not found, 422 validation failed, 429 rate limited.</li>
        </ul>
        <Accordion type="multiple" className="mt-2">
          {ENDPOINTS.map((e) => (
            <AccordionItem key={`${e.method} ${e.path}`} value={`${e.method} ${e.path}`}>
              <AccordionTrigger>
                <span className="flex items-center gap-3">
                  <span className={`w-16 rounded px-2 py-0.5 text-center font-mono text-xs font-bold ${METHOD_COLOR[e.method]}`}>{e.method}</span>
                  <code className="font-mono text-sm">{e.path}</code>
                  <span className="hidden text-sm font-normal text-muted-foreground sm:inline">{e.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {e.notes && <p className="mb-2 text-sm">{e.notes}</p>}
                <pre className="overflow-x-auto rounded-md bg-ink p-4 text-xs leading-relaxed text-slate-100">
                  <code>{e.curl}</code>
                </pre>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}

async function KeyLoader() {
  const user = await requireUser();
  const key = await getActiveApiKey(user.id);
  return (
    <ApiKeyCard
      apiKey={key ? { last4: key.last4, createdAt: key.createdAt.toISOString(), lastUsedAt: key.lastUsedAt?.toISOString() ?? null, requestCount: key.requestCount } : null}
    />
  );
}
