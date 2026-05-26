# Release QA and Visual Baseline Triage

This repo ships through two GitHub Actions gates:

- `Release Gate` runs on pull requests and pushes to `main`.
- `Vercel Preview Verify` runs after successful Vercel deployment-status events.

Both gates install dependencies, install Playwright Chromium and Pillow, then run the same QA contract against committed baselines. Treat a green local run as useful evidence, but the GitHub run is the source of truth for release health.

## Gate Commands

Local production reproduction:

```bash
CI=true PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:release
```

Preview reproduction:

```bash
PREVIEW_URL=https://example-preview.vercel.app PLAYWRIGHT_NO_WEBSERVER=1 pnpm test:preview
```

Visual parity only:

```bash
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:parity-visual
```

Visual tolerance is intentionally stricter locally than in CI:

- local default: `50000` differing pixels
- CI default: `75000` differing pixels

Use the stricter local default before pushing baseline changes. It catches near-limit drift that CI would allow.

## Baseline Model

- `tests/baselines/live/content/` locks visible text, titles, statuses, links, button labels, input placeholders, and above-fold image URLs.
- `tests/baselines/live/visual/` locks screenshots for selected visual routes.
- `snapshot/live/manifest.json` registers each route's content baseline path, visual baseline paths, and visual masks.
- `tests/support/qa-routes.json` defines the QA route set and visual viewports.

`snapshot/live/` is a migration and parity reference. It is not the current shared shell runtime and should not be treated as the long-term visual source of truth.

## Triage A Failed Visual Gate

1. Confirm GitHub auth and inspect the run.

```bash
gh auth status
gh run view <run-id> --repo enzo-prism/roseville-dental-academy --log-failed
```

2. Download artifacts when screenshots are needed.

```bash
rm -rf /tmp/rda-release-artifacts
mkdir -p /tmp/rda-release-artifacts
gh run download <run-id> --repo enzo-prism/roseville-dental-academy -D /tmp/rda-release-artifacts
```

3. Inspect the failing route summary and screenshots.

Look for:

- `test-results/qa/parity-visual.json`
- `*-visual-summary.json`
- `*-baseline.png`
- `*-local.png`
- `test-failed-1.png`

4. Decide whether the drift is intentional.

Usually safe to accept a visual baseline update only when:

- the changed section is an approved UI/content-layout change,
- `pnpm test:parity-content` passes,
- `pnpm test:ux` passes,
- diagnostics do not show blocking local resources, horizontal overflow, header overlap, or missing primary nav labels.

Usually fix code instead of accepting the screenshot when:

- copy, labels, titles, statuses, endpoints, or placeholders changed unexpectedly,
- the drift is caused by missing assets, lazy image placeholders, widget collision, broken nav, or layout overflow,
- only a third-party script, telemetry request, or transient masked widget moved.

Do not raise `VISUAL_DIFF_TOLERANCE` as the fix for an intentional page redesign. Refresh the affected baseline PNGs instead.

## Updating Visual Baselines

For an intentional local page change, update only the affected visual PNGs.

First, expose the full visual drift set without stopping at the first failing route:

```bash
VISUAL_DIFF_TOLERANCE=999999999 PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:parity-visual
sed -n '1,220p' test-results/qa/parity-visual.json
```

Use that summary to identify every route and viewport that needs either a code fix or an accepted baseline update.

Run the failing visual case with the normal tolerance so Playwright writes artifacts:

```bash
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm exec playwright test tests/live-parity.visual.spec.ts -g "visual parity home on desktop"
```

Then copy the accepted `*-local.png` artifact over the `baselinePath` listed in `*-visual-summary.json`.

Example:

```bash
cp test-results/<failed-case>/home-desktop-local.png tests/baselines/live/visual/home-desktop.png
```

Repeat for each affected route and viewport. Avoid broad `pnpm snapshot:refresh` unless the current live production site is intentionally being re-captured as the source reference.

After changing baselines, run:

```bash
pnpm lint
pnpm build
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:parity-visual
CI=true PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:release
```

After pushing, watch both GitHub workflows:

```bash
gh run list --repo enzo-prism/roseville-dental-academy --limit 8
gh run watch <run-id> --repo enzo-prism/roseville-dental-academy --exit-status --interval 30
```

## Known 2026-05-26 Resolution

The push `Improve SEO, analytics, and Vercel deployment readiness` failed because the homepage visual baseline predated the approved `2026 Class Schedule` homepage section. The fix was commit `4045610`, `Refresh visual baselines for schedule updates`.

Baselines refreshed:

- `tests/baselines/live/visual/home-desktop.png`
- `tests/baselines/live/visual/home-mobile.png`
- `tests/baselines/live/visual/dental-assisting-program-desktop.png`
- `tests/baselines/live/visual/infection-control-desktop.png`

Verification after that fix:

- local `CI=true ... pnpm test:release`: passed
- GitHub `Release Gate`: passed
- GitHub `Vercel Preview Verify`: passed
- production homepage: 200, schedule present, GA4 and Vercel Analytics initialized, no horizontal overflow

The GitHub Node.js 20 Actions deprecation warning is maintenance noise, not the visual parity blocker. Keep any Node 24 runner migration separate from visual-diff triage.
