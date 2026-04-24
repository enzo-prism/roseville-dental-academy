# Roseville Frozen Clone

This repo is a self-contained frozen clone of [rosevilledentalacademy.com](https://rosevilledentalacademy.com). Runtime HTML comes from committed snapshots in `snapshot/live/`, not live fetches, so deployment does not depend on the source site being up.

## How It Works

- `snapshot/live/manifest.json` is the source of truth for mirrored routes, aliases, baselines, and visual masks.
- `snapshot/live/html/*.html` contains the frozen route HTML that the app serves.
- `public/__live/` contains mirrored assets plus frozen replacements for unstable widgets.
- `tests/baselines/live/` contains committed content JSON and visual baselines used by QA.
- `app/[[...slug]]/route.ts` serves the frozen documents directly.

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

Refresh the frozen clone and committed baselines from the current live production site:

```bash
pnpm snapshot:refresh
```

This updates:

- `snapshot/live/html/`
- `snapshot/live/assets.json`
- `public/__live/`
- `tests/baselines/live/content/`
- `tests/baselines/live/visual/`

Use this intentionally when the live site changes. The normal QA gate compares against committed baselines and does not hit live production in real time.

## QA Commands

- `pnpm test:smoke`: route/status/title sanity checks on localhost
- `pnpm test:parity-content`: exact visible content parity against committed baselines
- `pnpm test:ux`: overflow, sticky header, placeholder image, and runtime error checks
- `pnpm test:parity-visual`: visual regression checks against committed screenshots
- `pnpm test:release`: full local production gate using `pnpm build && pnpm start`
- `pnpm test:preview`: run the same gate against a Vercel preview by setting `PREVIEW_URL`

Important env vars:

- `SITE_URL`: canonical production URL used for metadata, sitemap, and robots
- `LOCAL_ORIGIN`: override localhost target for QA
- `PREVIEW_URL`: target a deployed preview instead of local webserver startup
- `BASELINE_DIR`: alternate baseline location; defaults to `tests/baselines/live`

## CI And Preview Verification

- `.github/workflows/release-gate.yml` runs the local production gate on pull requests and pushes to `main`.
- `.github/workflows/vercel-preview-verify.yml` runs smoke, parity, UX, and visual checks against successful Vercel preview deployment URLs.
- Both workflows upload Playwright/test artifacts on failure.

## Deployment Notes

- Default canonical host comes from `SITE_URL` and falls back to `https://rosevilledentalacademy.com`.
- `vercel.json` keeps encoded-path redirects for source-compatible entry points.
- GoDaddy commerce/member backends are not rebuilt here; clone-only endpoints are stubbed locally where needed for stable rendering and QA.
