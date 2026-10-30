import { expect, test } from "@playwright/test";

import {
  captureVisual,
  countDifferingPixels,
  getVisualBaseline,
  getVisualMaskSelectors,
  localOrigin,
  sanitizeLabel,
  suppressSitePromo,
  visualMappings,
  visualPixelDiffThreshold,
  visualViewports,
  waitForFontsReady,
  writeBinaryArtifact,
  writeJsonArtifact,
  writeSuiteSummary,
} from "./support/qa-helpers";

const visualParitySummary: Array<Record<string, unknown>> = [];
const VISUAL_DIFF_TOLERANCE = Number(process.env.VISUAL_DIFF_TOLERANCE ?? (process.env.CI ? "80000" : "50000"));

test.beforeEach(async ({ context }) => {
  await suppressSitePromo(context);
});

test("font readiness rejects a loaded font set that lacks required webfont faces", async ({ page }) => {
  await page.setContent(`<!doctype html><style>
    :root { --font-jakarta-sans: "Missing QA Body Font"; --font-fraunces: "Missing QA Heading Font"; }
  </style><p>Home</p>`);
  expect(await page.evaluate(() => document.fonts.status)).toBe("loaded");
  await expect(waitForFontsReady(page)).rejects.toThrow("Required webfont did not load");
});

for (const route of visualMappings) {
  for (const [viewportLabel, viewport] of Object.entries(visualViewports)) {
    test(`visual parity ${route.label} on ${viewportLabel}`, async ({ page }, testInfo) => {
      let publication: unknown;
      if (process.env.PREVIEW_URL?.trim() && route.localPath === "/" && viewportLabel === "mobile") {
        const response = await page.request.get(`${localOrigin}/api/course-schedule-status`, { timeout: 10_000 });
        expect(response.ok(), "Read the bundled schedule publication before choosing a reviewed mobile homepage reference").toBe(true);
        publication = await response.json();
      }
      const baseline = getVisualBaseline(route.localPath, viewportLabel, publication);
      const localVisual = await captureVisual(
        page,
        `${localOrigin}${route.localPath}`,
        viewport,
        getVisualMaskSelectors(route.localPath),
      );
      const differingPixels = countDifferingPixels(
        baseline.image,
        localVisual.screenshot,
      );

      const result = {
        baselinePath: baseline.baselinePath,
        differingPixels,
        fontDiagnostics: localVisual.fontDiagnostics,
        label: route.label,
        localPath: route.localPath,
        status: differingPixels <= VISUAL_DIFF_TOLERANCE ? "passed" : "failed",
        viewport: viewportLabel,
      };

      visualParitySummary.push(result);
      writeJsonArtifact(testInfo, `${sanitizeLabel(route.label)}-${viewportLabel}-font-diagnostics.json`, localVisual.fontDiagnostics);
      expect(localVisual.fontDiagnostics.usesExpectedNavFont,
        "Visible desktop navigation must render with the custom Plus Jakarta Sans webfont",
      ).toBe(true);

      if (differingPixels > VISUAL_DIFF_TOLERANCE) {
        writeBinaryArtifact(
          testInfo,
          `${sanitizeLabel(route.label)}-${viewportLabel}-baseline.png`,
          baseline.image,
        );
        writeBinaryArtifact(
          testInfo,
          `${sanitizeLabel(route.label)}-${viewportLabel}-local.png`,
          localVisual.screenshot,
        );
        writeJsonArtifact(
          testInfo,
          `${sanitizeLabel(route.label)}-${viewportLabel}-visual-summary.json`,
          {
            baselinePath: baseline.baselinePath,
            differingPixels,
            localDiagnostics: localVisual.diagnostics,
            fontDiagnostics: localVisual.fontDiagnostics,
            localUi: localVisual.ui,
            route,
            viewport,
          },
        );
      }

      expect(
        differingPixels,
        `${route.localPath} drifted visually from the committed baseline on ${viewportLabel}`,
      ).toBeLessThanOrEqual(VISUAL_DIFF_TOLERANCE);
    });
  }
}

test.afterAll(async () => {
  writeSuiteSummary("parity-visual.json", {
    baselineDir: "tests/baselines/live/visual",
    generatedAt: new Date().toISOString(),
    localOrigin,
    visualDiffTolerance: VISUAL_DIFF_TOLERANCE,
    visualPixelDiffThreshold,
    results: visualParitySummary,
  });
});
