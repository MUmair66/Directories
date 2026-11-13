"use client";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { mediaInfoSchema } from "@/lib/validations/business";
import { addMedia, deleteMedia, reorderGallery, saveSection } from "@/app/actions/dashboard/businesses";
import { uploadFile } from "@/components/forms/upload";
import { videoEmbedUrl } from "@/lib/text";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/overlays";
import { handleResult, useUnsavedWarning } from "@/components/dashboard/helpers";
import { SectionFooter, type SectionMode } from "./section-footer";
import type { FormBusiness } from "./defaults";

type Media = FormBusiness["media"][number];
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

function useUploader(businessId: string, type: "logo" | "banner" | "gallery", onDone: (m: Media) => void) {
  const [progress, setProgress] = useState<number | null>(null);
  const upload = async (file: File) => {
    setProgress(0);
    try {
      const { key } = await uploadFile(file, { kind: "image", scope: "business", onProgress: setProgress });
      setProgress(100);
      const res = await addMedia({ businessId, type, key });
      if (!res.ok || !res.data) throw new Error(res.ok ? "Upload failed" : res.message);
      onDone({ ...res.data, type, sortOrder: 0 } as Media);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      return false;
    } finally {
      setProgress(null);
    }
  };
  return { progress, upload };
}

/** Single-image slot (logo square / banner 16:9). Images are center-cropped server-side and converted to WebP. */
function ImageSlot({ businessId, type, current, onChange }: { businessId: string; type: "logo" | "banner"; current?: Media; onChange: (m: Media | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { progress, upload } = useUploader(businessId, type, (m) => {
    onChange(m);
    toast.success(`${type === "logo" ? "Logo" : "Banner"} updated`);
  });
  const square = type === "logo";
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium" id={`${type}-label`}>
        {square ? "Logo" : "Banner image"} <span className="font-normal text-muted-foreground">({square ? "square, at least 400×400" : "16:9, at least 1600×900"})</span>
      </p>
      <div className={cn("relative overflow-hidden rounded-lg border border-dashed border-input bg-surface", square ? "size-40" : "aspect-[16/9] w-full max-w-xl")}>
        {current ? (
          <Image src={current.url} alt={`${type} preview`} fill sizes={square ? "160px" : "576px"} className="object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 p-4 text-center text-sm text-muted-foreground">
            <ImagePlus className="size-6" aria-hidden />
            No {type} yet
          </div>
        )}
        {progress !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-sm font-medium text-white" role="status">
            <Loader2 className="size-6 animate-spin" aria-hidden />
            {progress < 100 ? `Uploading ${progress}%` : "Processing…"}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-labelledby={`${type}-label`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={progress !== null}>
          <Upload /> {current ? "Replace" : "Upload"}
        </Button>
        {current && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="sm">
                <Trash2 /> Remove
              </Button>
            }
            title={`Remove ${type}?`}
            description="This image will be removed from your listing."
            confirmLabel="Remove"
            onConfirm={async () => {
              const res = handleResult(await deleteMedia({ mediaId: current.id }));
              if (res.ok) onChange(undefined);
            }}
          />
        )}
      </div>
    </div>
  );
}

export function MediaSection({ business, mode, onSaved }: { business: FormBusiness; mode: SectionMode; onSaved: () => void }) {
  const router = useRouter();
  const [logo, setLogo] = useState(business.media.find((m) => m.type === "logo"));
  const [banner, setBanner] = useState(business.media.find((m) => m.type === "banner"));
  const form = useForm({ resolver: zodResolver(mediaInfoSchema), defaultValues: { videoUrl: business.videoUrl ?? "" } });
  const [pending, start] = useTransition();
  const videoUrl = form.watch("videoUrl");
  const embed = videoEmbedUrl(videoUrl);
  useUnsavedWarning(mode.kind === "edit" && form.formState.isDirty);

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const res = handleResult(await saveSection({ businessId: business.id, section: "media", data: values, wizardStep: mode.kind === "wizard" ? 5 : undefined }), {
            setError: form.setError,
            success: mode.kind === "wizard" ? false : undefined,
          });
          if (res.ok) {
            form.reset(values);
            router.refresh();
            onSaved();
          }
        }),
      )}
      className="grid gap-8"
    >
      <div className="grid gap-8 md:grid-cols-[auto_1fr]">
        <ImageSlot businessId={business.id} type="logo" current={logo} onChange={setLogo} />
        <ImageSlot businessId={business.id} type="banner" current={banner} onChange={setBanner} />
      </div>
      {mode.kind === "wizard" && <GalleryManager businessId={business.id} initial={business.media.filter((m) => m.type === "gallery")} />}
      <div className="grid gap-3">
        <Field label="Video URL" htmlFor="videoUrl" error={form.formState.errors.videoUrl?.message} help="Paste a YouTube or Vimeo link.">
          <Input id="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=…" {...form.register("videoUrl")} />
        </Field>
        {embed && (
          <div className="aspect-video w-full max-w-xl overflow-hidden rounded-lg border border-border">
            <iframe src={embed} title="Video preview" className="size-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
          </div>
        )}
      </div>
      <SectionFooter mode={mode} dirty={form.formState.isDirty} pending={pending} onReset={() => form.reset({ videoUrl: business.videoUrl ?? "" })} />
    </form>
  );
}

