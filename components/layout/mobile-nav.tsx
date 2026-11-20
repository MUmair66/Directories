"use client";
import Link from "next/link";
import { Menu, PlusCircle } from "lucide-react";
import { Dialog, DialogClose, DialogTrigger, SheetContent } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { NAV } from "./nav-items";

export function MobileNav() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Open menu">
          <Menu className="size-6" />
        </Button>
      </DialogTrigger>
      <SheetContent side="left" title="Menu">
        <nav className="grid gap-1 p-3" aria-label="Mobile">
          {NAV.map((n) => (
            <DialogClose key={n.href} asChild>
              <Link href={n.href} className="rounded-md px-3 py-3 text-base font-medium hover:bg-secondary hover:text-primary">
                {n.label}
              </Link>
            </DialogClose>
          ))}
          <hr className="my-2 border-border" />
          <DialogClose asChild>
            <Link href="/login" className="rounded-md px-3 py-3 text-base font-medium hover:bg-secondary hover:text-primary">
              Sign in
            </Link>
          </DialogClose>
          <DialogClose asChild>
            <Link href="/register" className="rounded-md px-3 py-3 text-base font-medium hover:bg-secondary hover:text-primary">
              Create an account
            </Link>
          </DialogClose>
          <DialogClose asChild>
            <Button asChild className="mt-2">
              <Link href="/dashboard/businesses/new">
                <PlusCircle aria-hidden /> Add Business
              </Link>
            </Button>
          </DialogClose>
        </nav>
      </SheetContent>
    </Dialog>
  );
}
