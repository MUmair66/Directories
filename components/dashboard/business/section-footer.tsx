"use client";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SectionMode = { kind: "wizard"; onBack?: () => void; previewHref?: string; isLast?: boolean } | { kind: "edit" };

/**
 * Wizard: Back / Preview / Save and continue.
 * Edit: sticky save bar that appears when the form has unsaved changes.
 */
export function SectionFooter({ mode, dirty, pending, onReset, saveLabel }: { mode: SectionMode; dirty: boolean; pending: boolean; onReset?: () => void; saveLabel?: string }) {
  if (mode.kind === "wizard") {
    return (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <div className="flex gap-2">
          {mode.onBack && (
            <Button type="button" variant="outline" onClick={mode.onBack}>
              <ArrowLeft /> Back
            </Button>
          )}
          {mode.previewHref && (
            <Button asChild type="button" variant="ghost">
              <a href={mode.previewHref} target="_blank" rel="noopener">
                <Eye /> Preview
              </a>
            </Button>
          )}
        </div>
        <Button type="submit" loading={pending}>
          {saveLabel ?? "Save and continue"}
        </Button>
      </div>
    );
  }
  if (!dirty && !pending) return null;
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6" role="region" aria-label="Unsaved changes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">You have unsaved changes</p>
        <div className="flex gap-2">
          {onReset && (
            <Button type="button" variant="outline" onClick={onReset} disabled={pending}>
              Discard
            </Button>
          )}
          <Button type="submit" loading={pending}>
            {saveLabel ?? "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
