"use client";
import { useEffect } from "react";

/** Last-resort error page (root layout failed). Plain inline styles: globals.css may not have loaded. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F8FAFC", color: "#0F172A" }}>
        <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Something went wrong</h1>
            <p style={{ color: "#64748B", margin: "0 0 24px" }}>We hit an unexpected problem. Please try again in a moment.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={reset} style={{ background: "#7B1FA2", color: "#fff", border: 0, borderRadius: 8, padding: "12px 20px", fontWeight: 600, cursor: "pointer" }}>
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 20px", color: "#0F172A", textDecoration: "none", fontWeight: 600 }}>
                Go home
              </a>
            </div>
            {error.digest && <p style={{ marginTop: 24, fontSize: 12, color: "#94A3B8" }}>Reference: {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
