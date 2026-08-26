# Roseville Dental Academy

This repo is a production-ready, live-faithful Next.js rebuild of [rosevilledentalacademy.com](https://www.rosevilledentalacademy.com).

The current runtime is a shell-first hybrid:

- React owns the shared shell: header, navigation, mobile menu, footer, contact blocks, cookie banner, the WhatsApp click-to-chat button, and ElevenLabs placement.
- Sanitized frozen snapshots provide page-specific content and imagery.
- Stable React replacements handle widgets that were unstable in the original GoDaddy runtime.
- Snapshot files remain the visual/content reference and QA baseline, not the long-term source for shared shell behavior.
- ElevenLabs lives in `components/site/elevenlabs-agent-widget.tsx` with host sizing in `app/globals.css` (`.live-elevenlabs-widget`). The host grows for the open horizontal control bar and only shrinks to the orb FAB when the widget is truly minimized — see `AGENTS.md` / `DESIGN.md`.

## How It Works

- `app/[[...slug]]/page.tsx` renders public and utility routes through the App Router.
- `lib/live-route-data.ts` decorates `snapshot/live/manifest.json` into the typed route registry.
- `components/site/live-*.tsx` contains the reusable live-faithful shell and stable widget replacements.
- `app/globals.css` contains shell CSS variables and scoped snapshot compatibility styles.
- `components/site/whatsapp-fab.tsx` renders the global WhatsApp click-to-chat floating button (mounted once in `app/layout.tsx`); `components/site/whatsapp-icon.tsx` holds the official WhatsApp logo glyph (sourced via svgl). The number, prefilled message, label, and pre-built `wa.me` link live in `siteContact` / `whatsAppUrl` in `lib/site-data.ts`. Inline "Message Us on WhatsApp" CTAs appear in the footer, contact section, and ad landing hero.
- `snapshot/live/html/*.html` contains frozen source pages used for sanitized page bodies.
- `public/__live/` and `public/assets/live/` contain mirrored live assets.
- `tests/baselines/live/` contains committed content and visual baselines.
- `components/site/structured-data.tsx` emits all JSON-LD (Organization/LocalBusiness, WebSite, Course list, Course, FAQ, Breadcrumb, Article). Google-sourced testimonials remain visible content but are intentionally omitted from review schema.
- `lib/resource-articles.ts` + `app/resources/**` are the indexable `/resources` content hub (SEO guides). See [docs/seo.md](docs/seo.md).

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

Use Node.js `24.x` and pnpm `10.34.5`; both versions are pinned in `package.json` and CI.

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

## SEO And Structured Data

Organic-search surfaces — JSON-LD structured data, metadata/canonicals, the sitemap/robots/llms.txt trio, the `/resources` content hub, and image performance — are documented in [docs/seo.md](docs/seo.md).

Highlights:

- Review markup: Organization and Course schemas intentionally omit Google-sourced ratings/reviews to avoid self-serving or cross-site review markup. Visible testimonials remain unchanged.
- `/resources` content hub: add a `ResourceArticle` to `lib/resource-articles.ts` and the guide prerenders, joins the sitemap and `llms.txt`, and gets Article + FAQ + Breadcrumb schema automatically. Like `/lp/*`, these routes are outside the QA gate, so they never require a baseline refresh.
- Image loading: `promoteLazyImages` in `lib/live-route-data.ts` adds `decoding="async"` to snapshot images and `loading="lazy"` to all but the LCP image.

## QA Commands

The `pnpm test:*` suites use Playwright and require the browser to be installed once per machine:

```bash
pnpm exec playwright install chromium
```

- `pnpm lint`: ESLint across app, components, lib, tests, and config.
- `pnpm build`: production Next.js build.
- `pnpm test:smoke`: route/status/title sanity checks on localhost.
- `pnpm test:interactions`: nav, contact, newsletter, cookie, and widget behavior.
- `pnpm test:parity-content`: visible content parity against committed baselines.
- `pnpm test:ux`: overflow, header, placeholder image, console, and runtime stability checks.
- `pnpm test:parity-visual`: visual regression checks against committed screenshots.
- `pnpm test:release`: full local production gate using `pnpm build && pnpm start`.
- `pnpm test:preview`: run the same gate against a Vercel preview by setting `PREVIEW_URL`.

Changing course dates or any visible page copy drifts the committed content baselines and must be
refreshed in the same commit; see
[docs/release-qa.md](docs/release-qa.md#updating-content-baselines). For the class-schedule data
itself, follow [docs/course-approvals.md](docs/course-approvals.md#marking-a-class-date-full) — some
dates share a course list, so a careless edit closes courses on unrelated dates.

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
`/lp/dental-assisting-student-story?utm_source={{site_source_name}}&utm_medium=paid&utm_campaign=dental_assisting_testimonial&utm_id={{campaign.id}}&utm_source_platform=meta_ads&utm_content=student_video_{{ad.id}}`.

Current dedicated Meta landing-page examples:

- `/lp/dental-assisting-enroll?utm_source={{site_source_name}}&utm_medium=paid&utm_campaign=dental_assisting_enrollment&utm_id={{campaign.id}}&utm_source_platform=meta_ads&utm_content=student_story_{{ad.id}}`
- `/lp/coronal-sealants-renewal?utm_source={{site_source_name}}&utm_medium=paid&utm_campaign=coronal_sealants_renewal&utm_id={{campaign.id}}&utm_source_platform=meta_ads&utm_content=renewal_ready_original_copy_{{ad.id}}`

Live Saturday Academy ads already use `/lp/dental-assisting-enroll` with `utm_campaign=saturday_academy_sep12` and `utm_content` prefixes `static_photo_`, `tiktok_video_`, or `static_type_` plus the Meta ad id. Do not change those destinations or rewrite the tags to `student_story_`. The site parses that trailing id into hidden `ad_id` and stamps first-touch values onto both `mpqgyjjg` (enroll) and `xzdkgaeg` (course-info).

These routes submit to dedicated Formspree inboxes and capture UTMs plus supported ad click IDs such as `fbclid`. See [docs/analytics.md](docs/analytics.md) for the route-to-inbox map and the local-only, read-only reporting workflow.

The lead runtime keeps separate 90-day first-touch and conversion-touch records, with session-only fallback when browser privacy signals restrict durable storage. Accepted requests use one browser-generated `lead_event_id` across browser events, pass it as Meta's `eventID`, and send a PII-free best-effort receipt to the private attribution ledger. This browser ID is not the immutable Formspree submission `_id`: authenticated reconciliation later establishes canonical identity as `form_id:_id` and verifies the browser receipt. See [docs/analytics.md](docs/analytics.md) for the field, consent, privacy, and reconciliation contracts.

The ChatGPT Ads Measurement Pixel is also mounted sitewide. It uses pixel ID
`Ek4Sce2YRxrGHS3oL51Qac` by default, with an optional
`NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID` override. It measures PII-free `page_viewed` events and
an accepted Formspree request as `lead_created`, reusing `lead_event_id` as OpenAI's
`event_id`. GPC, DNT, and explicit denied RDA consent cookies disable measurement.

Use `/lp/dental-assisting-tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=dental_assisting_tiktok&utm_content=video_01` for TikTok Dental Assisting Program ads.

Important env vars:

- `SITE_URL`: canonical production URL used for metadata, sitemap, and robots.
- `LOCAL_ORIGIN`: override localhost target for QA.
- `PREVIEW_URL`: target a deployed preview instead of local webserver startup.
- `BASELINE_DIR`: alternate baseline location; defaults to `tests/baselines/live`.
- `NEXT_PUBLIC_META_PIXEL_ID`: optional override for the Meta Pixel ID.
- `NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID`: optional override for the ChatGPT Ads Measurement Pixel ID.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: optional override for the GA4 measurement ID.
- `NEXT_PUBLIC_HOTJAR_SITE_ID`: optional override for the Hotjar site ID.
- `NEXT_PUBLIC_FORMSPREE_INFECTION_CONTROL_AD_ENDPOINT`: optional dedicated endpoint for the Infection Control office-compliance landing page; otherwise it uses the shared inbox.
- `NEXT_PUBLIC_FORMSPREE_DENTAL_ASSISTING_TIKTOK_ENDPOINT`: optional dedicated endpoint for the Dental Assisting TikTok landing page; otherwise it uses the shared inbox.

Formspree read-only reporting credentials are operational secrets, not website environment variables. Keep them outside this repository and Vercel.

## CI And Preview Verification

- `.github/workflows/release-gate.yml` runs the local production gate on pull requests and pushes to `main`.
- `.github/workflows/vercel-preview-verify.yml` runs smoke, parity, UX, and visual checks against successful Vercel preview deployment URLs.
- Both workflows upload Playwright/test artifacts on failure.
- Release QA and visual-baseline triage are documented in [docs/release-qa.md](docs/release-qa.md).

Visual parity failures should be triaged from the uploaded artifacts before changing code or baselines. If a visual drift is intentional, content parity and UX stability should pass first, then only the affected baseline PNGs should be refreshed. Do not raise the visual tolerance to approve an intentional redesign.

## Deployment Notes

- Default canonical host comes from `SITE_URL` and falls back to `https://www.rosevilledentalacademy.com`.
- `vercel.json` keeps encoded-path redirects for source-compatible entry points.
- GoDaddy commerce/member backends are not rebuilt here; member/auth pages stay static/noindex utility screens unless a real backend is chosen later.
- Production deployment and post-deploy verification steps live in [docs/production-runbook.md](docs/production-runbook.md).
