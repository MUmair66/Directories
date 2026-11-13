# LocalFind: US Local Business Directory

A production-ready local business directory for three audiences:

- **Searchers** find, compare, contact and review local businesses by category, state and city.
- **Business owners** list, manage, verify and promote their businesses for free from a self-serve dashboard.
- **Admins** moderate listings, claims, reviews and tickets, and manage categories, locations and SEO content.

The brand name is a single setting: change `NEXT_PUBLIC_BRAND_NAME` (default `LocalFind`) to rename the product everywhere.

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Partial Prefetching), React 19, TypeScript strict |
| Database | Neon serverless Postgres (PostGIS, pg_trgm, unaccent, citext) |
| ORM | Drizzle ORM + drizzle-kit; Neon HTTP driver for queries, WebSocket Pool for transactions |
| Auth | Better Auth: email + password (signed in right after sign-up), Continue with Google, password reset, username login, admin roles |
| UI | Tailwind CSS v4, shadcn-style components on Radix, lucide-react, Recharts |
| Forms | React Hook Form + Zod (one shared schema per form, client and server) |
| Files | Cloudflare R2 presigned direct uploads; sharp converts images to WebP in 3 sizes |
| Maps | Leaflet + OpenStreetMap tiles; Google Places Autocomplete for address entry |
| Email / SMS | Resend + React Email; Twilio REST API |
| Rate limiting / cache | Neon (`rate_limits` table) + Next.js `"use cache"`. Neon is the only datastore |
| Bot protection | Cloudflare Turnstile on every public form |
| Jobs | Vercel Cron |
| Monitoring | Vercel Analytics, Speed Insights, Sentry |
| Hosting | Vercel `iad1` + Neon `aws-us-east-1` (same region) |

## Local setup

```bash
npm install
cp .env.example .env.local      # fill in at least DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET
npm run db:migrate              # applies db/migrations on the UNPOOLED connection
npm run db:seed                 # taxonomy, states, cities, 50 demo businesses, starter content
npm run dev
```

Requires Node 20.9+. Every third-party integration degrades gracefully in development:
without `RESEND_API_KEY` emails are printed to the console, without Twilio SMS codes are printed,
and without Turnstile keys the widget is hidden and the server check passes.

### Environment variables

All variables are documented in [`.env.example`](.env.example):

- **Brand:** `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`
- **Neon:** `DATABASE_URL` (pooled, host contains `-pooler`, used by the app), `DATABASE_URL_UNPOOLED` (direct, used only by drizzle-kit and the seed)
- **Auth:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Email/SMS:** `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- **R2:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (public media), `R2_PRIVATE_BUCKET` (claim and verification documents), `R2_PUBLIC_URL`
- **Maps / bots:** `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- **Ops:** `CRON_SECRET`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- **Optional:** `STRIPE_SECRET_KEY` (Stripe Checkout behind the `stripeEnabled` site setting), `GAZETTEER_URL` (override the Census file)

## Neon setup

1. **Project:** create it in **AWS us-east-1** to sit next to Vercel `iad1`.
2. **Extensions:** `postgis`, `pg_trgm`, `unaccent` and `citext` are enabled by the first migration (`db/migrations/0000_extensions.sql`), which also creates the immutable `f_unaccent()` wrapper used by generated search columns and trigram indexes.
3. **Connections:**
   - `DATABASE_URL` is the **pooled** string (host contains `-pooler`). All runtime queries use it; `lib/db.ts` warns in production when it isn't pooled.
   - `DATABASE_URL_UNPOOLED` is the **direct** string. Only `drizzle-kit` (`drizzle.config.ts`) and `db/seed` use it.
4. **Compute:** production uses autoscaling with **scale-to-zero OFF** (no cold starts on public pages). The `dev` and preview branches use **scale-to-zero ON**.
5. **Point-in-time restore:** turn it on for the project (history retention ≥ 7 days).
6. **Branches:**
   - `main`: production data.
   - `dev`: local development, reset from `main` weekly with anonymized data.
   - `preview/*`: one branch per pull request through the **Neon + Vercel integration**. Preview deployments read and write their own branch, never production, and the branch is deleted on merge.
7. **Migrations run on a branch first:** create a branch from `main`, run `npm run db:migrate` against it, verify, then run the same migration on `main`. CI does this automatically for every PR (see below).

