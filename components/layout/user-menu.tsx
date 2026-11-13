"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Heart, LayoutDashboard, LogOut, Shield } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { Skeleton } from "@/components/ui/primitives";
import { initials } from "@/lib/text";

/**
 * Header auth area. Reads the session on the client so public pages keep a fully
 * cacheable static shell.
 */
export function UserMenu() {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending) return <Skeleton className="size-9 rounded-full" />;

  if (!data) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
          <Link href="/register">Sign up</Link>
        </Button>
      </div>
    );
  }

  const user = data.user as typeof data.user & { role?: string; photoUrl?: string | null };
  const isStaff = user.role === "admin" || user.role === "editor";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white ring-offset-2 hover:ring-2 hover:ring-primary/40" aria-label="Account menu">
        {user.photoUrl || user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(user.photoUrl || user.image)!} alt="" className="size-full object-cover" />
        ) : (
          initials(user.name || user.email)
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user.name || user.email}</DropdownMenuLabel>
        {isStaff && (
          <DropdownMenuItem asChild>
            <Link href="/admin/dashboard">
              <Shield /> Admin dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/businesses">
            <Building2 /> My Businesses
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/favorites">
            <Heart /> Favorites
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await authClient.signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
