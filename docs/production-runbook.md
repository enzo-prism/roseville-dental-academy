# Production Deployment Runbook

This repo deploys the public Roseville Dental Academy website. Keep it separate from the private RDA dashboard and lead operations repo.

## Production Path

- Git remote: `https://github.com/enzo-prism/roseville-dental-academy.git`
- Production branch: `main`
- Production host: `https://www.rosevilledentalacademy.com` (the apex redirects here)
- Framework: Next.js on Vercel
- Canonical URL source: `SITE_URL`, falling back to `https://www.rosevilledentalacademy.com`

Normal release flow:

1. Run local verification.
2. Commit the website and documentation changes together.
3. Push `main` to GitHub.
4. Let Vercel create the production deployment from the pushed commit.
5. Verify the production domain, not only the Vercel deployment URL.

## Pre-Push Gate

Run the smallest affected suites while developing, then use the production gate before release:

```bash
pnpm lint
pnpm build
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:smoke
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:interactions
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:parity-content
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:ux
```

Run visual parity when layout, imagery, page structure, or visual baselines change:

```bash
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:parity-visual
```

## Post-Deploy Checks

After Vercel marks the deployment ready, verify live production routes:

The apex homepage should return `307` with `Location: https://www.rosevilledentalacademy.com/`; the `www` routes should return `200`.

```bash
curl -I https://rosevilledentalacademy.com/
curl -I https://www.rosevilledentalacademy.com/
curl -I https://www.rosevilledentalacademy.com/lp/dental-assisting-enroll
curl -I https://www.rosevilledentalacademy.com/lp/dental-assisting-tiktok
curl -I https://www.rosevilledentalacademy.com/lp/infection-control-office-awareness
curl -I https://www.rosevilledentalacademy.com/lp/infection-control-office-compliance
curl -I https://www.rosevilledentalacademy.com/lp/coronal-polish-office-awareness
curl -I https://www.rosevilledentalacademy.com/lp/coronal-sealants-renewal
curl -I https://www.rosevilledentalacademy.com/faqs-1
curl -I https://www.rosevilledentalacademy.com/meet-the-instructors
curl -I https://www.rosevilledentalacademy.com/robots.txt
curl -I https://www.rosevilledentalacademy.com/sitemap.xml
```

Then run the preview/live-capable Playwright checks against the production host when the deployment changes public page output:

```bash
PLAYWRIGHT_NO_WEBSERVER=1 LOCAL_ORIGIN=https://www.rosevilledentalacademy.com pnpm test:smoke
PLAYWRIGHT_NO_WEBSERVER=1 LOCAL_ORIGIN=https://www.rosevilledentalacademy.com pnpm test:parity-content
```

For paid-media changes, also verify attribution and analytics readiness without submitting a fake production lead:

1. Open each dedicated route with test `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_source_platform`, `utm_content`, and a synthetic `fbclid`.
2. Confirm the Dental Assisting form action is `https://formspree.io/f/mpqgyjjg`; confirm the Coronal + Sealants action is `https://formspree.io/f/xzdkgaeg` with hidden `form_key=mwvdrnrk`.
3. Confirm the attribution fields are present on the form and persist when the visitor continues to another RDA form in the same session. Public forms also send `lead_source=website` and `how-heard=website`.
4. Confirm click-to-call and WhatsApp do **not** inherit UTMs or `ad_id`. WhatsApp compose text should include only `how-heard: whatsapp` and `lead_source=whatsapp`. Phone clicks are analytics-only; `tel:` cannot stamp a Formspree or ledger lead without a call-tracking backend.
5. Confirm GA4 (`window.gtag`), Meta Pixel (`window.fbq`), and Vercel Web Analytics are loaded without browser errors.
6. Check the new Vercel deployment logs for runtime errors.

For Meta boosts, compare the live destination against the audited routing table in `docs/analytics.md`. A legacy boosted post whose destination is locked to the original post is not compliant merely because its website route loads; recreate it as a new ad before treating it as fully attributable.

The interaction suite automates the non-submitting form-routing, attribution-persistence, and safe analytics-event checks:

```bash
PLAYWRIGHT_NO_WEBSERVER=1 LOCAL_ORIGIN=https://www.rosevilledentalacademy.com pnpm test:interactions
```

## Current Paid-Media Contract

Active noindex conversion pages:

- `/lp/dental-assisting-student-story`
- `/lp/dental-assisting-enroll`
- `/lp/dental-assisting-tiktok`
- `/lp/infection-control-office-awareness`
- `/lp/infection-control-office-compliance`
- `/lp/coronal-polish-office-awareness`
- `/lp/coronal-sealants-renewal`
- `/lp/rda-renewal-ready`
- `/lp/pit-fissure-sealants-rda`

Active sitewide tracking:

- Vercel Web Analytics
- GA4
- Hotjar
- Meta Pixel

Accepted-lead funnel:

- Vercel: `ad_landing_view` → `cta_click` → `lead_form_submit`
- GA4: `generate_lead` is the key event; do not also mark `lead_form_submit` as a key event.
- Meta: `ViewContent` on the landing page and `Lead` only after Formspree accepts the request.

Formspree operations:

- `mpqgyjjg`: `/lp/dental-assisting-enroll`; dedicated inbox with live Google Sheets delivery.
- `xzdkgaeg`: shared registration/contact inbox and `/lp/coronal-sealants-renewal`; coronal submissions keep `form_key=mwvdrnrk` for exact attribution.
- `mwvdrnrk`: historical coronal/sealants inbox retained for reconciliation; new submissions use `xzdkgaeg`.
- Reports ingest the two live Google Sheets feeds. Historical `mwvdrnrk` records can be reconciled separately. Keep credentials outside the website repository, Vercel, browser code, screenshots, and logs.

Retired tracking:

- Snapchat Pixel is intentionally not mounted.

## Documentation Gate

Before any production push, check these docs when their contracts are touched:

- `README.md`: repo overview, QA scripts, active tracking, landing-page list.
- `AGENTS.md` / `DESIGN.md`: shell/UI contracts, including ElevenLabs host sizing states.
- `docs/analytics.md`: event names, safe payload fields, active/retired pixels.
- `docs/course-approvals.md`: Dental Board source links, provider numbers, copy rules.
- `docs/release-qa.md`: CI gates, visual-baseline triage, release-health debugging.
- `docs/production-runbook.md`: production deploy and live verification steps.

Pushing `main` is the production deploy (Vercel production project tracks `main`). After push, verify `https://rosevilledentalacademy.com`, not only the Vercel deployment URL.
