// Test-only stand-in for next/cache so cached data functions can run outside Next.js.
export const cacheLife = (_: unknown) => {};
export const cacheTag = (..._: unknown[]) => {};
export const revalidateTag = (..._: unknown[]) => {};
export const updateTag = (..._: unknown[]) => {};
