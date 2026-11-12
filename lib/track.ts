export type TrackType = "view" | "call_click" | "website_click" | "directions_click";

/** Client-side event beacon; never blocks navigation. */
export function track(businessId: string, type: TrackType) {
  if (typeof navigator === "undefined") return;
  const payload = JSON.stringify({ businessId, type });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
  else fetch("/api/events", { method: "POST", body: payload, keepalive: true }).catch(() => {});
}
