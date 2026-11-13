import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

/** Shared Open Graph card: brand bar, eyebrow, title, subtitle, optional rating. */
export function ogCard({ eyebrow, title, subtitle, rating, reviews }: { eyebrow?: string; title: string; subtitle?: string; rating?: number; reviews?: number }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 800 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>◉</div>
          {BRAND_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {eyebrow && <div style={{ fontSize: 28, color: "#93C5FD", fontWeight: 600 }}>{eyebrow}</div>}
          <div style={{ fontSize: title.length > 40 ? 60 : 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 1050 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 30, color: "#CBD5E1" }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
          {rating != null && reviews ? (
            <>
              <span style={{ color: "#F59E0B" }}>★★★★★</span>
              <span style={{ fontWeight: 700 }}>{rating.toFixed(1)}</span>
              <span style={{ color: "#CBD5E1" }}>({reviews.toLocaleString("en-US")} reviews)</span>
            </>
          ) : (
            <span style={{ color: "#CBD5E1" }}>Free US business directory</span>
          )}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
