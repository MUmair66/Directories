import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Building2, Inbox, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";

export const metadata = { title: "Welcome" };

const STEPS = [
  { icon: Building2, title: "Add your business", text: "Six quick steps: details, location, hours, photos and SEO. About 5 minutes." },
  { icon: BadgeCheck, title: "Verify it", text: "Confirm by SMS, email or document to earn the Verified badge." },
  { icon: Inbox, title: "Get leads", text: "Calls, messages and reviews show up right here in your dashboard." },
];

export default function WelcomePage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-8 py-6 text-center">
      <div className="grid gap-3">
        <Suspense fallback={<Skeleton className="mx-auto h-10 w-72" />}>
          <Greeting />
        </Suspense>
        <p className="text-lg text-muted-foreground">Let&apos;s get your business in front of local customers. Listing is free.</p>
      </div>
      <ol className="grid gap-4 text-left sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Card className="h-full p-5">
              <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary text-white">
                <s.icon className="size-5" aria-hidden />
              </span>
              <p className="font-semibold">
                {i + 1}. {s.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </Card>
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-center gap-3">
        <Button asChild size="lg">
          <Link href="/dashboard/businesses/new">Add your first business</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Just looking?{" "}
          <Link href="/search" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <Search className="size-3.5" aria-hidden /> Find businesses
          </Link>{" "}
          or{" "}
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            go to your dashboard
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

async function Greeting() {
  const user = await requireUser("/login?next=/dashboard/welcome");
  const first = (user as { firstName?: string | null }).firstName || user.name.split(" ")[0];
  return (
    <h1 className="text-3xl font-bold sm:text-4xl">
      Welcome to {BRAND_NAME}
      {first ? `, ${first}` : ""}!
    </h1>
  );
}
