"use client";
import * as React from "react";
import { AlertDialog as AD, Dialog as D, DropdownMenu as DM, Popover as PO } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* ── Dialog / modal ─────────────────────────────────────────────── */
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children, title, description, ...props }: React.ComponentProps<typeof D.Content> & { title: string; description?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-slate-950/50 data-[state=open]:animate-in" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-card-hover data-[state=open]:animate-in",
          className,
        )}
        {...props}
      >
        <div className="grid gap-1 pr-8">
          <D.Title className="text-lg font-bold">{title}</D.Title>
          {description ? <D.Description className="text-sm text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
        </div>
        {children}
        <D.Close className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
          <X className="size-5" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

/* ── Sheet / drawer (mobile filters, dashboard sidebar) ────────── */
export function SheetContent({ side = "bottom", className, children, title, ...props }: React.ComponentProps<typeof D.Content> & { side?: "left" | "right" | "bottom"; title: string }) {
  const sides = {
    left: "inset-y-0 left-0 h-full w-[85%] max-w-sm border-r",
    right: "inset-y-0 right-0 h-full w-[85%] max-w-md border-l",
    bottom: "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl border-t",
  };
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
      <D.Content className={cn("fixed z-50 flex flex-col overflow-y-auto bg-card shadow-card-hover data-[state=open]:animate-in", sides[side], className)} {...props}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <D.Title className="text-base font-bold">{title}</D.Title>
          <D.Description className="sr-only">{title}</D.Description>
          <D.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="size-5" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

/* ── Confirm dialog for destructive actions ────────────────────── */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  return (
    <AD.Root open={open} onOpenChange={setOpen}>
      <AD.Trigger asChild>{trigger}</AD.Trigger>
      <AD.Portal>
        <AD.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
        <AD.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-card p-6 shadow-card-hover data-[state=open]:animate-in">
          <AD.Title className="text-lg font-bold">{title}</AD.Title>
          <AD.Description className="text-sm text-muted-foreground">{description}</AD.Description>
          {children}
          <div className="flex justify-end gap-2">
            <AD.Cancel asChild>
              <Button variant="outline">Cancel</Button>
            </AD.Cancel>
            <Button
              variant={destructive ? "destructive" : "default"}
              loading={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setPending(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  );
}

/* ── Dropdown menu ─────────────────────────────────────────────── */
export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export function DropdownMenuContent({ className, align = "end", ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card-hover data-[state=open]:animate-in", className)}
        {...props}
      />
    </DM.Portal>
  );
}
export function DropdownMenuItem({ className, destructive, ...props }: React.ComponentProps<typeof DM.Item> & { destructive?: boolean }) {
  return (
    <DM.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4",
        destructive && "text-danger",
        className,
      )}
      {...props}
    />
  );
}
export const DropdownMenuSeparator = () => <DM.Separator className="my-1 h-px bg-border" />;
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => (
  <DM.Label className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">{children}</DM.Label>
);

/* ── Popover ───────────────────────────────────────────────────── */
export const Popover = PO.Root;
export const PopoverTrigger = PO.Trigger;
export const PopoverAnchor = PO.Anchor;
export function PopoverContent({ className, ...props }: React.ComponentProps<typeof PO.Content>) {
  return (
    <PO.Portal>
      <PO.Content sideOffset={6} className={cn("z-50 rounded-md border border-border bg-popover p-3 shadow-card-hover", className)} {...props} />
    </PO.Portal>
  );
}
