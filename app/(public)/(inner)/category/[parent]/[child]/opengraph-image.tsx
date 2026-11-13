import { getCategory } from "@/lib/data/public";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Business category";

export default async function Image({ params }: { params: Promise<{ child: string }> }) {
  const { child } = await params;
  const cat = await getCategory(child);
  return ogCard({ eyebrow: cat?.parent?.name ?? "Category", title: cat ? `${cat.name} near you` : "Business categories", subtitle: "Compare ratings, reviews and hours" });
}
