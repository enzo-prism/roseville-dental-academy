# Production Deployment Runbook

This repo deploys the public Roseville Dental Academy website. Keep it separate from the private RDA dashboard and lead operations repo.

## Production Path

- Git remote: `https://github.com/enzo-prism/roseville-dental-academy.git`
- Production branch: `main`
- Production host: `https://rosevilledentalacademy.com`
- Framework: Next.js on Vercel
- Canonical URL source: `SITE_URL`, falling back to `https://rosevilledentalacademy.com`

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

```bash
curl -I https://rosevilledentalacademy.com/
curl -I https://rosevilledentalacademy.com/lp/dental-assisting-enroll
curl -I https://rosevilledentalacademy.com/lp/dental-assisting-tiktok
curl -I https://rosevilledentalacademy.com/lp/infection-control-office-awareness
curl -I https://rosevilledentalacademy.com/lp/infection-control-office-compliance
curl -I https://rosevilledentalacademy.com/lp/coronal-polish-office-awareness
curl -I https://rosevilledentalacademy.com/lp/coronal-sealants-renewal
curl -I https://rosevilledentalacademy.com/faqs-1
curl -I https://rosevilledentalacademy.com/meet-the-instructors
curl -I https://rosevilledentalacademy.com/robots.txt
curl -I https://rosevilledentalacademy.com/sitemap.xml
```

Then run the preview/live-capable Playwright checks against the production host when the deployment changes public page output:

```bash
PLAYWRIGHT_NO_WEBSERVER=1 LOCAL_ORIGIN=https://rosevilledentalacademy.com pnpm test:smoke
PLAYWRIGHT_NO_WEBSERVER=1 LOCAL_ORIGIN=https://rosevilledentalacademy.com pnpm test:parity-content
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

Retired tracking:

- Snapchat Pixel is intentionally not mounted.

## Documentation Gate

Before any production push, check these docs when their contracts are touched:

- `README.md`: repo overview, QA scripts, active tracking, landing-page list.
- `docs/analytics.md`: event names, safe payload fields, active/retired pixels.
- `docs/course-approvals.md`: Dental Board source links, provider numbers, copy rules.
- `docs/release-qa.md`: CI gates, visual-baseline triage, release-health debugging.
- `docs/production-runbook.md`: production deploy and live verification steps.
