# RaveSoft Intelligence — first-party analytics

Admin: `/admin/intelligence` (sidebar: **RaveSoft Intelligence**, 15 sub-pages). Permissions: `analytics.read` (SUPER_ADMIN, CEO, EXECUTIVE, MANAGER, SALES, MARKETING, ENGINEERING), `analytics.manage` (SUPER_ADMIN, CEO, EXECUTIVE). Exports also need `report.export`.

## Architecture
- Tracker `public/rs-intel.js` (async, `lazyOnload`, no dependencies) → `POST /api/intel/collect` → `src/lib/analytics/collect.ts` → MySQL (`analytics_*` tables, additive; existing `visitors`/`visitor_sessions` untouched).
- Lead attribution: `/api/contact` and `/get-started` call `safeRecordLeadConversion` **after** the existing backend saved the lead. It reads first-party cookies `rs_vid`/`rs_sid` (no form changes), runs via Next `after()`, is idempotent per lead (`lead:<id>` unique key) and swallows all errors.
- No Redis, no workers. Daily retention + alerts piggy-back on the existing `/api/os/cron` tick.

## Deploy
1. `npx prisma db push` against production (additive: 7 new `analytics_*` tables, no existing table changed). Review with `prisma migrate diff` first; take a backup.
2. Env (all optional): `NEXT_PUBLIC_ANALYTICS_CONSENT=opt_in|opt_out` (default opt_out; set Settings → consent mode to match), `NEXT_PUBLIC_INTEL_ENABLED=false` (remove tracker), `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PROJECT_URL`.
3. Geolocation uses edge headers (`x-vercel-ip-*` / `cf-ip*`). Behind plain Apache (this repo ships `server.js` + `.htaccess`) there are none: country falls back to a time-zone estimate flagged `timezone_estimate`.
4. Rate limiting of the collector is in-memory per instance (best effort). Upgrade to the shared limiter if abused.

## Definitions
See *Methodology* at the bottom of Analytics Settings (visitor, session = 30 min inactivity or campaign change, active engagement = visible + interaction within 15 s, bounce = engaged-session definition, first/last touch, location accuracy).

## Tests
`npx jest` (unit/route/tracker, 120+ intel tests). Real-DB: `INTEL_TEST_DATABASE_URL=mysql://… npx jest tests/integration` (scratch DB only; deletes analytics rows).

## Known limitations
No GA4/Google Ads/Meta spend import (manual spend entry only); no revenue attribution (no lead→payment link exists); no native .xlsx (CSV with BOM); click heatmaps/replay need PostHog; no broken-link crawler; world map is a bubble map, not a country-shape map; Existing Meta Pixel/Clarity/GA tags are not consent-gated (pre-existing).
