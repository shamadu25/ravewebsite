# AI Automation platform — deployment & operations

## 1. Database
Models are in `prisma/schema.prisma` (all prefixed `ai_*`; back-relation fields only added to `Contact`, `Company`, `Lead`, no column changes). The repo uses `prisma db push` (no migrations folder):
```bash
npm run db:push
```
Then open **Admin → AI Automation → Initialise catalogue** (or it runs automatically on the first submission). Seeding creates only *missing* records and never overwrites admin edits.

## 2. Environment variables (Vercel)
Existing (reused): `DATABASE_URL`, `ADMIN_EMAIL/PASSWORD/SESSION_SECRET`, `SMTP_*`, `SMTP_FROM`, `LEAD_NOTIFICATION_EMAIL`, `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`, `OS_PROVIDER_*`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `FORM_TOKEN_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`.
New (optional):
| Variable | Purpose |
|---|---|
| `AI_AUTOMATION_LINK_SECRET` | Signs private proposal / opt-out links (falls back to `ADMIN_SESSION_SECRET`) |
| `AI_EMAIL_WEBHOOK_SECRET` | HMAC secret for `POST /api/ai-automation/email-events` (delivery confirmations). Without it nothing is ever marked Delivered |
| `KOVABOT_*` | Reserved; ignored until the contract is verified |

## 3. Scheduler
`.github/workflows/os-cron.yml` now also calls `/api/ai-automation/cron` every 15 min (same `CRON_SECRET`/`APP_URL` secrets). It drains the job queue (retries with backoff 30s/2m/8m/32m), expires proposals and sends due follow-ups. New submissions are also processed immediately via `after()`.

## 4. Before go-live (the admin overview shows this checklist live)
No prices are seeded. Enter in **Solutions** (base price, hours, weeks, maintenance) and **Pricing** (complexity multipliers LOW/MEDIUM/HIGH, an `INTEGRATION_FEE` per integration (0 allowed), `PAYMENT_SCHEDULE`, optional margin/approval/tax/discount rules, exchange rates with source+date). Until then every proposal is `MANUAL_REVIEW`, shows no totals and cannot be approved or sent.

## 5. Email delivery status
`ACCEPTED` = SMTP server accepted the message. `DELIVERED`/`BOUNCED` are set only by a signed provider webhook.

## 6. API endpoints
Public: `GET /api/ai-automation/config?industry=`, `POST /assessments`, `POST /events`, `POST /data-request`, `POST /optout`, `POST /email-events` (HMAC), `GET /proposals/[token]/pdf` (signed), `GET /cron` (Bearer CRON_SECRET).
Admin (permission-checked, audited): `POST /admin/seed`, `POST /admin/leads/[id]`, `GET /admin/leads/export`, `POST /admin/assessments/[id]`, `POST /admin/proposals/[id]`, `GET /admin/proposals/[id]/pdf`, `POST|DELETE /admin/pricing/rules`, `PUT /admin/pricing/fx`, `POST /admin/solutions`, `PUT /admin/solutions/[key]`, `POST /admin/industries`, `PUT /admin/industries/[slug]`, `PUT /admin/settings`, `POST /admin/jobs/run`, `POST /admin/jobs/[id]`, `POST /admin/projects/[id]`.
Permissions: `ai.read` (all roles), `ai.write` (sales+), `ai.approve` (manager+), `ai.pricing` (finance/executive+), `ai.settings` (super admin/CEO).

## 7. Marketing claims to verify before publishing
Capability statements on the pages (WhatsApp Business Platform, CRM/PMS/POS integrations "where an API exists", agent behaviours) describe what RaveSoft intends to deliver; confirm each is buildable. No statistics, testimonials, logos or results are claimed. Hero imagery is the existing AI-generated brand image (`/img/business-automation.png`); replace with licensed photography of real teams when available.
