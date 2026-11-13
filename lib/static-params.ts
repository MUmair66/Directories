import "server-only";

/**
 * generateStaticParams helper. Prerenders the top items from the database and falls back
 * to known seed values when the database is unreachable (e.g. CI builds without DATABASE_URL).
 * With Cache Components the list must never be empty.
 */
export async function staticParams<T extends Record<string, string>>(load: () => Promise<T[]>, fallback: T[]): Promise<T[]> {
  if (!process.env.DATABASE_URL) return fallback;
  try {
    const rows = await load();
    return rows.length ? rows : fallback;
  } catch (e) {
    const err = e as Error & { cause?: Error };
    console.warn("[generateStaticParams] using fallback params:", err.cause?.message ?? err.message);
    return fallback;
  }
}
