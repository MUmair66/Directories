import "server-only";
import { getSlugRedirect } from "@/lib/data/public";

/**
 * Looks up an old path in slug_redirects (following chains up to 5 hops).
 * Pages call this on their not-found path and answer with permanentRedirect() (308),
 * which search engines treat like a 301. No lookup happens for pages that exist.
 */
export async function findRedirect(path: string): Promise<string | null> {
  let target: string | null = null;
  let current = path;
  for (let i = 0; i < 5; i++) {
    const next = await getSlugRedirect(current);
    if (!next || next === current) break;
    target = next;
    current = next;
  }
  return target;
}
