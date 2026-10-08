# CliqPOS → RaveSoft AI OS: staged rollout

Branch: `feat/ravesoft-os-events` in the CliqPOS repo. Nothing is sent until `RAVE_PRODUCT_WEBHOOK_SECRET` is set.

## 0. Prerequisites (RaveSoft side)
- [ ] RaveSoft latest build is live (needs the `os_revenue_entries.period_months` column → run `prisma db push` against production first).
- [ ] `PRODUCT_WEBHOOK_SECRET` set in Vercel (production); generate with `openssl rand -base64 32`.

## 1. Staging test (CliqPOS staging, pointing at RaveSoft production or a preview URL)
- [ ] Set `RAVE_PRODUCT_WEBHOOK_SECRET` (same value) and `RAVE_OS_URL` in CliqPOS staging `.env`; run `php artisan config:clear`.
- [ ] Register a test business → `/admin/products` shows 1 registration.
- [ ] Complete one sale → activation appears (once only, even after more sales).
- [ ] Approve a test paid subscription → `/admin/customers` shows the customer with the right MRR; `/admin` ARR matches price ÷ period × 12.
- [ ] Approve a renewal of the same business → MRR **unchanged** (not doubled).
- [ ] Run `php artisan ravesoft:send-lifecycle` → usage event appears.
- [ ] Turn the secret off (empty) → no events, no errors in CliqPOS logs.

## 2. Backfill (production, off-peak)
- [ ] `php artisan ravesoft:backfill --dry-run` → read the counts; they should match your real business and subscription totals.
- [ ] `php artisan ravesoft:backfill` → expect "0 rejected".
- [ ] Spot-check 3 customers in RaveSoft against CliqPOS (plan, MRR, status).
- [ ] Remove demo/test businesses in RaveSoft if they slipped in (they appear as customers).
- [ ] Safe to re-run: event ids are stable and duplicates are ignored.

## 3. Go live
- [ ] Deploy the branch to CliqPOS production with the secret set.
- [ ] Make sure a queue worker is running, or accept `QUEUE_CONNECTION=sync` (events then send inline with an 8-second timeout).
- [ ] Confirm the scheduler (`schedule:run` every minute) is active so the 23:50 usage/churn job runs.
- [ ] Watch `/admin/audit` for `product.event` entries and CliqPOS `storage/logs` for `[ravesoft]` warnings for the first 48 hours.

## Rollback
Clear `RAVE_PRODUCT_WEBHOOK_SECRET` in CliqPOS. Sending stops immediately; nothing else in CliqPOS depends on it.
To remove bad data in RaveSoft, ask for a targeted cleanup — do not delete audit rows (the hash chain would break).
