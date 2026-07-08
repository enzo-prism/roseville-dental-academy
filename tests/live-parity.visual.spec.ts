import { expect, test } from "@playwright/test";

import {
  blockElevenLabsWidgetScript,
  captureVisual,
  countDifferingPixels,
  getVisualBaseline,
  getVisualMaskSelectors,
  localOrigin,
  sanitizeLabel,
  visualMappings,
  visualPixelDiffThreshold,
  visualViewports,
  writeBinaryArtifact,
  writeJsonArtifact,
  writeSuiteSummary,
} from "./support/qa-helpers";

const visualParitySummary: Array<Record<string, unknown>> = [];
const VISUAL_DIFF_TOLERANCE = Number(process.env.VISUAL_DIFF_TOLERANCE ?? (process.env.CI ? "80000" : "50000"));

test.beforeEach(async ({ context }) => {
  await blockElevenLabsWidgetScript(context);
});

for (const route of visualMappings) {
  for (const [viewportLabel, viewport] of Object.entries(visualViewports)) {
    test(`visual parity ${route.label} on ${viewportLabel}`, async ({ page }, testInfo) => {
      const baseline = getVisualBaseline(route.localPath, viewportLabel);
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
        label: route.label,
        localPath: route.localPath,
        status: differingPixels <= VISUAL_DIFF_TOLERANCE ? "passed" : "failed",
        viewport: viewportLabel,
      };

      visualParitySummary.push(result);

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
