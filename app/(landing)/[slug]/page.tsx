import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { getPublishedLanding, getPublishedLandingSlugs } from "@/lib/data/landing";
import { findRedirect } from "@/lib/redirects";
import { staticParams } from "@/lib/static-params";
import { excerpt } from "@/lib/text";
import { LandingView } from "@/components/landing/landing-view";
import { LandingViewBeacon } from "@/components/landing/lead-form";

/**
 * Business landing pages at the site root: /11538-best-painting-services-westlake-oh#Intro
 * Created and fully controlled by admins (/admin/landing-pages). Static routes always win over this segment.
 */
export async function generateStaticParams() {
  return staticParams(async () => (await getPublishedLandingSlugs(200)).map((slug) => ({ slug })), [{ slug: "__placeholder__" }]);
}

async function resolve(slug: string) {
  const page = await getPublishedLanding(slug);
  if (page) return page;
  const to = await findRedirect(`/${slug}`);
  if (to) permanentRedirect(to);
  notFound();
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolve(slug);
  const intro = page.content.sections.find((s) => s.type === "intro");
  const title = page.seoTitle || page.title;
  const description = page.seoDescription || intro?.subtitle || excerpt(intro?.body, 155) || page.title;
  const image = intro?.imageUrl || undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { type: "website", title, description, url: `/${page.slug}`, images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function LandingPage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh animate-pulse bg-muted" />}>
      <Landing params={params} />
    </Suspense>
  );
}

async function Landing({ params }: { params: PageProps<"/[slug]">["params"] }) {
  const { slug } = await params;
  const page = await resolve(slug);
  return (
    <>
      <LandingView page={page} />
      <LandingViewBeacon id={page.id} />
    </>
  );
}
