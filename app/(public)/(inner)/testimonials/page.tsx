import Image from "next/image";
import Link from "next/link";
import { Quote } from "lucide-react";
import { getTestimonials } from "@/lib/data/content";
import { pageMeta } from "@/lib/meta";
import { BRAND_NAME } from "@/lib/site";
import { initials } from "@/lib/text";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Container, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/listing/stars";
import { PageHero } from "@/components/content/blocks";

export const metadata = pageMeta({
  title: "Testimonials",
  description: `What business owners and customers say about ${BRAND_NAME}.`,
  path: "/testimonials",
});

export default async function TestimonialsPage() {
  const items = await getTestimonials();
  return (
    <>
      <PageHero top={<Breadcrumbs items={[{ name: "Testimonials" }]} />} title="Loved by local businesses" subtitle={`Real stories from owners and customers using ${BRAND_NAME}.`} />
      <Container className="py-12">
        {items.length ? (
          <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
            {items.map((t) => (
              <figure key={t.id} className="mb-6 break-inside-avoid rounded-lg border border-border bg-card p-6 shadow-card">
                <Quote className="size-7 text-primary/30" aria-hidden />
                <Stars rating={t.rating} className="mt-3" />
                <blockquote className="mt-3 text-base leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  {t.photoUrl ? (
                    <Image src={t.photoUrl} alt={t.name} width={44} height={44} className="size-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-11 items-center justify-center rounded-full bg-secondary font-bold text-primary" aria-hidden>
                      {initials(t.name)}
                    </span>
                  )}
                  <span>
                    <span className="block font-semibold">{t.name}</span>
                    {t.business && <span className="block text-sm text-muted-foreground">{t.business}</span>}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState title="No testimonials yet" description="Be one of the first businesses to share your story." action={<Button asChild><Link href="/dashboard/businesses/new">List your business</Link></Button>} />
        )}
      </Container>
    </>
  );
}
