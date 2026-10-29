# Visual parity references

All PNGs here were captured on Linux (GitHub Actions `ubuntu-latest`, Playwright 1.59.0 / Chromium 147) by
`.github/workflows/capture-visual-baselines.yml` from the production build of the 2026-10-21 "Chairside" redesign
(PR #53), with reduced motion, the seasonal layer off, and the site promo suppressed. They match the Release Gate's
Linux runner; macOS renders differ by large pixel counts, so recapture through the workflow rather than locally.
See docs/release-qa.md ("Capturing baselines on Linux").

Home desktop and mobile references were refreshed for the front desk program
link in PR #65, using Linux capture run 40638954068 at commit 0c9a47b. The new
section was inspected at both widths; all other route images are unchanged.

Home and Photos desktop/mobile references were refreshed for the class-media
sections and mobile swipe shelves in PR #63, using Linux capture run
40949227493 at commit 134be1ec18e93298889fe6ae68ff2aa49a2abd7f. Images were
reviewed at both widths; the staff milestone photo and new doctor-name highlight
are excluded. All other route images are unchanged.

Infection Control desktop and mobile references were refreshed for the
role-specific training-options wording in PR #70, using Linux capture run
40949860075 at reviewed source commit 9d26b89c4b561c954fe12385bfec240be91b703a.
Both complete page images and the notice at desktop/mobile widths were
inspected. Other route images were not replaced. The workflow used the same
reduced-motion, seasonal, promo, and floating-widget isolation as above.
