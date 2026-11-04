# `/get-started` — Facebook / Instagram Ads lead-capture landing page

One landing page for every RaveSoft offering, feeding the existing lead system. Route: `/get-started`.

## How it works

```
Ad click ─► /get-started?solution=cliqpos&utm_*&fbclid
              │  server: resolveSolution(query) → preselected option + tailored copy (unknown values ignored)
              ▼
         LeadForm (client) ──POST /api/contact  { formType: "get_started", … }──►  handleLandingLead
                                                   1 validate + sanitise (zod, independent of the client)
                                                   2 same-origin check, 32 KB body cap
                                                   3 anti-spam guard (rate limits, honeypot, signed time-trap token, content checks)
                                                   4 validate attribution (whitelisted keys, relative landing URLs only)
                                                   5 duplicate protection (submissionId, then same email+solution+text)
                                                   6 PERSIST  Contact + Lead(source "website_contact_form") + ConversionEvent("lead_created")
                                                   7 email notification  (failure ⇒ lead kept, `notify_failed` event recorded)
                                                   8 respond { success, eventId }
         browser: fires generate_lead (+ Meta "Lead") ONLY after step 8 says success
```

- **No schema change, no migration.** Reuses `Contact`, `Lead`, `Company`, `ConversionEvent`. Details are stored in `ConversionEvent.metadata`.
- **No new dependency.** `package.json` dependencies and `package-lock.json` are unchanged.
- The existing `/contact` form is unchanged and still uses the same endpoint (backward compatible).

## Query parameters

`?solution=` accepts: `cliqpos`, `erp`, `hospital-management`, `hotel-management`, `school-management`, `restaurant-management`, `legal-practice`, `custom-software`, `ai-automation` (plus `website`, `mobile-app`, `ai-agents`, `automation`, `other`). Anything else is ignored. Campaign parameters are captured automatically: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`.

Suggested ad URLs: `https://ravesoftsolutions.com/get-started?solution=cliqpos&utm_source=facebook&utm_medium=paid_social&utm_campaign=<campaign>&utm_content=<ad>`

## What is stored per lead

`Contact`: first/last name, email (lower-cased), **phone only** (the single "Phone / WhatsApp" field does not set the WhatsApp-consent fields). `Company`: business name. `Lead`: `source = website_contact_form`, `serviceInterest = <solution label>`, `stage = new`.
`ConversionEvent` (`lead_created`) metadata: `channel: "get_started"`, `submissionId`, `solution`, `businessType`, `message`, `page`, `referrer`, `utm_*`, `fbclid`, `attribution.first` / `attribution.latest` (UTM, fbclid, landing URL, referrer, captured time) and `submittedAt`.
If the email could not be sent, a `notify_failed` event is added to the lead.

## Analytics events (via the existing `trackEvent()`)

`landing_page_view`, `lead_form_view`, `lead_form_start`, `lead_form_step_complete` (`contact_details`, `requirements`), `lead_form_error`, `consultation_cta_click`, `generate_lead`.
`generate_lead` (and the Meta standard `Lead`) fire once, only after the server confirms the lead is saved, with `eventID = submissionId`. They are never fired for clicks, form starts, validation errors, failed requests, or an "already received" repeat enquiry. No personal data is sent to analytics.

## Meta Pixel and Conversions API (CAPI) status

| Item | Status |
|---|---|
| Browser Pixel | **Operational in code** — the existing single loader in the shared layout; verified initialised once on this page. Requires `NEXT_PUBLIC_META_PIXEL_ID`. |
| Meta standard `Lead` event | Implemented, with `eventID` for deduplication. |
| Conversions API (server-side) | **NOT implemented / NOT configured.** No CAPI code exists in the repository. |

