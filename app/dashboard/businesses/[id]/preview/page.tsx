import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Globe, MapPin, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getEditableForUser } from "@/lib/data/dashboard";
import { hoursByDay } from "@/lib/hours";
import { formatPhone, videoEmbedUrl } from "@/lib/text";
import { sanitizeHtml } from "@/lib/sanitize";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { BusinessAvatar, BusinessCover } from "@/components/listing/business-avatar";
import { BusinessStatusBadge } from "@/components/dashboard/badges";
import { FormSkeleton } from "@/components/dashboard/skeletons";

export const metadata = { title: "Preview" };

export default function PreviewPage({ params }: PageProps<"/dashboard/businesses/[id]/preview">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: PageProps<"/dashboard/businesses/[id]/preview">["params"] }) {
  const { id } = await params;
  const user = await requireUser();
  const b = await getEditableForUser(id, user);
  if (!b) notFound();
  const logo = b.media.find((m) => m.type === "logo");
  const banner = b.media.find((m) => m.type === "banner");
  const gallery = b.media.filter((m) => m.type === "gallery");
  const embed = videoEmbedUrl(b.videoUrl);
  const editHref = b.status === "draft" ? `/dashboard/businesses/new?id=${b.id}&step=${b.wizardStep}` : `/dashboard/businesses/${b.id}/edit`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Listing preview"
        description="This is roughly how your listing will look once it's approved."
        crumbs={[{ label: "My Businesses", href: "/dashboard/businesses" }, { label: "Preview" }]}
        action={
          <Button asChild>
            <Link href={editHref}>Back to editing</Link>
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <BusinessCover name={b.name} src={banner?.url} className="aspect-[16/6]" sizes="896px" />
        <div className="p-6">
          <div className="-mt-14 flex items-end gap-4">
            <BusinessAvatar name={b.name} src={logo?.url} size={88} className="border-4 border-card" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">{b.name}</h2>
            <BusinessStatusBadge status={b.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {(b.city || b.cityName) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" /> {b.hideAddress ? "" : `${b.address ?? ""}, `}
                {b.city?.name ?? b.cityName}, {b.state?.code}
              </span>
            )}
            {b.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-4" /> {formatPhone(b.phone)}
              </span>
            )}
            {b.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="size-4" /> {b.website}
              </span>
            )}
          </div>
          {b.seo?.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {b.seo.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          ) : null}
          <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(b.description) }} />
          {gallery.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {gallery.map((g, i) => (
                <div key={g.id} className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                  <Image src={g.url} alt={`${b.name} photo ${i + 1}`} fill sizes="300px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
          {embed && <iframe src={embed} title="Video" className="mt-6 aspect-video w-full rounded-md" loading="lazy" allowFullScreen />}
          <h3 className="mt-6 font-bold">Hours</h3>
          <ul className="mt-2 grid max-w-sm gap-1 text-sm">
            {hoursByDay(b.hours).map((h) => (
              <li key={h.day} className="flex justify-between">
                <span>{h.name}</span>
                <span className={h.closed ? "text-danger" : undefined}>{h.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
