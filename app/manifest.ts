import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME}: Local Business Directory`,
    short_name: BRAND_NAME,
    description: "Find, compare and contact trusted local businesses across the US.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F6FC",
    theme_color: "#7B1FA2",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
