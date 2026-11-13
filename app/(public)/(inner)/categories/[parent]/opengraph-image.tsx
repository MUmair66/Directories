import { getCategory } from "@/lib/data/public";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Business category";

export default async function Image({ params }: { params: Promise<{ parent: string }> }) {
  const { parent } = await params;
  const cat = await getCategory(parent);
  return ogCard({ eyebrow: "Category", title: cat?.name ?? "Business categories", subtitle: "Find trusted local businesses near you" });
}
