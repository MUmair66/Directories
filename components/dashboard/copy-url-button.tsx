"use client";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyUrlButton({ url }: { url: string }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copied"), () => toast.error("Couldn't copy"))}>
      <Copy aria-hidden /> Copy link
    </Button>
  );
}
