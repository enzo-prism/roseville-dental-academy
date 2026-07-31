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

Production-domain smoke and content checks after a live deployment:

```bash
PLAYWRIGHT_NO_WEBSERVER=1 LOCAL_ORIGIN=https://www.rosevilledentalacademy.com pnpm test:smoke
PLAYWRIGHT_NO_WEBSERVER=1 LOCAL_ORIGIN=https://www.rosevilledentalacademy.com pnpm test:parity-content
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

Additive, non-mirrored routes are intentionally outside `qa-routes.json` so they cannot drift the committed baselines: the paid landing pages (`/lp/*`) and the `/resources/*` content hub (see [seo.md](seo.md)). New pages under those prefixes ship without a baseline refresh. Adding a link to any of them from the shared header/footer, however, does touch gated pages and requires the baseline-refresh flow in [Updating Visual Baselines](#updating-visual-baselines).

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

ElevenLabs is masked in content/visual baselines (`tests/support/qa-helpers.ts`). Behavior is covered by `pnpm test:interactions` (mock embed). When changing widget CSS/TS, assert: orb-minimized slot ≤72px, open control bar slot ≥280px wide with call/dismiss in viewport, expanded sheet fills safely on mobile — never shrink the host to orb size for `compactDefault` alone.

Do not raise `VISUAL_DIFF_TOLERANCE` as the fix for an intentional page redesign. Refresh the affected baseline PNGs instead.

## Updating Content Baselines

Any change to `lib/course-schedule.ts`, course copy, shared header/footer links, or other visible page text drifts `tests/baselines/live/content/`. Refresh it in the same commit as the change. Skipping this is the single most common cause of a red gate, because the failure surfaces on `main` rather than in the branch that caused it.

`tests/live-parity.spec.ts` runs in serial mode, so it **stops at the first failing route and reports the other 19 as "did not run."** One reported failure does not mean one stale route. Refresh, re-run, and repeat until the suite is green — a schedule change usually drifts 8-11 routes, and a shared header/footer link change drifts all of them.

The failing test writes everything needed to accept the drift:

```bash
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:parity-content
sed -n '1,40p' test-results/<failed-case>/<label>-body-diff.txt
```

Review the diff first. Accept it only when every change is one you intended; investigate instead when copy, titles, statuses, endpoints, or placeholders moved unexpectedly.

To accept, rewrite the baseline from `localSnapshot` in `<label>-content-summary.json`, mapping the snapshot keys onto the baseline keys:

| baseline key | `localSnapshot` key |
| --- | --- |
| `aboveFoldImages` | `visibleAboveFoldImages` |
| `buttons` | `visibleButtons` |
| `images` | `visibleImages` |
| `inputs` | `visibleInputs` |
| `links` | `visibleLinks` |
| `bodyText`, `status`, `title` | same name |

Use `localSnapshot` rather than re-deriving the values by hand — it is produced by the same `captureSnapshot()` normalization the comparison uses, so an accepted baseline matches on the next run.

After the suite is green, confirm the accepted diff touched only the fields you expected:

```bash
git diff -U0 tests/baselines/live/content/ | grep -oE '^[+-]  "[a-zA-Z]+"' | sort | uniq -c
```

A schedule or copy change should report `bodyText` only. Unexpected `status`, `title`, `inputs`, or `aboveFoldImages` entries mean something broke rather than drifted.

Avoid `pnpm snapshot:refresh` for this. It re-captures from live production (`LIVE_ORIGIN`) and rewrites visual baselines too; it is for intentionally re-syncing the frozen mirror, not for accepting a local content change.

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

For the full production push checklist, use [production-runbook.md](production-runbook.md).

## Known 2026-07-31 Resolution

`Release Gate` and `Vercel Preview Verify` were red on `main` across four consecutive pushes, ending at `1afe322` `Mark August 8 sealants course full`. Neither `110891c` nor `1afe322` refreshed the content baselines after changing `lib/course-schedule.ts` and the header BLS link, so `content parity home` failed and the serial suite reported the remaining 19 routes as "did not run."

Two drift classes were involved, both intentional:

- schedule text — BLS next-open-date `July 18` → `August 1`, sealants `August 8` → `September 12`, plus two new `Full` badges
- shared header link — `/bls%2Fcpr-1` → the clean `/bls-cpr-1` alias, which drifts every route because the header is on all of them

The fix refreshed 19 content baselines; only `bodyText` and the BLS `href` changed. Two takeaways now covered in [Updating Content Baselines](#updating-content-baselines): one reported failure in a serial suite is not one stale route, and a schedule edit is a page-output change that requires a baseline refresh in the same commit.

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

CI uses Node.js `24.x` and pnpm `10.34.5`, matching `package.json` and the Vercel project runtime. Keep those pins aligned when either workflow is updated.
