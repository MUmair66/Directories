import { getBusinessBySlug } from "@/lib/data/public";
import { decodeEntities } from "@/lib/text";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Business profile";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBusinessBySlug(slug);
  if (!b) return ogCard({ title: "Business not found" });
  const cat = b.categories.find((c) => c.isPrimary)?.category ?? b.categories[0]?.category;
  return ogCard({
    eyebrow: cat?.name,
    title: decodeEntities(b.name),
    subtitle: [b.city?.name, b.state?.code].filter(Boolean).join(", "),
    rating: Number(b.avgRating),
    reviews: b.reviewCount,
  });
}
