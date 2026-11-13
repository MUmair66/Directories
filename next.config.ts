import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const r2Host = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: false,
  serverExternalPackages: ["sharp", "ws"],
  turbopack: {
    // Pin the workspace root (a package-lock.json higher up the tree would otherwise be picked up).
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  cacheLife: {
    // Listing pages: fresh for 5 min, revalidate in background up to 1 day.
    listings: { stale: 300, revalidate: 900, expire: 86400 },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(r2Host ? [{ protocol: "https" as const, hostname: r2Host }] : []),
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
      { source: "/(dashboard|admin)/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

/**
 * Sentry source-map upload runs only when SENTRY_AUTH_TOKEN is present (CI / Vercel);
 * local builds skip the wrapper entirely.
 */
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig;
