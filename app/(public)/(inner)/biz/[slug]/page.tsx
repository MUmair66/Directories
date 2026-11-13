import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, Navigation, ShieldQuestion } from "lucide-react";
import { getBusinessBySlug, getPeopleAlsoViewed, getRatingDistribution, getReviews, getSimilarNearby, getTopBusinessSlugs } from "@/lib/data/public";
import { findRedirect } from "@/lib/redirects";
import { staticParams } from "@/lib/static-params";
import { localBusinessSchema } from "@/lib/schema-org";
import { decodeEntities, excerpt, videoEmbedUrl } from "@/lib/text";
import { BRAND_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { CompactCard } from "@/components/listing/compact-card";
import { ReadMore } from "@/components/listing/read-more";
import { Button } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/primitives";
import { ActionBar } from "@/components/business/action-bar";
import { ContactCard } from "@/components/business/contact-card";
import { Gallery } from "@/components/business/gallery";
import { HoursTable } from "@/components/business/hours-table";
import { LocationMap } from "@/components/business/location-map";
import { ProfileHero } from "@/components/business/profile-hero";
import { ReviewsPanel, WriteReview, type ReviewItem } from "@/components/business/reviews";

export async function generateStaticParams() {
  return staticParams(async () => (await getTopBusinessSlugs(200)).map((slug) => ({ slug })), [{ slug: "__placeholder__" }]);
}

export async function generateMetadata({ params }: PageProps<"/biz/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBusinessBySlug(slug);
  if (!b) {
    // Resolved before streaming for crawlers, so unpublished or missing listings get a real 404 (or 308 for renamed slugs).
    const to = await findRedirect(`/biz/${slug}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  const name = decodeEntities(b.name);
  const primary = b.categories.find((c) => c.isPrimary)?.category ?? b.categories[0]?.category;
  const place = [b.city?.name, b.state?.code].filter(Boolean).join(", ");
  const title = b.seo?.metaTitle || `${name}${primary ? ` - ${primary.name}` : ""}${place ? ` in ${place}` : ""}`;
  const description =
    b.seo?.metaDescription ||
    excerpt(b.description, 155) ||
    `${name} is a ${primary?.name.toLowerCase() ?? "local business"}${place ? ` in ${place}` : ""}. See hours, photos, reviews and contact details on ${BRAND_NAME}.`;
  return {
    title,
    description,
    keywords: b.seo?.metaKeywords || b.seo?.tags?.join(", ") || undefined,
    alternates: { canonical: `/biz/${b.slug}` },
    openGraph: { type: "website", title, description, url: `/biz/${b.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function BusinessPage({ params }: PageProps<"/biz/[slug]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <BusinessProfile params={params} />
    </Suspense>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-5 text-2xl font-extrabold tracking-tight">
      {children}
    </h2>
  );
}

async function BusinessProfile({ params }: { params: PageProps<"/biz/[slug]">["params"] }) {
  const { slug } = await params;
  const b = await getBusinessBySlug(slug);
  if (!b) {
    const to = await findRedirect(`/biz/${slug}`);
    if (to) permanentRedirect(to);
    notFound();
  }

  const name = decodeEntities(b.name);
  const primaryCat = b.categories.find((c) => c.isPrimary)?.category ?? b.categories[0]?.category;
  const [reviews, distribution, alsoViewed, similar] = await Promise.all([
    getReviews(b.id, "newest", 10, 0),
    getRatingDistribution(b.id),
    getPeopleAlsoViewed({ id: b.id, categoryId: primaryCat?.id, cityId: b.cityId }),
    getSimilarNearby({ id: b.id, lat: b.lat, lng: b.lng, categoryId: primaryCat?.id }),
  ]);
  // Same category + city first, then nearby businesses in the category.
  const seen = new Set<string>();
  const related = [...alsoViewed, ...similar].filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).slice(0, 6);

  const logo = b.media.find((m) => m.type === "logo");
  const banner = b.media.find((m) => m.type === "banner");
  const photos = b.media.filter((m) => m.type === "gallery");
  const stripPhotos = [...(banner ? [banner] : []), ...photos];
  const video = videoEmbedUrl(b.videoUrl);
  const place = [b.city?.name, b.state?.code].filter(Boolean).join(", ");
  const fullAddress = [b.address, b.city?.name, `${b.state?.code ?? ""} ${b.zip ?? ""}`.trim()].filter(Boolean).join(", ");
  const directionsUrl =
    b.hideAddress || b.lat == null || b.lng == null
      ? b.hideAddress
        ? null
        : fullAddress
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
          : null
      : `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;
  const services = b.seo?.tags ?? [];
  const description = b.description; // sanitized in getBusinessBySlug
  const longDescription = (description?.length ?? 0) > 900;
  const categoryLinks = b.categories.map(({ category: c }) => ({ id: c.id, name: c.name, href: c.parent ? `/category/${c.parent.slug}/${c.slug}` : `/categories/${c.slug}` }));

  return (
    <>
      <JsonLd data={localBusinessSchema(b, reviews)} />

      <ProfileHero
        name={name}
        logoUrl={logo?.url}
        photos={stripPhotos}
        photoCount={photos.length}
        rating={Number(b.avgRating)}
        reviewCount={b.reviewCount}
        claimed={b.claimed}
        verified={b.verificationStatus === "verified"}
        featured={b.featured}
        categories={categoryLinks}
        hours={b.hours}
        timezone={b.timezone}
      />

      <div className="border-b border-border bg-card">
        <Container className="grid gap-3 py-4">
          <Breadcrumbs
            items={[
              ...(primaryCat?.parent ? [{ name: primaryCat.parent.name, href: `/categories/${primaryCat.parent.slug}` }] : []),
              ...(primaryCat && primaryCat.parent ? [{ name: primaryCat.name, href: `/category/${primaryCat.parent.slug}/${primaryCat.slug}` }] : []),
              { name },
            ]}
          />
          <ActionBar businessId={b.id} name={name} phone={b.phone} website={b.website} directionsUrl={directionsUrl}>
            {!b.claimed && (
              <Link href={`/biz/${b.slug}/claim`} className="ml-auto hidden text-sm font-semibold text-primary hover:underline sm:inline">
                Is this your business? Claim it
              </Link>
            )}
          </ActionBar>
        </Container>
      </div>

      <Container className="grid gap-10 py-8 pb-28 md:pb-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <aside className="grid content-start gap-5 lg:order-2" aria-label="Contact details">
          <div className="grid gap-5 lg:sticky lg:top-20">
            <ContactCard
              businessId={b.id}
              name={name}
              phone={b.phone}
              phone2={b.phone2}
              website={b.website}
              directionsUrl={directionsUrl}
              address={!b.hideAddress && fullAddress ? fullAddress : place ? `Serves ${place}` : null}
              socialLinks={b.socialLinks}
            />
            {!b.claimed && (
              <div className="flex gap-3 rounded-xl border border-dashed border-border bg-surface p-4 text-sm">
                <ShieldQuestion className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-semibold">Is this your business?</p>
                  <p className="mt-0.5 text-muted-foreground">Claim it free to update details, reply to reviews and get leads.</p>
                  <Link href={`/biz/${b.slug}/claim`} className="mt-2 inline-block font-semibold text-primary hover:underline">
                    Claim this business
                  </Link>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="grid min-w-0 content-start gap-12 lg:order-1">
          {services.length > 0 && (
            <section id="services" aria-labelledby="services-h" className="scroll-mt-24">
              <SectionTitle id="services-h">Services offered</SectionTitle>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {services.map((s) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                    <span className="capitalize">{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="about" aria-labelledby="about-h" className="scroll-mt-24">
            <SectionTitle id="about-h">About the business</SectionTitle>
            {description ? (
              longDescription ? (
                <ReadMore html={description} collapsedHeight={220} />
              ) : (
                <div className="prose-content" dangerouslySetInnerHTML={{ __html: description }} />
              )
            ) : (
              <p className="text-muted-foreground">
                {name} hasn&apos;t added a description yet.{!b.claimed && " Own this business? Claim it to tell customers what you do."}
              </p>
            )}
          </section>

          {photos.length > 0 && (
            <section id="photos" aria-labelledby="photos-h" className="scroll-mt-24">
              <SectionTitle id="photos-h">Photos</SectionTitle>
              <Gallery photos={photos} name={name} />
            </section>
          )}

          {video && (
            <section id="video" aria-labelledby="video-h" className="scroll-mt-24">
              <SectionTitle id="video-h">Video</SectionTitle>
              <div className="aspect-video overflow-hidden rounded-xl bg-muted">
                <iframe src={video} title={`${name} video`} className="size-full" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </section>
          )}

          <section id="location" aria-labelledby="location-h" className="scroll-mt-24 border-t border-border pt-10">
            <SectionTitle id="location-h">Location &amp; Hours</SectionTitle>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="grid content-start gap-3">
                {b.hideAddress ? (
                  <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
                    This business serves customers in {place || "their area"} and doesn&apos;t list a public address.
                  </div>
                ) : (
                  <>
                    {b.lat != null && b.lng != null && <LocationMap lat={b.lat} lng={b.lng} name={name} className="h-56" />}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <address className="not-italic">
                        {b.address && <span className="block font-semibold">{b.address}</span>}
                        <span className="block text-muted-foreground">{[b.city?.name, `${b.state?.code ?? ""} ${b.zip ?? ""}`.trim()].filter(Boolean).join(", ")}</span>
                      </address>
                      {directionsUrl && (
                        <Button asChild variant="outline" size="sm" className="h-9">
                          <a href={directionsUrl} target="_blank" rel="noopener">
                            <Navigation aria-hidden /> Get directions
                          </a>
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div id="hours" className="scroll-mt-24">
                <h3 className="sr-only">Hours</h3>
                <HoursTable hours={b.hours} timezone={b.timezone} />
              </div>
            </div>
          </section>

          <section id="reviews" aria-labelledby="reviews-h" className="scroll-mt-24 border-t border-border pt-10">
            <SectionTitle id="reviews-h">Reviews</SectionTitle>
            <ReviewsPanel businessId={b.id} initial={reviews as unknown as ReviewItem[]} total={b.reviewCount} avgRating={Number(b.avgRating)} distribution={distribution}>
              <div id="write-review" className="scroll-mt-24">
                <WriteReview businessId={b.id} slug={b.slug} />
              </div>
            </ReviewsPanel>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="related-h" className="border-t border-border pt-10">
              <SectionTitle id="related-h">People also viewed</SectionTitle>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {related.map((s) => (
                  <li key={s.id}>
                    <CompactCard b={s} showDistance />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Container>
    </>
  );
}


function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading business">
      <Skeleton className="h-[300px] rounded-none sm:h-[380px]" />
      <Container className="grid gap-4 py-6">
        <Skeleton className="h-4 w-60" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 w-24" />
        </div>
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="hidden h-72 lg:block" />
        </div>
      </Container>
    </div>
  );
}
