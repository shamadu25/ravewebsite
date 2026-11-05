# RaveSoft RevenueOS — Assignment 001: Technical Audit & Implementation Plan

Date: 2026-11-05 · Branch: `claude/optimistic-keller-r24ktt` · Baseline verified: `tsc --noEmit` clean, `jest` 49 suites / 466 tests passing.

## 1. What exists today (verified by reading the code)

| Area | Finding |
|---|---|
| Framework | Next.js 16.2.4 (App Router, webpack build), React 19.2, TypeScript, Tailwind 4. `AGENTS.md` warns APIs differ from training data; docs are in `node_modules/next/dist/docs/`. Route protection uses `src/proxy.ts` (not `middleware.ts`). |
| Hosting | Vercel (per brief). `server.js` + `.htaccess` are a legacy Apache/unix-socket path (hard-codes host `ravesoftsolutions.com`); not the production path. |
| DB / ORM | MySQL via Prisma 6.19.3. 59 models in one `prisma/schema.prisma`, **no `prisma/migrations` directory** — schema is applied with `prisma db push`. Org-scoped (`orgId` default `"ravesoft"`). |
| Auth | Env-based single admin login (`ADMIN_EMAIL/PASSWORD`, JWT HS256 cookie via `jose`, 12h) + `OsUser` table and RBAC (`src/lib/os/rbac.ts`: 10 roles, ~30 permissions). No MFA, no password-hash user store for the admin path. |
| Admin UI | `/admin/(dashboard)/*` ~35 pages (leads, revenue, growth, agents, approvals, audit, integrations, forecast…), shell components in `src/components/os/`. Amber/navy styling in `admin.css`. |
| AI layer | `src/lib/os/llm.ts`: provider abstraction, 3 tiers (fast/standard/strong), OpenAI + Anthropic + Gemini, cost tracking. `OsAgent` / `OsTask` / `OsTrace` give an agent runtime with budgets, retries, approvals, audit (`runtime.ts`, `queue.ts` — DB-backed task queue with idempotency keys and stale-task recovery). |
| **Growth Engine** (`gr_*`, feature-flagged `GROWTH_ENGINE_ENABLED`) | Already implements a large part of RevenueOS: ICP profiles, Google-Places discovery, Snov.io enrichment/verification, deterministic scoring (`os/scoring.ts`, `icp.ts`), evidence records, draft generation, **policy gate** (`policy.ts`: no hype, no fake familiarity, opt-out + postal address required), content-hash-bound **approvals**, outbox dispatcher with ordered gates (pause, suppression, verified contact, reply-stops-sequence, inbox-freshness fail-closed, daily/hourly/per-domain caps, min gap), IMAP reply polling + classification (`replies.ts`, `reply-agent.ts`), suppression (email + domain, mirrored to `OsOptOut`, cancels queued sends), one-click unsubscribe, conversion → `OsOpportunity`. |
| CRM / revenue | `OsOpportunity` (stages RESEARCHED→…→WON/LOST/NURTURE), `OsActivity`, `OsCustomer`, `OsRevenueEntry`, `OsCampaign`, forecast, goals, reports (CSV), notifications, alerts, audit log. |
| Email | SMTP (nodemailer) send, IMAP (imapflow) receive, behind a channel adapter (`os/channels`). No ESP webhooks (bounce/complaint/delivery events). |
| Scheduling | GitHub Actions hits `/api/os/cron` every 15 min (`CRON_SECRET`); the tick runs operating loop → heartbeats → IMAP poll → drains task queue → growth dispatch (≤45 s budget, `maxDuration=60`). |
| Marketing site | `(marketing)` route group, SEO schema components, enquiries via `/api/contact` → MySQL + email. Must stay untouched. |
| Tests / CI | Jest (unit), Playwright config, CI = typecheck + jest + build. No Redis/BullMQ/Docker/Sentry anywhere. |

## 2. Gap analysis vs. the RevenueOS directive

