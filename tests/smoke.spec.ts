import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import {
  aliasMappings,
  baselineDir,
  captureSnapshot,
  coreWarmRoutes,
  getContentBaseline,
  localOrigin,
  routeMappings,
  sanitizeLabel,
  snapshotRoutes,
  writeJsonArtifact,
  writeSuiteSummary,
} from "./support/qa-helpers";

const smokeSummary: Array<Record<string, unknown>> = [];

test.describe.configure({ mode: "serial" });

test("verify frozen snapshot inputs and required local resources", async ({ request }, testInfo) => {
  const warmedRoutes: Array<{ path: string; status: number }> = [];

  for (const route of routeMappings) {
    const response = await request.get(`${localOrigin}${route.localPath}`, {
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
      timeout: 120_000,
    });

    warmedRoutes.push({ path: route.localPath, status: response.status() });
    expect(response.status(), `${route.localPath} warmup status drifted`).toBe(
      route.expectedStatus,
    );
  }

  for (const resourcePath of ["/sw.js", "/manifest.webmanifest"]) {
    const response = await request.get(`${localOrigin}${resourcePath}`, {
      timeout: 120_000,
    });

    expect(response.status(), `${resourcePath} should be available locally`).toBe(200);
  }

  for (const frozenRoute of snapshotRoutes) {
    const filePath = resolve(process.cwd(), frozenRoute.htmlPath);
    expect(existsSync(filePath), `${frozenRoute.route} snapshot HTML is missing`).toBeTruthy();
    expect(readFileSync(filePath, "utf8").length, `${frozenRoute.route} snapshot HTML should be populated`).toBeGreaterThan(
      0,
    );
    expect(existsSync(resolve(process.cwd(), frozenRoute.contentBaselinePath)), `${frozenRoute.route} content baseline is missing`).toBeTruthy();
  }

  for (const routePath of coreWarmRoutes) {
    const response = await request.get(`${localOrigin}${routePath}`, {
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
      timeout: 120_000,
    });

    expect(response.status(), `${routePath} rerun after warmup failed`).toBeLessThan(500);
  }

  smokeSummary.push({
    baselineDir,
    frozenRouteCount: snapshotRoutes.length,
    warmedRoutes,
    type: "warmup",
  });

  writeJsonArtifact(testInfo, "warmup-summary.json", {
    baselineDir,
    frozenRouteCount: snapshotRoutes.length,
    warmedRoutes,
  });
});

for (const route of routeMappings) {
  test(`smoke ${route.label} serves the expected draft output`, async ({ page }, testInfo) => {
    const snapshot = await captureSnapshot(page, `${localOrigin}${route.localPath}`, {
      viewport: { width: 1280, height: 900 },
    });

    const mismatches: string[] = [];

    if (snapshot.status !== route.expectedStatus) {
      mismatches.push(`status ${snapshot.status} !== ${route.expectedStatus}`);
    }

    if (snapshot.title !== route.expectedTitle) {
      mismatches.push(`title "${snapshot.title}" !== "${route.expectedTitle}"`);
    }

    if (!snapshot.bodyText.toLowerCase().includes(route.smokeText.toLowerCase())) {
      mismatches.push(`body text missing "${route.smokeText}"`);
    }

    if (snapshot.diagnostics.blockingResourceErrors.length > 0) {
      mismatches.push("required local resource errors detected");
    }

    if (route.auth) {
      if (snapshot.visibleButtons.length === 0) {
        mismatches.push("auth route did not expose a visible action button");
      }

      if (snapshot.visibleInputs.length === 0) {
        mismatches.push("auth route did not expose visible inputs");
      }
    }

    if (route.localPath === "/registration" && snapshot.ui.visiblePrimaryNavLabels.length > 0) {
      mismatches.push("plain 404 route rendered shared navigation");
    }

    if (mismatches.length > 0) {
      writeJsonArtifact(testInfo, `${sanitizeLabel(route.label)}-smoke.json`, {
        mismatches,
        route,
        snapshot,
      });
    }

    smokeSummary.push({
      label: route.label,
      mismatches,
      route: route.localPath,
      status: mismatches.length === 0 ? "passed" : "failed",
    });

    expect(mismatches, `${route.localPath} failed smoke validation`).toEqual([]);
  });
}

