"use client";
import * as React from "react";
import { Accordion as A, Checkbox as CB, Switch as SW, Tabs as T } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CB.Root>) {
  return (
    <CB.Root
      className={cn(
        "peer size-5 shrink-0 rounded-sm border border-input bg-card data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CB.Indicator className="flex items-center justify-center">
        <Check className="size-3.5" strokeWidth={3} />
      </CB.Indicator>
    </CB.Root>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SW.Root>) {
  return (
    <SW.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full bg-input transition-colors duration-150 data-[state=checked]:bg-primary disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SW.Thumb className="block size-5 translate-x-0.5 translate-y-0.5 rounded-full bg-white shadow transition-transform duration-150 data-[state=checked]:translate-x-[22px]" />
    </SW.Root>
  );
}

export const Tabs = T.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md bg-muted p-1", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("mt-4 outline-none", className)} {...props} />;
}

export const Accordion = A.Root;
export function AccordionItem({ className, ...props }: React.ComponentProps<typeof A.Item>) {
  return <A.Item className={cn("border-b border-border", className)} {...props} />;
}
export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof A.Trigger>) {
  return (
    <A.Header className="flex">
      <A.Trigger
        className={cn("flex flex-1 items-center justify-between gap-4 py-4 text-left font-semibold transition-colors hover:text-primary [&[data-state=open]>svg]:rotate-180", className)}
        {...props}
      >
        {children}
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-200" aria-hidden />
      </A.Trigger>
    </A.Header>
  );
}
export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof A.Content>) {
  return (
    <A.Content className="overflow-hidden text-muted-foreground" {...props}>
      <div className={cn("pb-4", className)}>{children}</div>
    </A.Content>
  );
}
