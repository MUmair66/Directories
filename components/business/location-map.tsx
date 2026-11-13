"use client";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/primitives";

const PinMap = dynamic(() => import("./pin-map"), { ssr: false, loading: () => <Skeleton className="size-full rounded-none" /> });

export function LocationMap({ lat, lng, name, className }: { lat: number; lng: number; name: string; className?: string }) {
  return (
    <div className={cn("isolate h-72 overflow-hidden rounded-lg border border-border", className)}>
      <PinMap lat={lat} lng={lng} name={name} />
    </div>
  );
}