test("mobile homepage menu opens and reveals live information links", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(6_000);

  await page.getByRole("button", { name: "Hamburger Site Navigation Icon" }).click();
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "More Information" })).toBeVisible();

  await page.getByRole("button", { name: "More Information" }).click();

  await expect(page.getByRole("link", { name: "Meet the Instructors" })).toBeVisible();
  await expect(page.getByRole("link", { name: "FAQs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Photos" })).toBeVisible();

  smokeSummary.push({
    route: "/",
    status: "passed",
    type: "mobile-nav",
  });

  writeJsonArtifact(testInfo, "mobile-nav-summary.json", {
    route: "/",
    status: "passed",
  });
});

test("faq page preserves the live board-approval answers", async ({ page }, testInfo) => {
  const snapshot = await captureSnapshot(page, `${localOrigin}/faqs-1`, {
    viewport: { width: 1280, height: 900 },
  });
  const faqBaseline = getContentBaseline("/faqs-1").snapshot;
  const requiredPhrases = [
    "Yes, our provider number is X899.",
    "Yes, our provider number is IC157.",
  ].filter((phrase) => faqBaseline.bodyText.includes(phrase));

  const missingPhrases = requiredPhrases.filter((phrase) => !snapshot.bodyText.includes(phrase));

  if (missingPhrases.length > 0) {
    writeJsonArtifact(testInfo, "faq-answer-summary.json", {
      missingPhrases,
      snapshot,
    });
  }

  smokeSummary.push({
    missingPhrases,
    route: "/faqs-1",
    status: missingPhrases.length === 0 ? "passed" : "failed",
    type: "faq-copy",
  });

  expect(missingPhrases).toEqual([]);
});

test("alias routes match their canonical mirrored routes", async ({ browser }, testInfo) => {
  const results: Array<Record<string, unknown>> = [];

  for (const alias of aliasMappings) {
    const aliasPage = await browser.newPage();
    const canonicalPage = await browser.newPage();

    try {
      const aliasSnapshot = await captureSnapshot(
        aliasPage,
        `${localOrigin}${alias.aliasPath}`,
        { viewport: { width: 1280, height: 900 } },
      );
      const canonicalSnapshot = await captureSnapshot(
        canonicalPage,
        `${localOrigin}${alias.canonicalPath}`,
        { viewport: { width: 1280, height: 900 } },
      );

      const mismatches: string[] = [];

      if (aliasSnapshot.status !== canonicalSnapshot.status) {
        mismatches.push(`status ${aliasSnapshot.status} !== ${canonicalSnapshot.status}`);
      }

      if (aliasSnapshot.title !== canonicalSnapshot.title) {
        mismatches.push(`title "${aliasSnapshot.title}" !== "${canonicalSnapshot.title}"`);
      }

      if (aliasSnapshot.bodyText !== canonicalSnapshot.bodyText) {
        mismatches.push("body text drifted from canonical");
      }

      if (JSON.stringify(aliasSnapshot.visibleLinks) !== JSON.stringify(canonicalSnapshot.visibleLinks)) {
        mismatches.push("visible links drifted from canonical");
      }

      results.push({
        alias: alias.aliasPath,
        canonical: alias.canonicalPath,
        mismatches,
        status: mismatches.length === 0 ? "passed" : "failed",
      });

      expect(mismatches, `${alias.aliasPath} should match ${alias.canonicalPath}`).toEqual([]);
    } finally {
      await aliasPage.close();
      await canonicalPage.close();
    }
  }

  smokeSummary.push(...results);
  writeJsonArtifact(testInfo, "alias-summary.json", results);
});

test.afterAll(async () => {
  writeSuiteSummary("smoke.json", {
    generatedAt: new Date().toISOString(),
    localOrigin,
    results: smokeSummary,
  });
});