/** Drag-and-drop multi-upload with reorder (drag or arrow buttons) and delete. Up to 20 photos. */
export function GalleryManager({ businessId, initial, max = 20 }: { businessId: string; initial: Media[]; max?: number }) {
  const [items, setItems] = useState(() => [...initial].sort((a, b) => a.sortOrder - b.sortOrder));
  const [queue, setQueue] = useState<{ name: string; progress: number | null }[]>([]);
  const [over, setOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [, start] = useTransition();
  const { upload } = useUploader(businessId, "gallery", (m) => setItems((prev) => [...prev, m]));

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const room = max - items.length;
    if (list.length > room) toast.error(`You can add ${room} more photo${room === 1 ? "" : "s"} (max ${max}).`);
    const batch = list.slice(0, Math.max(0, room));
    setQueue(batch.map((f) => ({ name: f.name, progress: 0 })));
    for (const f of batch) {
      await upload(f);
      setQueue((q) => q.filter((x) => x.name !== f.name));
    }
    setQueue([]);
  };

  const saveOrder = (next: Media[]) => {
    setItems(next);
    start(async () => {
      const res = await reorderGallery({ businessId, ids: next.map((m) => m.id) });
      if (!res.ok) toast.error(res.message);
    });
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m!);
    saveOrder(next);
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Gallery <span className="font-normal text-muted-foreground">({items.length}/{max})</span>
        </p>
      </div>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors", over ? "border-primary bg-secondary" : "border-input bg-surface")}
      >
        <ImagePlus className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Drag photos here, or</p>
        <input ref={input} type="file" accept={ACCEPT} multiple className="sr-only" aria-label="Add gallery photos" onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={items.length >= max || queue.length > 0}>
          <Upload /> Choose photos
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF or AVIF up to 10 MB each. We compress and convert to WebP.</p>
      </div>
      {queue.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Uploading {queue.length} photo{queue.length === 1 ? "" : "s"}…
        </p>
      )}
      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Gallery photos (drag to reorder)">
          {items.map((m, i) => (
            <li
              key={m.id}
              draggable
              onDragStart={() => setDragId(m.id)}
              onDragOver={(e) => dragId && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragId || dragId === m.id) return;
                move(items.findIndex((x) => x.id === dragId), i);
                setDragId(null);
              }}
              className={cn("group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted", dragId === m.id && "opacity-50")}
            >
              <Image src={m.url} alt={`Gallery photo ${i + 1}`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Cover</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded bg-white/90 p-1 text-ink disabled:opacity-40" aria-label={`Move photo ${i + 1} earlier`}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="rounded bg-white/90 p-1 text-ink disabled:opacity-40" aria-label={`Move photo ${i + 1} later`}>
                    <ArrowDown className="size-4" />
                  </button>
                </div>
                <ConfirmDialog
                  trigger={
                    <button type="button" className="rounded bg-white/90 p-1 text-danger" aria-label={`Delete photo ${i + 1}`}>
                      <Trash2 className="size-4" />
                    </button>
                  }
                  title="Delete this photo?"
                  description="The photo will be removed from your gallery."
                  onConfirm={async () => {
                    const res = handleResult(await deleteMedia({ mediaId: m.id }));
                    if (res.ok) setItems((prev) => prev.filter((x) => x.id !== m.id));
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
