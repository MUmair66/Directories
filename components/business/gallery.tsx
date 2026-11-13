"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { SafeImage } from "@/components/ui/safe-image";

type Photo = { id: string; url: string; width: number | null; height: number | null; alt: string | null; blurDataUrl: string | null };

/** Photo grid with a keyboard-accessible lightbox. */
export function Gallery({ photos, name }: { photos: Photo[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const go = useCallback((delta: number) => setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const current = index !== null ? photos[index] : null;
  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => setIndex(i)} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-muted" aria-label={`Open photo ${i + 1} of ${photos.length}`}>
              <SafeImage
                src={p.url}
                alt={p.alt || `${name} photo ${i + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, 300px"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                placeholder={p.blurDataUrl ? "blur" : "empty"}
                blurDataURL={p.blurDataUrl ?? undefined}
                fallback={<span className="absolute inset-0 bg-gradient-to-br from-primary to-blue-900" aria-hidden />}
              />
            </button>
          </li>
        ))}
      </ul>
      <D.Root open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-slate-950/90" />
          <D.Content className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
            <D.Title className="sr-only">
              {name} photo {(index ?? 0) + 1} of {photos.length}
            </D.Title>
            <D.Description className="sr-only">Use the arrow keys to move between photos.</D.Description>
            {current && (
              <div className="relative h-full max-h-[85dvh] w-full max-w-5xl">
                <Image src={current.url} alt={current.alt || `${name} photo ${(index ?? 0) + 1}`} fill sizes="100vw" className="object-contain" />
              </div>
            )}
            <D.Close className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
              <X className="size-6" />
            </D.Close>
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous photo">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next photo">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80" aria-live="polite">
              {(index ?? 0) + 1} / {photos.length}
            </p>
          </D.Content>
        </D.Portal>
      </D.Root>
    </>
  );
}
