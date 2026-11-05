# RaveSoft AI Automation Platform — repository audit & implementation plan

## Phase 1 audit (findings)

| Area | Existing | Decision |
|---|---|---|
| Framework | Next.js 16.2 (App Router, `proxy.ts` replaces middleware, async `params`), React 19, Tailwind 4 | Keep. New code lives in `src/app/(marketing)/ai-automation`, `src/app/admin/(dashboard)/ai-automation`, `src/app/api/ai-automation`, `src/lib/ai-automation` |
| DB | Prisma 6 + MySQL, `prisma db push` (no migrations folder), tables `companies/contacts/leads/system_settings/os_*` | Add `ai_*` models to the same schema. New leads also create `Company`/`Contact`/`Lead` rows so the existing CRM sees them (no duplicate contact store) |
| Auth | Env admin login (JWT cookie, `proxy.ts` guards `/admin/*`) + `OsUser` rows + RBAC (`src/lib/os/rbac.ts`) + `api()` wrapper | Reuse. Add `ai.*` permissions to RBAC |
| Email | nodemailer SMTP (`src/lib/mail/transporter.ts`) | Reuse transporter; add `ai_email_logs` with honest status (SMTP acceptance ≠ delivery) |
| AI | `src/lib/os/llm.ts` multi-provider router (OpenAI/Anthropic/Gemini) | Wrap behind an `AnalysisProvider` interface; deterministic fallback when no key |
| Anti-spam | `guardForm` (rate limit, honeypot, signed time token, Turnstile, content heuristics) | Reuse with a new `aiAssessment` policy |
| Jobs | `os_tasks` queue driven by GitHub-Actions cron hitting `/api/os/cron`; Vercel serverless | New `ai_jobs` table (idempotency key, retries/backoff). Run inline via `after()` and drained by the existing cron tick |
| Hosting | Vercel (no `vercel.json`), no filesystem persistence | PDFs stored in MySQL (`LONGBLOB`), served only via signed link or admin auth |
| SEO | Static sitemap, per-page metadata, JSON-LD components (`FAQSchema`, `BreadcrumbSchema`) | Add new URLs only; no existing URL/metadata changed |
| Existing `/ai-employee` assessment | 5-question lead magnet | Untouched |

## Principles
1. One shared backend; nine pages are thin views over industry configuration.
2. Industry/solution/question config is code-seeded into MySQL and editable in admin; pages read DB with a code fallback (build/DB-outage safe).
3. **No invented prices.** Seeded solutions have no price. Anything without an approved price → `MANUAL_REVIEW`; no proposal can be sent from an incomplete quote.
4. AI never emits prices. Schema has no price fields; recommendations must reference catalogue keys; output is zod-validated.
5. Nothing is claimed delivered unless a provider event confirms it.

## Phases
1 audit → 2 design system → 3 `/ai-automation` → 4 eight industry pages → 5 assessment engine → 6 AI consultant → 7 catalogue + pricing → 8 proposals/PDF → 9 email + follow-ups → 10 admin → 11 Kovabot abstraction → 12 tests/QA → 13 deployment docs.