**Already covered (extend, don't rebuild):** suppression incl. cancel-on-opt-out, reply-stops-sequence, approval-gated sending, policy gate, rate caps, Snov integration, scoring with stored components/evidence, CRM opportunities, audit log, notifications, LLM abstraction with model tiers, agent runtime with budgets, daily cron.

**Partially covered:** multi-step follow-up cadence (single `followUpDays` config, not a stateful sequence model); reply classification (exists; needs full label set incl. OOO/referral/“contact me later” date); lead score (100-pt but different weights than the directive's 20/20/15/15/15/10/5); product catalogue (`products.ts` is code, not an editable DB catalogue); admin pages (growth exists; no Campaign Manager, Email Studio, Deliverability, Meetings, Revenue-by-product/industry/country, System Monitoring pages).

**Not present:** Apollo.io and Hunter.io adapters; ESP provider with webhooks (bounce/complaint/delivery); Redis + BullMQ + persistent worker; distributed locks; DLQ; timezone/holiday-aware send windows; market-specific compliance policies (GDPR/PECR/CAN-SPAM/NDPA/Ghana DPA); sender-account/domain-auth model; sequences/steps tables; meetings & calendar integration; proposals + pricing rules; MFA; encrypted credential store for integrations; Sentry; daily CEO report; learning/experiments engine; Prisma migrations; ~25 of the 53 requested entities.

## 3. Architecture decisions (and deviations from the directive)

1. **No NestJS rewrite.** The directive says “adapt to the real codebase.” The repo already has a typed API layer (Next route handlers), Prisma, RBAC, audit, and an agent runtime. A second NestJS API would duplicate auth/RBAC/audit and double the surface to secure. **Decision: keep Next.js route handlers as the API; put domain logic in `src/lib/revenueos/*` (framework-free, importable by the worker).** *Needs your confirmation* — if NestJS is a hard requirement, say so before Phase 1.
2. **Persistent worker = separate Node process in `worker/`** (same repo, imports `src/lib/revenueos`), using **BullMQ + managed Redis**, deployed to Railway/Fly/Render (not Vercel). Vercel keeps the UI + webhooks + the existing cron as a fallback tick.
3. **Same MySQL, additive tables only** (`rv_*` prefix, mirroring the `gr_*` convention). No changes to existing tables; no destructive migration. Introduce `prisma migrate` with a baseline of the current schema before the first `rv_*` migration (the DB has so far used `db push`; baselining is a one-time, reviewable step).
4. **RevenueOS lives at `/admin/revenue-os/*`** under the existing auth and later optionally on `revenue.ravesoft.com` via a Vercel domain alias (no code split needed). Marketing routes unchanged.
5. **Growth Engine becomes the delivery core of RevenueOS** rather than being replaced: its gates (`checkGates`) remain the single choke point for every send; new features add gates, never bypass them.
6. **Default sending mode stays MANUAL approval.** SUPERVISED and FULL autopilot are added as an explicit, audited, admin-only setting that agents cannot write. FULL autopilot additionally requires verified SPF/DKIM/DMARC for the sending domain.
7. **Email provider:** keep SMTP/IMAP as the working adapter; add an ESP adapter (recommend **Postmark** or **Amazon SES**) for signed webhooks (bounce/complaint/delivery) — choice depends on your account, see questions.

## 4. Phased plan (each phase: build → tests → keep `tsc`/`jest`/`build` green → commit)

- **P1 Foundation:** Prisma baseline + `rv_*` schema (catalogue, sources, discovered companies, sequences/steps, sender accounts, suppression extensions, meetings, proposals, deals, webhook events, worker jobs, daily metrics); encrypted integration-credential store (AES-256-GCM, `ENCRYPTION_KEY`); `.env.example` additions; mode/authorization settings.
- **P2 Catalogue + scoring:** DB-backed editable product catalogue (all 10 product lines, seeded only with facts already in `products.ts`/site; pricing left empty until you set it); 100-pt scoring per directive weights, thresholds configurable.
- **P3 Providers:** Apollo + Hunter adapters beside Snov (domain search, enrich, verify, fallback + confidence comparison), connection-test/disconnect UI; ESP adapter + webhook signature verification + idempotent `webhook_events`.
- **P4 Sequences & inbox:** stateful 5-step sequences, timezone-aware windows, full reply label set (OOO ≠ interest, future-date follow-ups), reply-before-follow-up ordering enforced by DB transaction + lock.
- **P5 Worker:** BullMQ queues (discover, research, enrich, score, draft, send, inbox, followup), repeatable jobs, backoff, DLQ, heartbeats, Redis locks; Dockerfile + deploy doc.
- **P6 CRM/CEO:** handover briefing, 9-stage pipeline with drag-and-drop + server-validated transitions, meetings, proposal drafts from approved pricing rules, deals + collected revenue.
- **P7 UI:** the 17 navigation sections wired to real queries (reusing `os/ui.tsx` shell).
- **P8 Reports, optimisation, monitoring, Sentry, hardening, E2E against sandbox accounts.**

## 5. Infrastructure & credentials required (none are in this environment)

Managed Redis URL · worker host (Railway/Fly/Render) · MySQL (existing `DATABASE_URL`) · `OPENAI_API_KEY` · Snov/Apollo/Hunter keys · ESP account + verified sending domain (SPF/DKIM/DMARC) · `ENCRYPTION_KEY`, `JWT/ADMIN_SESSION_SECRET` · `SENTRY_DSN` · calendar OAuth client · a **sandbox mailbox** for E2E. Without these, each integration will be implemented and shown as *disconnected with the exact missing variables* — never simulated.

## 6. Hard limits to be upfront about

- Nothing can be deployed or production-verified from this sandbox (no Vercel/Railway/Redis/MySQL access); “Deployment” acceptance items will stay **Blocked by infrastructure** until you provide access.
- “50 qualified prospects/day” is a target; the system will report shortfalls rather than loosen quality gates.
- Cold B2B email is regulated (CAN-SPAM, GDPR/PECR for UK/EU, Ghana DPA 2012, NDPA 2023 in Nigeria). Per-market policies will default to the stricter option and require your/legal sign-off before any market is enabled for automated sending.
- The full directive is multiple weeks of engineering; this plan delivers it in verified increments rather than one unreviewable change.
