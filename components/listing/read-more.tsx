"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Collapsed rich text with a "Read more" toggle. Content stays in the HTML for SEO. */
export function ReadMore({ html, collapsedHeight = 120 }: { html: string; collapsedHeight?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={cn("prose-content relative overflow-hidden text-muted-foreground transition-[max-height] duration-200")} style={{ maxHeight: open ? "none" : collapsedHeight }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {!open && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background" aria-hidden />}
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 text-sm font-semibold text-primary hover:underline">
        {open ? "Show less" : "Read more"}
      </button>
    </div>
  );
}
