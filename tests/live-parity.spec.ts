import { expect, test } from "@playwright/test";

import {
  blockElevenLabsWidgetScript,
  buildTextDiff,
  captureSnapshot,
  getContentBaseline,
  localOrigin,
  routeMappings,
  sanitizeLabel,
  writeJsonArtifact,
  writeSuiteSummary,
  writeTextArtifact,
} from "./support/qa-helpers";

const contentParitySummary: Array<Record<string, unknown>> = [];

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await blockElevenLabsWidgetScript(context);
});

for (const route of routeMappings) {
  test(`content parity ${route.label}`, async ({ page }, testInfo) => {
    const baseline = getContentBaseline(route.localPath);
    const localSnapshot = await captureSnapshot(
      page,
      `${localOrigin}${route.localPath}`,
      { viewport: { width: 1280, height: 900 } },
    );

    const mismatches: string[] = [];

    if (baseline.snapshot.status !== localSnapshot.status) {
      mismatches.push(`status ${localSnapshot.status} !== baseline ${baseline.snapshot.status}`);
    }

    if (baseline.snapshot.title !== localSnapshot.title) {
      mismatches.push(`title "${localSnapshot.title}" !== baseline "${baseline.snapshot.title}"`);
    }

    if (baseline.snapshot.bodyText !== localSnapshot.bodyText) {
      mismatches.push("body text drifted from baseline");
    }

    if (JSON.stringify(baseline.snapshot.links) !== JSON.stringify(localSnapshot.visibleLinks)) {
      mismatches.push("visible link labels or hrefs drifted from baseline");
    }

    if (JSON.stringify(baseline.snapshot.buttons) !== JSON.stringify(localSnapshot.visibleButtons)) {
      mismatches.push("visible button labels drifted from baseline");
    }

    if (JSON.stringify(baseline.snapshot.inputs) !== JSON.stringify(localSnapshot.visibleInputs)) {
      mismatches.push("visible input placeholders drifted from baseline");
    }

    if (
      JSON.stringify(baseline.snapshot.aboveFoldImages) !==
      JSON.stringify(localSnapshot.visibleAboveFoldImages)
    ) {
      mismatches.push("above-the-fold image URLs drifted from baseline");
    }

    const result = {
      baselinePath: baseline.route.contentBaselinePath,
      label: route.label,
      localPath: route.localPath,
      mismatches,
      status: mismatches.length === 0 ? "passed" : "failed",
    };

    contentParitySummary.push(result);

    if (mismatches.length > 0) {
      writeJsonArtifact(testInfo, `${sanitizeLabel(route.label)}-content-summary.json`, {
        baselineSnapshot: baseline.snapshot,
        localSnapshot,
        mismatches,
        route,
      });
      writeTextArtifact(
        testInfo,
        `${sanitizeLabel(route.label)}-baseline-body.txt`,
        baseline.snapshot.bodyText,
      );
      writeTextArtifact(
        testInfo,
        `${sanitizeLabel(route.label)}-local-body.txt`,
        localSnapshot.bodyText,
      );
      writeTextArtifact(
        testInfo,
        `${sanitizeLabel(route.label)}-body-diff.txt`,
        buildTextDiff(baseline.snapshot.bodyText, localSnapshot.bodyText),
      );
    }

    expect(mismatches, `${route.localPath} content does not match the committed baseline`).toEqual([]);
  });
}

test.afterAll(async () => {
  writeSuiteSummary("parity-content.json", {
    baselineDir: "tests/baselines/live/content",
    generatedAt: new Date().toISOString(),
    localOrigin,
    results: contentParitySummary,
  });
});