### Database commands

```bash
npm run db:generate                          # generate a migration from db/schema changes
npx drizzle-kit generate --custom --name=x   # empty migration for raw SQL (triggers, views, indexes)
npm run db:migrate                           # apply migrations (direct connection)
npm run db:seed                              # full seed (downloads the Census Gazetteer places file)
SEED_SKIP_GAZETTEER=1 npm run db:seed        # use the built-in list of ~110 major cities instead
SEED_DEMO_COUNT=100000 npm run db:seed       # load-test volume for search/autocomplete benchmarks
npm run db:studio
```

> drizzle-kit renders the PostGIS type as a quoted identifier. After `db:generate`, check new migrations for `"geography(Point, 4326)"` and unquote it.

Schema notes:

- `businesses.search_vector` is a generated `tsvector` (name A, categories + tags B, city + state C, description D) built from denormalized columns kept in sync by `refresh_business_search(id)`.
- `businesses.location` (and `cities.center`, `states.center`) are `geography(Point, 4326)`, filled by triggers from `lat`/`lng` on every save.
- `avg_rating`/`review_count` are recomputed by `refresh_business_rating(id)` inside the same transaction as each review write.
- `listing_counts` is a materialized view (category / state / city / city + category, children rolled up into parents), refreshed `CONCURRENTLY` every 15 minutes.
- `event_log` (BRIN on `created_at`) is rolled up nightly into `business_stats_daily`; raw rows older than 90 days are deleted. Dashboard charts read only the daily table.

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit (run `npx next typegen` first on a fresh clone)
npm run lint
npm test             # Vitest unit tests (tests/unit)
npm run test:db      # DB integration: migrations, triggers, search SQL, data layer on PGlite + PostGIS (no Neon needed)
npm run test:e2e     # Playwright (tests/e2e), see "Testing"
```

## Deployment (Vercel)

1. Import the repo into Vercel. `vercel.json` pins functions to **`iad1`** and registers the cron jobs.
2. Install the **Neon integration** on the Vercel project and link the Neon project. It injects `DATABASE_URL`/`DATABASE_URL_UNPOOLED` for production and creates a branch per preview deployment.
3. Add the remaining environment variables for Production and Preview. Use Turnstile test keys and Stripe test keys on Preview.
4. Add a build step or GitHub Action that runs `npm run db:migrate` against the target branch before promoting a deployment.
5. Cron jobs (`/api/cron/*`) authenticate with `Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically when `CRON_SECRET` is set.

| Cron | Schedule | Job |
| --- | --- | --- |
| `/api/cron/refresh-counts` | every 15 min | `REFRESH MATERIALIZED VIEW CONCURRENTLY listing_counts`, then revalidate the `listing-counts` tag |
| `/api/cron/rollup-stats` | nightly 04:15 UTC | upsert yesterday + today from `event_log` into `business_stats_daily`; delete events older than 90 days |
| `/api/cron/cleanup-drafts` | nightly 04:45 UTC | purge listings soft-deleted > 30 days, drafts idle > 90 days, expired verification codes, soft-deleted reviews/landing pages > 30 days |

Sentry is a no-op until `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set (`instrumentation.ts`, `instrumentation-client.ts`). Source maps upload automatically when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are set (`next.config.ts` wraps the config with `withSentryConfig` only then).

## Project structure

```
app/
  (public)/        home, search, categories, category, states, top-pros, biz/[slug], p/[slug], blog,
                   pricing, contact, faqs, testimonials, terms, privacy
  (auth)/          login, register, forgot-password, reset-password, verify-email
  dashboard/       owner dashboard
  admin/           admin panel
  actions/         Server Actions (every form mutation)
  api/auth/[...all]  Better Auth handler
  api/v1/          public REST API (Bearer API keys, 60 req/min)
  api/cron/        refresh-counts, rollup-stats, cleanup-drafts
  api/events       lightweight analytics beacon (call/website/directions clicks, views)
  sitemap.ts, robots.ts, manifest.ts, icon.tsx
db/
  schema/          one file per domain
  migrations/      0000 extensions, 0001 tables, 0002 triggers/indexes/functions/materialized view
  seed/            taxonomy, states, Census Gazetteer cities, demo businesses, content
lib/               db, auth, search, geo, r2, images, email, sms, ratelimit, turnstile, action, data/*, validations/*
components/        ui, layout, listing, search, seo, forms, shell, content, dashboard, admin
emails/            React Email templates
tests/             unit (Vitest), e2e (Playwright)
proxy.ts           guards /dashboard and /admin, 301s old slugs (slug_redirects)
```

## Caching and revalidation

The app uses **Cache Components** (`cacheComponents: true`):

- Data reads are `"use cache"` functions with a `cacheLife` profile and `cacheTag`s (`lib/data/*`, `lib/settings.ts`). Tags are built in `lib/cache-tags.ts`: `business:{id}`, `business-slug:{slug}`, `category:{slug}`, `state:{slug}`, `city:{state}/{city}`, `listings`, `listing-counts`, `reviews:{businessId}`, `content:{kind}`, `settings`.
- Pages render a static shell; anything that reads `params`, `searchParams`, cookies or the session sits inside `<Suspense>`. Category, state, city, Top Pros and business pages pre-render their most popular paths with `generateStaticParams`; the rest render on first visit and are then cached (ISR).
- Every Server Action follows the same flow (`lib/action.ts`): Zod validation → session → role/ownership → rate limit (+ Turnstile) → database write → `updateTag` (read-your-own-writes) or `revalidateTag(tag, "max")` → toast. `lib/revalidate.ts#revalidateBusiness` expires every tag a business change touches.
- Search results (`/search`) are dynamic, streamed with Suspense skeletons.

## SEO

- `generateMetadata` on every route (`lib/meta.ts#pageMeta` for title, description, canonical, Open Graph and Twitter).
- JSON-LD: Organization + WebSite/SearchAction (home), LocalBusiness + AggregateRating + Review (profiles), ItemList (listing pages and Top Pros), BreadcrumbList (all inner pages), FAQPage, Article (blog and Top Pros).
- Sitemaps: `app/sitemap.ts` + `generateSitemaps`, split by type and paged at 45,000 URLs: `/sitemap/static-0.xml`, `categories-0`, `states-0`, `cities-N`, `city-categories-N` (only city + category pages with ≥ 3 listings), `businesses-N`, `top-pros-0`, `blog-0`. `robots.txt` lists them all and blocks `/dashboard`, `/admin`, `/api/` and `/search`; preview deployments are `Disallow: /`.
- Thin city + category pages (< 3 listings) and search result pages are `noindex`.

### Top Pros URLs

Top Pros articles live at **`/top-pros/[slug]`** (for example `/top-pros/best-plumbers-in-chicago-il`) and share the dynamic segment with state pages (`/top-pros/illinois`). The page resolves state slugs first and falls back to an article slug, so both URL shapes from the spec work without a prefix. City pages are `/top-pros/[state]/[city]`. Admins should keep article slugs in the `best-…-in-…` form so they can never collide with a state slug.

## Testing

- **Unit (Vitest):** `tests/unit` covers slugs, entity decoding, excerpts, phones, video URLs, open-now logic (split shifts, overnight ranges, 24 h, time zones), bbox parsing, search param parsing and all form schemas.
- **E2E (Playwright):** `tests/e2e` covers register, the add-business wizard, edit, SMS verification, claim, review, message, support ticket and API key flows. They run against a deployment backed by a **Neon preview branch**:

  ```bash
  PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app E2E_DATABASE_URL=<preview branch pooled URL> npm run test:e2e
  ```

  The suite writes to that branch (marks test emails verified, swaps in a known verification-code hash) and refuses to run when `NEON_BRANCH` looks like production.
- **CI (`.github/workflows/ci.yml`):** typecheck, lint and unit tests on every PR; then a throwaway Neon branch is created from `dev`, migrated and seeded, the app is built and started, Playwright runs, and the branch is deleted. Requires the `NEON_API_KEY` and `E2E_BETTER_AUTH_SECRET` secrets and the `NEON_PROJECT_ID` variable.

## Category taxonomy notes

The seed creates 30 parent categories. Duplicate children were removed (Accountants and Tax Services exist only under Accounting & Tax Services). Three children were renamed because their slug would collide with a parent category:

| Spec name | Seeded as | Parent |
| --- | --- | --- |
| Snow Removal | Snow Removal Services | Snow Removal |
| Insurance | Insurance Services | Banking & Finance |
| Marketing | Media Marketing | News & Media |
