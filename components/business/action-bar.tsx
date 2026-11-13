"use client";
import { useEffect, useState } from "react";
import { MessageSquare, Navigation, Phone, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/track";
import { telHref } from "@/lib/text";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/listing/save-button";
import { MessageDialog } from "./message-dialog";

type Props = {
  businessId: string;
  name: string;
  phone: string | null;
  website: string | null;
  directionsUrl: string | null;
  /** Rendered at the end of the action row (e.g. the claim link). */
  children?: React.ReactNode;
};

/**
 * Profile actions: "Write a review" (primary), Share and Save under the header,
 * plus a fixed Call / Message / Directions bar on mobile. Tracks the page view and clicks.
 */
export function ActionBar({ businessId, name, phone, directionsUrl, children }: Props) {
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageMounted, setMessageMounted] = useState(false);
  const openMessage = () => {
    setMessageMounted(true);
    setMessageOpen(true);
  };

  useEffect(() => {
    track(businessId, "view");
  }, [businessId]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="lg" className="h-11 px-5">
          <a href="#write-review">
            <Star aria-hidden /> Write a review
          </a>
        </Button>
        <Button variant="outline" className="h-11 px-4" onClick={share}>
          <Share2 aria-hidden /> Share
        </Button>
        <SaveButton businessId={businessId} withLabel className="h-11 rounded-md border border-border bg-card px-4" />
        {children}
      </div>

      {/* Mobile: fixed bottom bar with Call, Message, Directions */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-4px_12px_rgb(15_23_42/0.08)] md:hidden">
        <div className={cn("grid gap-2", phone && directionsUrl ? "grid-cols-3" : "grid-cols-2")}>
          {phone && (
            <Button asChild className="h-12">
              <a href={telHref(phone)} onClick={() => track(businessId, "call_click")}>
                <Phone aria-hidden /> Call
              </a>
            </Button>
          )}
          <Button variant="secondary" className="h-12" onClick={openMessage}>
            <MessageSquare aria-hidden /> Message
          </Button>
          {directionsUrl && (
            <Button asChild variant="outline" className="h-12">
              <a href={directionsUrl} target="_blank" rel="noopener" onClick={() => track(businessId, "directions_click")}>
                <Navigation aria-hidden /> Directions
              </a>
            </Button>
          )}
        </div>
      </div>

      {messageMounted && <MessageDialog open={messageOpen} onOpenChange={setMessageOpen} businessId={businessId} businessName={name} />}
    </>
  );
}