To add CAPI (needs your approval and credentials): after the lead is saved in `src/lib/landingLead.ts`, POST to `https://graph.facebook.com/<version>/<PIXEL_ID>/events` from the server with `event_name: "Lead"`, `event_id: <submissionId>` (matches the browser `eventID`), `event_time`, `event_source_url`, `action_source: "website"`, and `user_data` containing **SHA-256-hashed** (lower-cased, trimmed) email and phone, plus `client_ip_address`, `client_user_agent` and `fbc`/`fbp` (the `_fbc`/`_fbp` cookies are not read yet). Required server-only environment variables: `META_CAPI_ACCESS_TOKEN` (Events Manager → Dataset → Settings), `META_PIXEL_ID` (same value as the public Pixel id) and, for testing, `META_CAPI_TEST_EVENT_CODE`. The token must never reach client code. Confirm your consent position before sending hashed identifiers.

## Vercel environment variables (names only)

Required for full function: `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `LEAD_NOTIFICATION_EMAIL` (falls back to `CONTACT_EMAIL`), `ADMIN_SESSION_SECRET` (also signs the anti-spam tokens), `NEXT_PUBLIC_META_PIXEL_ID`.
Recommended: `NEXT_PUBLIC_APP_URL` (links inside emails), `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`.
Optional: `FORM_TOKEN_SECRET` (dedicated token secret), `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (only if you later opt in to Cloudflare Turnstile — not enabled by default).
Not needed on Vercel: `TRUSTED_PROXY_HOPS` (the real client IP is read from Vercel's headers).
If `DATABASE_URL` is wrong or unreachable the page still loads, but submissions return a clear error (never a false success).

## Deployment (preview first — do not go straight to production)

1. Push the branch; Vercel builds a **Preview** deployment. Confirm the preview has the variables above (Preview scope).
2. On the preview URL, open `/get-started?solution=cliqpos&utm_source=test&utm_campaign=preview`.
3. Submit a real test enquiry. Confirm: success message; the lead in `/admin/leads` (source "Contact form"); the notification email arrives with subject `New RaveSoft Website Lead — <solution>`.
4. In Meta **Events Manager → Test Events**, confirm one `Lead` (and `generate_lead`) event per submission and no duplicate `PageView` initialisation.
5. Check the page on a real phone (Safari + Chrome).
6. Only after your approval: promote/merge to production.

## Rollback

All changes are additive and there are no migrations. Roll back by reverting the merge commit (or "Instant Rollback" to the previous Vercel deployment). Leads already saved remain valid rows. The legacy `/contact` form is unaffected either way.

## Verified-claims register

Everything on the page was written from facts in the repository / owner brief. No statistics, rankings, ratings, testimonials, logos or partnerships are used.

| Statement on the page | Basis |
|---|---|
| Solutions listed (POS/ERP, hospital, hotel, school, restaurant, legal, custom, websites, mobile, AI agents/employees, automation) | Owner brief; existing `PRODUCTS`/`SERVICES` data |
| "CliqPOS cloud POS is used by businesses in Ghana and Nigeria" | Existing site + owner brief (no number is quoted) |
| "RaveSoft Digital Solutions Ltd, Accra, Ghana" | `COMPANY` in `src/lib/data.ts` |
| "works with businesses in Ghana, Nigeria and other markets" | Owner brief (markets served) |
| Business hours (Mon–Fri 8am–6pm GMT, Sat 9am–2pm GMT) | Existing `/contact` page. **Note:** that page also says "within 1 business day"; the landing page deliberately promises no response time. |
| WhatsApp follow-up number | `COMPANY.whatsapp` (existing site configuration) |
| **Removed / not used:** "Ghana's #1", "Africa's leading", "500+ businesses", "20+ industries", "all 54 countries", named testimonials | Unverified — see the Assignment 002 claims register |

## Known limitations / follow-ups

- No verified real product screenshots or team photos exist in the repo (the existing images are illustrative marketing graphics), so the page uses none. Supplying real screenshots would strengthen it.
- The admin lead-detail page shows the lead and its timeline but not the stored requirements/attribution (admin is a protected area). The same details are in the notification email and in `conversion_events.metadata`.
- Lighthouse itself was not run; Core Web Vitals were measured with Playwright (see the implementation report).
