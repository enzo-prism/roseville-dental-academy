# Roseville Dental Academy

This repo is a production-ready, live-faithful Next.js rebuild of [rosevilledentalacademy.com](https://rosevilledentalacademy.com).

The current runtime is a shell-first hybrid:

- React owns the shared shell: header, navigation, mobile menu, footer, contact blocks, cookie banner, the WhatsApp click-to-chat button, and ElevenLabs placement.
- Sanitized frozen snapshots provide page-specific content and imagery.
- Stable React replacements handle widgets that were unstable in the original GoDaddy runtime.
- Snapshot files remain the visual/content reference and QA baseline, not the long-term source for shared shell behavior.

## How It Works

- `app/[[...slug]]/page.tsx` renders public and utility routes through the App Router.
- `lib/live-route-data.ts` decorates `snapshot/live/manifest.json` into the typed route registry.
- `components/site/live-*.tsx` contains the reusable live-faithful shell and stable widget replacements.
- `app/globals.css` contains shell CSS variables and scoped snapshot compatibility styles.
- `components/site/whatsapp-fab.tsx` renders the global WhatsApp click-to-chat floating button (mounted once in `app/layout.tsx`); `components/site/whatsapp-icon.tsx` holds the official WhatsApp logo glyph (sourced via svgl). The number, prefilled message, label, and pre-built `wa.me` link live in `siteContact` / `whatsAppUrl` in `lib/site-data.ts`. Inline "Message Us on WhatsApp" CTAs appear in the footer, contact section, and ad landing hero.
- `snapshot/live/html/*.html` contains frozen source pages used for sanitized page bodies.
- `public/__live/` and `public/assets/live/` contain mirrored live assets.
- `tests/baselines/live/` contains committed content and visual baselines.

## Design System

The code-facing visual contract lives in `DESIGN.md`.

For any UI, shell, styling, widget, navigation, or layout task:

1. Read `AGENTS.md`.
2. Read `DESIGN.md`.
3. Use `.agents/skills/ui-design-system/SKILL.md` for the repeatable UI workflow.
4. Prefer existing `rda-*` shell classes and design tokens before creating new patterns.

Design tooling:

```bash
pnpm design:lint
pnpm design:sync
pnpm design:check
```

`pnpm design:sync` exports:

- `generated/tailwind.theme.json`
- `generated/tokens.json`

## Local Development

Install and run the draft locally:

```bash
pnpm install
pnpm dev --hostname 127.0.0.1 --port 3000
```

To verify the production build locally:

```bash
pnpm build
pnpm start --hostname 127.0.0.1 --port 3000
```

## Snapshot Refresh

Refresh the frozen snapshot and committed baselines from the current live production site:

```bash
pnpm snapshot:refresh
```

This updates:

- `snapshot/live/html/`
- `snapshot/live/assets.json`
- `public/__live/`
- `tests/baselines/live/content/`
- `tests/baselines/live/visual/`

Use this intentionally when the live site changes. Normal QA compares against committed baselines and does not hit live production in real time.

## Course Approval Sources

Course approval details, Dental Board of California source links, and provider-number copy rules live in [docs/course-approvals.md](docs/course-approvals.md).
Check that document before editing regulatory, prerequisite, or course-provider claims.

## QA Commands

- `pnpm lint`: ESLint across app, components, lib, tests, and config.
- `pnpm build`: production Next.js build.
- `pnpm test:smoke`: route/status/title sanity checks on localhost.
- `pnpm test:interactions`: nav, contact, newsletter, cookie, and widget behavior.
- `pnpm test:parity-content`: visible content parity against committed baselines.
- `pnpm test:ux`: overflow, header, placeholder image, console, and runtime stability checks.
- `pnpm test:parity-visual`: visual regression checks against committed screenshots.
- `pnpm test:release`: full local production gate using `pnpm build && pnpm start`.
- `pnpm test:preview`: run the same gate against a Vercel preview by setting `PREVIEW_URL`.

## Analytics And Pixels

The analytics and paid-media event contract lives in [docs/analytics.md](docs/analytics.md).
Current sitewide tracking includes GA4, Vercel Analytics, Hotjar, and Meta Pixel.
Pixel components live under `components/site/*-analytics.tsx` and `components/site/*-pixel.tsx`,
with global mounting handled in `app/layout.tsx`.

WhatsApp click-to-chat clicks are tracked through the document-level delegation in
`components/site/interaction-analytics.tsx` (keyed on `data-rda-whatsapp`): they fire a
Vercel `contact_action`, a GA `whatsapp_click`, and a Meta Pixel `Contact` event, mirroring
the existing `tel:`/`mailto:` contact actions. The WhatsApp UI is icon-only/label-stripped and
excluded from the content and visual QA baselines the same way the ElevenLabs widget is
(see `tests/support/qa-helpers.ts`), so adding it does not require a baseline refresh.

Paid social landing pages live under `/lp/*` and are intentionally noindex:

- `/lp/dental-assisting-student-story`
- `/lp/dental-assisting-enroll`
- `/lp/dental-assisting-tiktok`
- `/lp/infection-control-office-awareness`
- `/lp/infection-control-office-compliance`
- `/lp/coronal-polish-office-awareness`
- `/lp/coronal-sealants-renewal`
- `/lp/rda-renewal-ready`
- `/lp/pit-fissure-sealants-rda`

Use UTMs for ad attribution, for example:
`/lp/dental-assisting-student-story?utm_source=facebook&utm_medium=paid_social&utm_campaign=dental_assisting_testimonial&utm_content=student_video_01`.

Use `/lp/dental-assisting-tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=dental_assisting_tiktok&utm_content=video_01` for TikTok Dental Assisting Program ads.

Important env vars:

- `SITE_URL`: canonical production URL used for metadata, sitemap, and robots.
- `LOCAL_ORIGIN`: override localhost target for QA.
- `PREVIEW_URL`: target a deployed preview instead of local webserver startup.
- `BASELINE_DIR`: alternate baseline location; defaults to `tests/baselines/live`.
- `NEXT_PUBLIC_META_PIXEL_ID`: optional override for the Meta Pixel ID.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: optional override for the GA4 measurement ID.
- `NEXT_PUBLIC_HOTJAR_SITE_ID`: optional override for the Hotjar site ID.

## CI And Preview Verification

- `.github/workflows/release-gate.yml` runs the local production gate on pull requests and pushes to `main`.
- `.github/workflows/vercel-preview-verify.yml` runs smoke, parity, UX, and visual checks against successful Vercel preview deployment URLs.
- Both workflows upload Playwright/test artifacts on failure.
- Release QA and visual-baseline triage are documented in [docs/release-qa.md](docs/release-qa.md).

Visual parity failures should be triaged from the uploaded artifacts before changing code or baselines. If a visual drift is intentional, content parity and UX stability should pass first, then only the affected baseline PNGs should be refreshed. Do not raise the visual tolerance to approve an intentional redesign.

## Deployment Notes

- Default canonical host comes from `SITE_URL` and falls back to `https://rosevilledentalacademy.com`.
- `vercel.json` keeps encoded-path redirects for source-compatible entry points.
- GoDaddy commerce/member backends are not rebuilt here; member/auth pages stay static/noindex utility screens unless a real backend is chosen later.
- Production deployment and post-deploy verification steps live in [docs/production-runbook.md](docs/production-runbook.md).
