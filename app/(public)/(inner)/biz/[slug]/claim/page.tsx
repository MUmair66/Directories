import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { getBusinessBySlug } from "@/lib/data/public";
import { getSession } from "@/lib/auth";
import { decodeEntities } from "@/lib/text";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BusinessAvatar } from "@/components/listing/business-avatar";
import { RatingSummary } from "@/components/listing/stars";
import { Button } from "@/components/ui/button";
import { Card, Container, Skeleton } from "@/components/ui/primitives";
import { ClaimForm } from "@/components/business/claim-form";

export const metadata: Metadata = { title: "Claim this business", robots: { index: false, follow: false } };

export default function ClaimPage({ params }: PageProps<"/biz/[slug]/claim">) {
  return (
    <Container className="max-w-3xl py-8">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Claim params={params} />
      </Suspense>
    </Container>
  );
}

async function Claim({ params }: { params: PageProps<"/biz/[slug]/claim">["params"] }) {
  const { slug } = await params;
  const [b, session] = await Promise.all([getBusinessBySlug(slug), getSession()]);
  if (!b) notFound();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/biz/${slug}/claim`)}`);
  const name = decodeEntities(b.name);
  const logo = b.media.find((m) => m.type === "logo")?.url;
  const u = session.user as typeof session.user & { phone?: string | null };

  return (
    <div className="grid gap-6">
      <Breadcrumbs items={[{ name, href: `/biz/${b.slug}` }, { name: "Claim" }]} />
      <div>
        <h1 className="text-3xl font-bold">Claim {name}</h1>
        <p className="mt-1 text-muted-foreground">Claim your free listing to edit details, reply to reviews and receive leads.</p>
      </div>
      <Card className="flex items-center gap-4 p-5">
        <BusinessAvatar name={name} src={logo} size={64} />
        <div className="min-w-0">
          <p className="font-bold">{name}</p>
          <p className="text-sm text-muted-foreground">{[b.address && !b.hideAddress ? b.address : null, b.city?.name, b.state?.code].filter(Boolean).join(", ")}</p>
          <RatingSummary rating={Number(b.avgRating)} count={b.reviewCount} size={14} />
        </div>
      </Card>
      {b.claimed ? (
        <Card className="grid justify-items-start gap-3 p-6">
          <ShieldCheck className="size-8 text-success" aria-hidden />
          <p className="font-semibold">This business has already been claimed.</p>
          <p className="text-sm text-muted-foreground">If you believe this is a mistake, open a support ticket and our team will help.</p>
          <Button asChild>
            <Link href="/dashboard/tickets/new">Contact support</Link>
          </Button>
        </Card>
      ) : (
        <ClaimForm businessId={b.id} defaults={{ name: u.name ?? "", email: u.email ?? "", phone: u.phone ?? "" }} />
      )}
    </div>
  );
}
