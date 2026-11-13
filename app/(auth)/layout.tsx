import Link from "next/link";
import { BadgeCheck, MessageSquareText, Star } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { BRAND_NAME } from "@/lib/site";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
        </p>
      </div>
      <aside className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-center lg:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark to-ink" aria-hidden />
        <div className="relative grid max-w-md gap-8">
          <h2 className="text-3xl font-bold">List your business free. Get found by local customers.</h2>
          <ul className="grid gap-5">
            {[
              [BadgeCheck, "Get the Verified badge", "Confirm ownership in minutes by SMS, email or document."],
              [MessageSquareText, "Receive leads directly", "Messages and calls go straight to you, never to a middleman."],
              [Star, "Grow with reviews", `Reply to reviews and build trust with ${BRAND_NAME} customers.`],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Star;
              return (
                <li key={title as string} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <I className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{title as string}</p>
                    <p className="text-sm text-slate-300">{text as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
