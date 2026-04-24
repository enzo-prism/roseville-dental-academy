import { expect, test } from "@playwright/test";

import {
  captureSnapshot,
  localOrigin,
  routeMappings,
  sanitizeLabel,
  uxDevices,
  writeJsonArtifact,
  writeSuiteSummary,
} from "./support/qa-helpers";

const uxSummary: Array<Record<string, unknown>> = [];

test.describe.configure({ mode: "serial" });

for (const route of routeMappings) {
  for (const device of uxDevices) {
    test(`ux stability ${route.label} on ${device.name}`, async ({ page }, testInfo) => {
      const snapshot = await captureSnapshot(page, `${localOrigin}${route.localPath}`, {
        viewport: {
          width: device.width,
          height: device.height,
        },
      });

      const mismatches: string[] = [];

      if (snapshot.status !== route.expectedStatus) {
        mismatches.push(`status ${snapshot.status} !== ${route.expectedStatus}`);
      }

      if (snapshot.ui.overflowX > 0) {
        mismatches.push(`overflowX ${snapshot.ui.overflowX}px`);
      }

      if (snapshot.ui.headerOverlap) {
        mismatches.push("sticky header overlaps the first heading");
      }

      if (snapshot.ui.stickyHeight > device.maxStickyHeight) {
        mismatches.push(
          `sticky header ${snapshot.ui.stickyHeight}px exceeds ${device.maxStickyHeight}px`,
        );
      }

      if (snapshot.ui.overflowIssues.length > 0) {
        mismatches.push("offscreen interactive elements detected");
      }

      if (snapshot.ui.aboveFoldPlaceholderImages.length > 0) {
        mismatches.push("above-the-fold placeholder images detected");
      }

      if (snapshot.diagnostics.pageErrors.length > 0) {
        mismatches.push("pageerror events detected");
      }

      if (snapshot.diagnostics.blockingResourceErrors.length > 0) {
        mismatches.push("required local resource errors detected");
      }

      if (
        device.name !== "mobile" &&
        route.expectedStatus !== 404 &&
        snapshot.ui.visiblePrimaryNavLabels.length > 0 &&
        snapshot.ui.missingPrimaryNavLabels.length > 0
      ) {
        mismatches.push(
          `missing primary nav labels: ${snapshot.ui.missingPrimaryNavLabels.join(", ")}`,
        );
      }

      const result = {
        device: device.name,
        label: route.label,
        mismatches,
        route: route.localPath,
        status: mismatches.length === 0 ? "passed" : "failed",
      };

      uxSummary.push(result);

      if (mismatches.length > 0) {
        writeJsonArtifact(
          testInfo,
          `${sanitizeLabel(route.label)}-${device.name}-ux-summary.json`,
          {
            device,
            mismatches,
            route,
            snapshot,
          },
        );
      }

      expect(mismatches, `${route.localPath} failed UX checks on ${device.name}`).toEqual([]);
    });
  }
}

test.afterAll(async () => {
  writeSuiteSummary("ux-stability.json", {
    generatedAt: new Date().toISOString(),
    localOrigin,
    results: uxSummary,
  });
});
