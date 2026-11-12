"use client";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { NAV } from "./nav-items";

export function MobileNav() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-6" />
        </Button>
      </DialogTrigger>
      <SheetContent side="left" title="Menu">
        <nav className="grid gap-1 p-3" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted">
              {n.label}
            </Link>
          ))}
          <hr className="my-2 border-border" />
          <Link href="/login" className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted">
            Log in
          </Link>
          <Link href="/register" className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted">
            Sign up
          </Link>
          <Button asChild className="mt-2">
            <Link href="/dashboard/businesses/new">+ Add Business</Link>
          </Button>
        </nav>
      </SheetContent>
    </Dialog>
  );
}
