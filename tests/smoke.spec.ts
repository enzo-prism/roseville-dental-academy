import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import { socialChannelPages } from "@/lib/social-channel-data";
import {
  aliasMappings,
  baselineDir,
  blockElevenLabsWidgetScript,
  captureSnapshot,
  coreWarmRoutes,
  elevenLabsAgentId,
  elevenLabsScriptSrc,
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

test.beforeEach(async ({ context }) => {
  await blockElevenLabsWidgetScript(context);
});

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

test("GA4 analytics tag and event tracking are configured", async ({ page }, testInfo) => {
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(1_000);

  const result = await page.evaluate(() => {
    const analyticsWindow = window as Window & {
      dataLayer?: unknown[];
      gtag?: unknown;
    };

    return {
      dataLayerReady: Array.isArray(analyticsWindow.dataLayer),
      gtagReady: typeof analyticsWindow.gtag === "function",
      hasBootstrapScript: Boolean(document.querySelector("#rda-google-analytics")),
      hasGtagScript: Boolean(
        document.querySelector(
          'script[src="https://www.googletagmanager.com/gtag/js?id=G-LKJFEYVM1Q"]',
        ),
      ),
    };
  });
  const mismatches: string[] = [];

  if (!result.hasGtagScript) {
    mismatches.push("homepage is missing the GA4 gtag script");
  }

  if (!result.hasBootstrapScript) {
    mismatches.push("homepage is missing the React-owned analytics bootstrap");
  }

  if (!result.dataLayerReady || !result.gtagReady) {
    mismatches.push("homepage did not initialize the GA4 data layer");
  }

  smokeSummary.push({
    mismatches,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "ga4-analytics",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "ga4-analytics-summary.json", {
      mismatches,
      result,
    });
  }

  expect(mismatches).toEqual([]);
});

test("Vercel Analytics tag and custom event function are configured", async ({ page }, testInfo) => {
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(1_000);

  const result = await page.evaluate(() => {
    const analyticsWindow = window as Window & {
      va?: unknown;
      vam?: string;
    };

    return {
      hasNextAnalyticsScript: Boolean(
        document.querySelector('script[data-sdkn="@vercel/analytics/next"]'),
      ),
      mode: analyticsWindow.vam,
      vaReady: typeof analyticsWindow.va === "function",
    };
  });
  const mismatches: string[] = [];

  if (!result.hasNextAnalyticsScript) {
    mismatches.push("homepage is missing the Vercel Analytics Next.js script");
  }

  if (!result.vaReady) {
    mismatches.push("homepage did not initialize the Vercel Analytics event function");
  }

  smokeSummary.push({
    mismatches,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "vercel-analytics",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "vercel-analytics-summary.json", {
      mismatches,
      result,
    });
  }

  expect(mismatches).toEqual([]);
});

test("Hotjar analytics tag is configured", async ({ page }, testInfo) => {
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(1_000);

  const result = await page.evaluate(() => {
    const hotjarWindow = window as Window & {
      _hjSettings?: {
        hjid?: number;
        hjsv?: number;
      };
      hj?: unknown;
    };

    return {
      hasBootstrapScript: Boolean(document.querySelector("#rda-hotjar-analytics")),
      hasHotjarScript: Boolean(
        document.querySelector(
          'script[src="https://static.hotjar.com/c/hotjar-6703871.js?sv=6"]',
        ),
      ),
      hotjarReady: typeof hotjarWindow.hj === "function",
      siteId: hotjarWindow._hjSettings?.hjid,
      version: hotjarWindow._hjSettings?.hjsv,
    };
  });
  const mismatches: string[] = [];

  if (!result.hasBootstrapScript) {
    mismatches.push("homepage is missing the React-owned Hotjar bootstrap");
  }

  if (!result.hasHotjarScript) {
    mismatches.push("homepage is missing the Hotjar tracking script");
  }

  if (!result.hotjarReady || result.siteId !== 6703871 || result.version !== 6) {
    mismatches.push("homepage did not initialize Hotjar settings");
  }

  smokeSummary.push({
    mismatches,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "hotjar-analytics",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "hotjar-analytics-summary.json", {
      mismatches,
      result,
    });
  }

  expect(mismatches).toEqual([]);
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

test("official social channel pages render follow paths", async ({ page }, testInfo) => {
  const results: Array<Record<string, unknown>> = [];
  const mismatches: string[] = [];
  const viewports = [
    { height: 900, label: "desktop", width: 1280 },
    { height: 844, label: "mobile", width: 390 },
  ] as const;

  for (const channel of socialChannelPages) {
    let desktopBodyText = "";
    let desktopTitle = "";
    const viewportResults: Array<Record<string, unknown>> = [];

    for (const viewport of viewports) {
      const snapshot = await captureSnapshot(page, `${localOrigin}${channel.path}`, {
        viewport: { height: viewport.height, width: viewport.width },
      });

      if (viewport.label === "desktop") {
        desktopBodyText = snapshot.bodyText;
        desktopTitle = snapshot.title;
      }

      if (snapshot.status !== 200) {
        mismatches.push(`${channel.path} ${viewport.label} returned ${snapshot.status}`);
      }

      if (snapshot.ui.overflowX > 0) {
        mismatches.push(`${channel.path} ${viewport.label} has horizontal overflow`);
      }

      if (snapshot.ui.aboveFoldPlaceholderImages.length > 0) {
        mismatches.push(`${channel.path} ${viewport.label} has above-fold placeholder images`);
      }

      const heroButtonContrasts = await page
        .locator(`main[data-rda-route="${channel.slug}"] section:first-of-type a[data-slot="button"]`)
        .evaluateAll((buttons) => {
          function parseRgb(value: string) {
            const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

            if (!match) {
              return undefined;
            }

            return [Number(match[1]), Number(match[2]), Number(match[3])] as const;
          }

          function channelToLinear(value: number) {
            const normalized = value / 255;

            return normalized <= 0.03928
              ? normalized / 12.92
              : Math.pow((normalized + 0.055) / 1.055, 2.4);
          }

          function luminance(rgb: readonly [number, number, number]) {
            return (
              0.2126 * channelToLinear(rgb[0]) +
              0.7152 * channelToLinear(rgb[1]) +
              0.0722 * channelToLinear(rgb[2])
            );
          }

          function contrastRatio(
            foreground: readonly [number, number, number],
            background: readonly [number, number, number],
          ) {
            const lighter = Math.max(luminance(foreground), luminance(background));
            const darker = Math.min(luminance(foreground), luminance(background));

            return (lighter + 0.05) / (darker + 0.05);
          }

          return buttons.map((button) => {
            const styles = window.getComputedStyle(button);
            const color = parseRgb(styles.color);
            const backgroundColor = parseRgb(styles.backgroundColor);

            return {
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              contrast:
                color && backgroundColor
                  ? Number(contrastRatio(color, backgroundColor).toFixed(2))
                  : 0,
              text: button.textContent?.replace(/\s+/g, " ").trim() || "",
            };
          });
        });

      for (const button of heroButtonContrasts) {
        if (button.contrast < 4.5) {
          mismatches.push(
            `${channel.path} ${viewport.label} hero button "${button.text}" contrast ${button.contrast}`,
          );
        }
      }

      viewportResults.push({
        heroButtonContrasts,
        overflowX: snapshot.ui.overflowX,
        status: snapshot.status,
        title: snapshot.title,
        viewport: viewport.label,
      });
    }

    const profileLinks = await page
      .locator(`main[data-rda-route="${channel.slug}"] a[href="${channel.profileHref}"]`)
      .evaluateAll((links) =>
        links.map((link) => ({
          rel: link.getAttribute("rel") || "",
          target: link.getAttribute("target") || "",
          text: link.textContent?.replace(/\s+/g, " ").trim() || "",
        })),
      );
    const internalCrossLinks = await page
      .locator(`main[data-rda-route="${channel.slug}"] a[href^="/"]`)
      .evaluateAll((links) =>
        links.map((link) => ({
          href: link.getAttribute("href") || "",
          text: link.textContent?.replace(/\s+/g, " ").trim() || "",
        })),
      );
    const officialBrandLogoCount = await page
      .locator(
        `main[data-rda-route="${channel.slug}"] [data-rda-social-brand-logo="${channel.slug}"]`,
      )
      .count();
    const postCards = await page
      .locator(`main[data-rda-route="${channel.slug}"] [data-rda-social-post-card="${channel.slug}"]`)
      .evaluateAll((cards) =>
        cards.map((card) => ({
          embedCount: card.querySelectorAll("[data-rda-social-official-embed]").length,
          externalLinkCount: card.querySelectorAll('a[href^="https://"][target="_blank"]').length,
          imageCount: card.querySelectorAll('[data-rda-social-local-media="image"] img').length,
          localMediaCount: card.querySelectorAll("[data-rda-social-local-media]").length,
          logoCount: card.querySelectorAll(
            `[data-rda-social-brand-logo="${card.getAttribute("data-rda-social-post-card")}"]`,
          ).length,
          videoCount: card.querySelectorAll(
            '[data-rda-social-local-media="video"] video[controls][preload="metadata"]',
          ).length,
          videoPosterCount: card.querySelectorAll(
            '[data-rda-social-local-media="video"] video[poster]',
          ).length,
          url: card.getAttribute("data-rda-social-post-url") || "",
        })),
      );
    const blockerCount = await page
      .locator(
        `main[data-rda-route="${channel.slug}"] [data-rda-social-import-blocker="${channel.slug}"]`,
      )
      .count();
    const thirdPartyEmbedScriptCount = await page
      .locator(
        [
          'script[src*="instagram.com/embed"]',
          'script[src*="tiktok.com/embed"]',
          'script[src*="connect.facebook.net"][src*="sdk.js"]',
        ].join(","),
      )
      .count();
    const expectedHost = {
      facebook: "facebook.com",
      instagram: "instagram.com",
      tiktok: "tiktok.com",
    }[channel.slug];

    if (desktopTitle !== channel.metaTitle) {
      mismatches.push(`${channel.path} title "${desktopTitle}" !== "${channel.metaTitle}"`);
    }

    if (!desktopBodyText.includes(`Follow Roseville Dental Academy on ${channel.platform}`)) {
      mismatches.push(`${channel.path} is missing the platform heading`);
    }

    if (!desktopBodyText.includes(channel.followLabel)) {
      mismatches.push(`${channel.path} is missing the follow call to action`);
    }

    if (profileLinks.length < 2) {
      mismatches.push(`${channel.path} should expose repeated official profile links`);
    }

    if (officialBrandLogoCount < (channel.scrapeStatus.status === "ready" ? 10 : 4)) {
      mismatches.push(
        `${channel.path} should render the official ${channel.platform} logo in its platform UI`,
      );
    }

    if (channel.scrapeStatus.status === "ready") {
      if (postCards.length < channel.scrapeStatus.requiredCount) {
        mismatches.push(
          `${channel.path} should render at least ${channel.scrapeStatus.requiredCount} imported post cards`,
        );
      }

      if (blockerCount > 0) {
        mismatches.push(`${channel.path} should not show an import blocker when posts are ready`);
      }

      if (thirdPartyEmbedScriptCount > 0) {
        mismatches.push(`${channel.path} should not load third-party social embed scripts`);
      }

      postCards.forEach((postCard, index) => {
        if (!postCard.url.startsWith("https://") || !postCard.url.includes(expectedHost)) {
          mismatches.push(`${channel.path} post ${index + 1} has an invalid external URL`);
        }

        if (postCard.logoCount < 1) {
          mismatches.push(`${channel.path} post ${index + 1} is missing its platform logo`);
        }

        if (postCard.embedCount > 0) {
          mismatches.push(`${channel.path} post ${index + 1} should use local media, not embeds`);
        }

        if (postCard.localMediaCount < 1) {
          mismatches.push(`${channel.path} post ${index + 1} is missing local media`);
        }

        if (postCard.videoCount > 0 && postCard.videoPosterCount < postCard.videoCount) {
          mismatches.push(`${channel.path} post ${index + 1} video is missing a poster`);
        }

        if (postCard.videoCount === 0 && postCard.imageCount === 0) {
          mismatches.push(`${channel.path} post ${index + 1} is missing playable media`);
        }

        if (postCard.externalLinkCount < 1) {
          mismatches.push(`${channel.path} post ${index + 1} is missing its source link`);
        }
      });
    } else {
      if (blockerCount !== 1) {
        mismatches.push(`${channel.path} should show a single public import blocker`);
      }

      if (postCards.length > 0) {
        mismatches.push(`${channel.path} should not render fabricated post cards while blocked`);
      }

      if (channel.scrapeStatus.foundCount >= channel.scrapeStatus.requiredCount) {
        mismatches.push(`${channel.path} blocker should only be used below the import threshold`);
      }
    }

    if (
      profileLinks.some(
        (link) => link.target !== "_blank" || !String(link.rel).includes("noreferrer"),
      )
    ) {
      mismatches.push(`${channel.path} profile links should open the official account safely`);
    }

    if (!internalCrossLinks.some((link) => link.href === "/#quick-sign-up")) {
      mismatches.push(`${channel.path} should keep a path back to class interest`);
    }

    results.push({
      internalCrossLinks,
      path: channel.path,
      profileLinks,
      officialBrandLogoCount,
      postCards,
      scrapeStatus: channel.scrapeStatus,
      title: desktopTitle,
      viewportResults,
    });
  }

  smokeSummary.push({
    mismatches,
    results,
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "official-social-pages",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "official-social-pages-summary.json", {
      mismatches,
      results,
    });
  }

  expect(mismatches).toEqual([]);
});

test("front office program is retired from public access and entry points", async ({ page, request }, testInfo) => {
  const retiredPath = "/front-office-program";
  const retiredResponse = await request.get(`${localOrigin}${retiredPath}`, {
    headers: {
      accept: "text/html,application/xhtml+xml",
    },
    timeout: 120_000,
  });
  const homeSnapshot = await captureSnapshot(page, `${localOrigin}/`, {
    viewport: { width: 1280, height: 900 },
  });
  const mismatches: string[] = [];

  if (retiredResponse.status() !== 404) {
    mismatches.push(`${retiredPath} returned ${retiredResponse.status()} instead of 404`);
  }

  if (homeSnapshot.bodyText.includes("Front Office Program")) {
    mismatches.push("homepage still shows Front Office Program copy");
  }

  if (homeSnapshot.visibleLinks.some((link) => link.href.includes(retiredPath))) {
    mismatches.push("homepage still links to the retired front office route");
  }

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "front-office-retirement-summary.json", {
      homeSnapshot,
      mismatches,
      retiredPath,
      retiredStatus: retiredResponse.status(),
    });
  }

  smokeSummary.push({
    mismatches,
    route: retiredPath,
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "retired-route",
  });

  expect(mismatches).toEqual([]);
});

test("mobile homepage menu opens and reveals live information links", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(6_000);

  await page.getByRole("button", { name: "Hamburger Site Navigation Icon" }).click();
  const mobileMenu = page.locator('[data-rda-mobile-menu="true"]');
  await expect(mobileMenu.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(mobileMenu.getByRole("button", { name: "More Information" })).toBeVisible();

  await mobileMenu.getByRole("button", { name: "More Information" }).click();

  await expect(mobileMenu.getByRole("link", { name: "Meet the Instructors" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "FAQs" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "Photos" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "Resume Portal DR/OMS only" })).toHaveAttribute(
    "href",
    "https://rosevilledental.godaddysites.com/m/login?r=%2Fresume-portal-dr%252Foms-only",
  );

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

test("contact us button replaces the shopping and profile utility icons", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => document.querySelectorAll('[data-rda-contact-us="true"]').length > 0,
    undefined,
    { timeout: 12_000 },
  );
  const visibleContactButton = page.locator('[data-rda-contact-us="true"]:visible').first();

  await expect(visibleContactButton).toBeVisible({ timeout: 12_000 });

  const visibleContactButtons = await page
    .locator('[data-rda-contact-us="true"]:visible')
    .count();
  const visibleCartIcons = await page.locator('a[aria-label="Shopping Cart Icon"]:visible').count();
  const visibleProfileIcons = await page
    .locator('a[data-aid="MEMBERSHIP_ICON_DESKTOP_RENDERED"]:visible')
    .count();

  await visibleContactButton.click();
  await page.waitForURL("**/contact", { timeout: 12_000 });

  const mismatches: string[] = [];

  if (visibleContactButtons === 0) {
    mismatches.push("Contact Us utility button was not visible");
  }

  if (visibleCartIcons > 0) {
    mismatches.push("shopping cart icon was still visible");
  }

  if (visibleProfileIcons > 0) {
    mismatches.push("profile icon was still visible");
  }

  if (!page.url().endsWith("/contact")) {
    mismatches.push("Contact Us button did not navigate to /contact");
  }

  smokeSummary.push({
    mismatches,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "contact-us-button",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "contact-us-button-summary.json", {
      mismatches,
      visibleCartIcons,
      visibleContactButtons,
      visibleProfileIcons,
    });
  }

  expect(mismatches).toEqual([]);
});

test("desktop navigation items render distinct matching icons", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });

  const moreButton = page.getByRole("button", { name: "More Information" });

  await page.waitForLoadState("load").catch(() => undefined);
  await expect(moreButton).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('[data-rda-nav-icon="book-open-check"]')).toBeVisible({
    timeout: 12_000,
  });
  await expect(async () => {
    await moreButton.click();
    await expect(page.locator('[data-rda-more-menu][data-open="true"]')).toBeVisible({
      timeout: 1_500,
    });
  }).toPass({ timeout: 12_000 });

  const result = await page.evaluate(() => {
    const readItem = (item: Element) => ({
      href: item.getAttribute("href") || "",
      icon: item.querySelector("[data-rda-nav-icon]")?.getAttribute("data-rda-nav-icon") || "",
      label: item.textContent?.replace(/\s+/g, " ").trim() || "",
    });

    return {
      dropdown: Array.from(document.querySelectorAll(".rda-more-menu .rda-more-link")).map(readItem),
      topLevel: Array.from(
        document.querySelectorAll(
          ".rda-desktop-nav .rda-nav-link, .rda-desktop-nav .rda-contact-us-button",
        ),
      ).map(readItem),
    };
  });

  const expected = new Map([
    ["Home", "home"],
    ["BLS/CPR", "heart-pulse"],
    ["Infection Control", "shield-check"],
    ["Coronal Polish", "sparkles"],
    ["Radiation Safety", "radiation"],
    ["More Information", "book-open-check"],
    ["Sealants", "badge-check"],
    ["Contact Us", "phone"],
    ["Dental Assisting Program", "graduation-cap"],
    ["Meet the Instructors", "user-round-check"],
    ["FAQs", "circle-help"],
    ["Photos", "images"],
    ["Resume Portal DR/OMS only", "file-user"],
  ]);
  const allItems = [...result.topLevel, ...result.dropdown];
  const portalHref = "https://rosevilledental.godaddysites.com/m/login?r=%2Fresume-portal-dr%252Foms-only";
  const mismatches: string[] = [];

  for (const [label, icon] of expected) {
    const match = allItems.find((item) => item.label === label);

    if (!match) {
      mismatches.push(`missing nav item ${label}`);
    } else if (match.icon !== icon) {
      mismatches.push(`${label} expected ${icon} icon, found ${match.icon || "none"}`);
    }
  }

  const portalMatch = allItems.find((item) => item.label === "Resume Portal DR/OMS only");

  if (portalMatch?.href !== portalHref) {
    mismatches.push(
      `Resume Portal DR/OMS only expected external href ${portalHref}, found ${portalMatch?.href || "none"}`,
    );
  }

  const icons = allItems
    .filter((item) => expected.has(item.label))
    .map((item) => item.icon)
    .filter(Boolean);

  if (new Set(icons).size !== expected.size) {
    mismatches.push("desktop nav icons are not unique across the top-level and dropdown items");
  }

  smokeSummary.push({
    mismatches,
    result,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "desktop-nav-icons",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "desktop-nav-icons-summary.json", {
      expected: Array.from(expected.entries()),
      mismatches,
      result,
    });
  }

  expect(mismatches).toEqual([]);
});

test("social media links render as branded buttons", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });

  const mismatches: string[] = [];
  const socialFollowSection = page.locator('[data-rda-stable-widget="social-follow"]');
  const socialFollowCount = await socialFollowSection.count();
  const socialFollowText =
    socialFollowCount > 0 ? await socialFollowSection.first().innerText() : "";

  if (socialFollowCount !== 1) {
    mismatches.push(`expected 1 homepage social follow section, found ${socialFollowCount}`);
  }

  if (!/Follow Us on Social Media/i.test(socialFollowText)) {
    mismatches.push("homepage social section is missing the social media heading");
  }

  if (/Online Appointments|New services are coming soon/i.test(socialFollowText)) {
    mismatches.push("homepage social section still contains the old appointments placeholder copy");
  }

  const buttons = page.locator("[data-rda-social-button]");
  const result = await buttons.evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href") || "",
      icon: link.getAttribute("data-rda-social-button") || "",
      label: link.textContent?.replace(/\s+/g, " ").trim() || "",
      logo: link.querySelector("[data-rda-social-brand-logo]")?.getAttribute("data-rda-social-brand-logo") || "",
      svgCount: link.querySelectorAll("svg").length,
      tagName: link.tagName.toLowerCase(),
    })),
  );
  const expected = [
    ["facebook", "Facebook", "https://www.facebook.com/557019148138561"],
    ["instagram", "Instagram", "https://www.instagram.com/rosevilledentalacademy"],
    ["tiktok", "TikTok", "https://www.tiktok.com/@rosevilledentalacademy"],
  ];

  if (result.length !== 9) {
    mismatches.push(`expected 9 social buttons across header, contact, and footer, found ${result.length}`);
  }

  for (const [icon, label, href] of expected) {
    const matches = result.filter((entry) => entry.icon === icon && entry.label === label);
    const navMatch = await page
      .locator(`.rda-desktop-nav [data-rda-social-button="${icon}"]`)
      .first()
      .evaluate((link) => ({
        href: link.getAttribute("href") || "",
        rel: link.getAttribute("rel") || "",
        target: link.getAttribute("target") || "",
      }));

    if (matches.length !== 3) {
      mismatches.push(`expected 3 ${label} social buttons, found ${matches.length}`);
    }

    if (matches.some((entry) => entry.svgCount !== 1 || entry.tagName !== "a")) {
      mismatches.push(`${label} social buttons are missing their branded SVG link treatment`);
    }

    if (matches.some((entry) => entry.logo !== icon)) {
      mismatches.push(`${label} social buttons are not using the official ${label} logo asset`);
    }

    if (navMatch.href !== href || navMatch.target !== "_blank" || !navMatch.rel.includes("noreferrer")) {
      mismatches.push(`${label} header social link is not wired to open the correct page in a new tab`);
    }
  }

  smokeSummary.push({
    mismatches,
    result,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "branded-social-buttons",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "branded-social-buttons-summary.json", {
      mismatches,
      result,
    });
  }

  expect(mismatches).toEqual([]);
});

test("homepage course cards use unique descriptive copy", async ({ page }, testInfo) => {
  const snapshot = await captureSnapshot(page, `${localOrigin}/`, {
    viewport: { width: 1280, height: 900 },
  });
  const badRefundCopy = "Due to limited space all sales are final and no refunds will be issued";
  const requiredCourseCopy = [
    "Initial and renewal BLS/CPR training for healthcare providers",
    "Board-approved 8-hour Infection Control training for unlicensed dental assistants",
    "32-hour Radiation Safety training for dental personnel and dentists who want staff x-ray certified",
    "12-hour Coronal Polish training for eligible dental assistants",
    "16-hour Pit and Fissure Sealant training for eligible dental assistants and RDAs",
    "Dental Assisting is a 9-week, 210-hour training course for students age 16 and older",
  ];
  const mismatches: string[] = [];

  if (snapshot.bodyText.includes(badRefundCopy)) {
    mismatches.push("homepage still renders the repeated refund policy copy");
  }

  for (const phrase of requiredCourseCopy) {
    if (!snapshot.bodyText.includes(phrase)) {
      mismatches.push(`homepage missing unique course copy: ${phrase}`);
    }
  }

  smokeSummary.push({
    mismatches,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "homepage-course-copy",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "homepage-course-copy-summary.json", {
      bodyText: snapshot.bodyText,
      mismatches,
    });
  }

  expect(mismatches).toEqual([]);
});

test("Drive-derived homepage details render without private student data", async ({ page }, testInfo) => {
  const snapshot = await captureSnapshot(page, `${localOrigin}/`, {
    viewport: { width: 1280, height: 900 },
  });
  const requiredPhrases = [
    "Now accepting registration for 2026 Dental Assisting Training programs.",
    "Dental Board Course Details",
    "Radiation Safety X1036",
    "Infection Control IC189",
    "Coronal Polishing CP148",
    "Pit and Fissure Sealants PF186",
  ];
  const mismatches: string[] = [];

  for (const phrase of requiredPhrases) {
    if (!snapshot.bodyText.includes(phrase)) {
      mismatches.push(`homepage missing Drive-derived phrase: ${phrase}`);
    }
  }

  const homepagePrivateEmailScan = snapshot.bodyText.replace(
    /rosevilledentalacademy@gmail\.com/gi,
    "",
  );

  if (/@gmail\.com|@yahoo\.com|@outlook\.com/i.test(homepagePrivateEmailScan)) {
    mismatches.push("homepage appears to expose a private student email address");
  }

  smokeSummary.push({
    mismatches,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "drive-homepage-material",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "drive-homepage-material-summary.json", {
      bodyText: snapshot.bodyText,
      mismatches,
    });
  }

  expect(mismatches).toEqual([]);
});

test("homepage review photos appear directly below the hero", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load").catch(() => undefined);

  const hero = page.locator(".widget-introduction-introduction-1").first();
  const reviewSection = page.locator('[data-rda-home-review-highlights="true"]');
  const courseSystem = page.locator('[data-rda-home-course-system="true"]');
  const reviewCards = reviewSection.locator(".rda-review-photo-card");
  const mismatches: string[] = [];

  await expect(reviewSection).toBeVisible({ timeout: 12_000 });
  await expect(reviewSection.getByRole("heading", { name: "What Students Are Saying" })).toBeVisible();
  await expect(courseSystem).toBeVisible({ timeout: 12_000 });

  const heroBox = await hero.boundingBox();
  const reviewBox = await reviewSection.boundingBox();
  const courseBox = await courseSystem.boundingBox();
  const legacyCourseWidgetCount = await page
    .locator(
      [
        ".widget-countdown-countdown-1",
        '[id="2009b5dd-c84c-4596-9a42-e54428494e26"]',
        '[id="4dc12e4b-c2cf-4fef-aa22-43ee15d1afc8"]',
        '[id="266dc504-a138-4f78-9cc8-779377f6b972"]',
        '[id="0c353bbb-1b60-4fa3-aed9-de2e739a4807"]',
        '[id="db5c88e6-f24c-47cf-a362-5819da7f2ba5"]',
      ].join(","),
    )
    .count();
  const visibleCardDetails = await reviewCards.evaluateAll((cards) =>
    cards
      .filter((card) => {
        const style = window.getComputedStyle(card);
        const rect = card.getBoundingClientRect();

        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number.parseFloat(style.opacity || "1") > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((card) => ({
        imageSource: card.querySelector("img")?.getAttribute("src") || "",
      })),
  );
  const cardCount = visibleCardDetails.length;
  const imageSources = visibleCardDetails.map((card) => card.imageSource);
  const uniqueImageSources = new Set(imageSources.filter(Boolean));
  const reviewText = (await reviewSection.textContent()) ?? "";

  if (!heroBox || !reviewBox) {
    mismatches.push("could not measure hero and review section placement");
  } else if (reviewBox.y < heroBox.y + heroBox.height - 4) {
    mismatches.push("review photo section is not positioned directly after the hero");
  }

  if (legacyCourseWidgetCount !== 0) {
    mismatches.push(`homepage still renders ${legacyCourseWidgetCount} legacy course widgets`);
  }

  if (!courseBox || !reviewBox) {
    mismatches.push("could not measure review and course redesign placement");
  } else if (courseBox.y < reviewBox.y + reviewBox.height - 4) {
    mismatches.push("course redesign rendered before the review photo section");
  }

  if (cardCount !== 6) {
    mismatches.push(`expected 6 review cards, found ${cardCount}`);
  }

  if (uniqueImageSources.size !== imageSources.length) {
    mismatches.push("review cards do not use unique gallery photos");
  }

  for (const phrase of ["Adriana Nebuloni", "Selene", "Salvador Garcia", "Breana Donahue"]) {
    if (!reviewText.includes(phrase)) {
      mismatches.push(`review section missing ${phrase}`);
    }
  }

  for (const phrase of ["Reviews for Google", "5 out of 5 stars", "77 Google reviews"]) {
    if (!reviewText.includes(phrase)) {
      mismatches.push(`review section missing Google review marker: ${phrase}`);
    }
  }

  if (!reviewText.includes("\u201cThe 9-week program was well-structured")) {
    mismatches.push("review section does not show visible quote marks around review text");
  }

  if (/\s-\s(?:\d+\s)?(?:week|weeks|month|months|year|years)\sago/i.test(reviewText)) {
    mismatches.push("review section still shows relative date metadata");
  }

  smokeSummary.push({
    cardCount,
    imageSources,
    mismatches,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "homepage-review-photos",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "homepage-review-photos-summary.json", {
      cardCount,
      imageSources,
      mismatches,
    });
  }

  expect(mismatches).toEqual([]);
});

test("homepage gallery preview shows a larger photo showcase", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });

  const gallery = page.locator('[data-rda-stable-widget="gallery"][data-rda-gallery-mode="home"]');
  const images = gallery.locator(".rda-gallery-item img");
  const mismatches: string[] = [];

  await expect(gallery).toBeVisible({ timeout: 12_000 });
  await expect(gallery.getByRole("heading", { name: "Gallery" })).toBeVisible();
  await expect(gallery.getByRole("link", { name: "View the full gallery" })).toHaveAttribute(
    "href",
    "/photos",
  );

  const galleryText = (await gallery.textContent()) ?? "";
  const imageCount = await images.count();
  const imageDetails = await images.evaluateAll((nodes) =>
    nodes.map((image) => ({
      alt: image.getAttribute("alt") || "",
      src: image.getAttribute("src") || "",
    })),
  );
  const uniqueSources = new Set(imageDetails.map((image) => image.src).filter(Boolean));

  if (imageCount !== 9) {
    mismatches.push(`expected 9 homepage gallery photos, found ${imageCount}`);
  }

  if (uniqueSources.size !== imageDetails.length) {
    mismatches.push("homepage gallery preview repeats one or more photos");
  }

  for (const phrase of ["hands-on dental assisting", "radiography", "BLS", "clinical safety"]) {
    if (!galleryText.includes(phrase)) {
      mismatches.push(`homepage gallery copy missing ${phrase}`);
    }
  }

  if (imageDetails.some((image) => image.alt.length === 0 || image.src.length === 0)) {
    mismatches.push("homepage gallery has an image without src or alt text");
  }

  smokeSummary.push({
    imageCount,
    imageDetails,
    mismatches,
    route: "/",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "homepage-gallery-preview",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "homepage-gallery-preview-summary.json", {
      galleryText,
      imageDetails,
      mismatches,
    });
  }

  expect(mismatches).toEqual([]);
});

test("key public pages render full-page image slots after lazy promotion", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const checkedRoutes = ["/", "/dental-assisting-program"];
  const results: Array<{
    blank: Array<{ aid: string; complete: boolean; height: number; index: number; naturalHeight: number; naturalWidth: number; src: string; width: number }>;
    broken: Array<{ aid: string; complete: boolean; height: number; index: number; naturalHeight: number; naturalWidth: number; src: string; width: number }>;
    largeImageCount: number;
    route: string;
  }> = [];

  for (const routePath of checkedRoutes) {
    await page.goto(`${localOrigin}${routePath}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForLoadState("load").catch(() => undefined);

    for (let index = 0; index < 60; index += 1) {
      const reachedBottom = await page.evaluate(() => {
        window.scrollBy(0, Math.max(500, Math.floor(window.innerHeight * 0.85)));
        return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      });

      if (reachedBottom) {
        break;
      }

      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(1_000);

    const result = await page.evaluate(async () => {
      const images = Array.from(document.images);

      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolvePromise) => {
              if (image.complete) {
                resolvePromise();
                return;
              }

              const settle = () => resolvePromise();
              image.addEventListener("load", settle, { once: true });
              image.addEventListener("error", settle, { once: true });
              window.setTimeout(settle, 3_000);
            }),
        ),
      );

      const largeImages = images
        .map((image, index) => {
          const rect = image.getBoundingClientRect();
          const src = image.currentSrc || image.src || image.getAttribute("src") || "";

          return {
            aid: image.getAttribute("data-aid") || image.alt || `image-${index}`,
            complete: image.complete,
            height: Math.round(rect.height),
            index,
            naturalHeight: image.naturalHeight,
            naturalWidth: image.naturalWidth,
            src,
            width: Math.round(rect.width),
          };
        })
        .filter((image) => image.width > 100 && image.height > 100);

      return {
        blank: largeImages.filter(
          (image) =>
            image.naturalWidth <= 1 ||
            /^data:image\/gif/i.test(image.src) ||
            /transparent_placeholder/i.test(image.src),
        ),
        broken: largeImages.filter((image) => !image.complete || image.naturalWidth === 0),
        largeImageCount: largeImages.length,
      };
    });

    results.push({
      ...result,
      route: routePath,
    });
  }

  const mismatches: string[] = [];

  const routesWithBlankImages = results.filter((result) => result.blank.length > 0);
  const routesWithBrokenImages = results.filter((result) => result.broken.length > 0);

  if (routesWithBlankImages.length > 0) {
    mismatches.push(
      `blank large images: ${routesWithBlankImages
        .map((result) => `${result.route}: ${result.blank.map((image) => image.aid).join(", ")}`)
        .join("; ")}`,
    );
  }

  if (routesWithBrokenImages.length > 0) {
    mismatches.push(
      `broken large images: ${routesWithBrokenImages
        .map((result) => `${result.route}: ${result.broken.map((image) => image.aid).join(", ")}`)
        .join("; ")}`,
    );
  }

  smokeSummary.push({
    results,
    routes: checkedRoutes,
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "key-public-page-full-page-images",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "key-public-page-full-page-images-summary.json", {
      mismatches,
      results,
    });
  }

  expect(mismatches).toEqual([]);
});

test("elevenlabs widget is embedded on every page shell", async ({ request }, testInfo) => {
  const checkedRoutes = ["/", "/contact", "/m/login"];
  const results: Array<Record<string, unknown>> = [];
  const mismatches: string[] = [];

  for (const routePath of checkedRoutes) {
    const response = await request.get(`${localOrigin}${routePath}`, {
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
      timeout: 120_000,
    });
    const html = await response.text();
    const hasWidget = html.includes("<elevenlabs-convai");
    const hasAgentId = html.includes(`agent-id="${elevenLabsAgentId}"`);
    const hasBrandOrbColors =
      html.includes('avatar-orb-color-1="#2472A9"') &&
      html.includes('avatar-orb-color-2="#8EC5E8"');
    const hasDisplayText =
      html.includes('action-text="Questions about classes?"') &&
      html.includes('start-call-text="Start a call"') &&
      html.includes('expand-text="Ask Roseville Dental Academy"');
    const hasMarkdownSafety =
      html.includes(
        'markdown-link-allowed-hosts="rosevilledentalacademy.com,www.rosevilledentalacademy.com"',
      ) && html.includes('markdown-link-allow-http="false"');
    const isDismissible = html.includes('dismissible="true"');
    const hasScript = html.includes(elevenLabsScriptSrc);

    if (!hasWidget) {
      mismatches.push(`${routePath} missing ElevenLabs widget element`);
    }

    if (!hasAgentId) {
      mismatches.push(`${routePath} missing ElevenLabs agent id`);
    }

    if (!hasBrandOrbColors) {
      mismatches.push(`${routePath} missing branded ElevenLabs orb colors`);
    }

    if (!hasDisplayText) {
      mismatches.push(`${routePath} missing ElevenLabs display text customization`);
    }

    if (!hasMarkdownSafety) {
      mismatches.push(`${routePath} missing ElevenLabs markdown link safety attributes`);
    }

    if (!isDismissible) {
      mismatches.push(`${routePath} ElevenLabs widget should be dismissible`);
    }

    if (!hasScript) {
      mismatches.push(`${routePath} missing ElevenLabs widget script`);
    }

    results.push({
      hasAgentId,
      hasBrandOrbColors,
      hasDisplayText,
      hasMarkdownSafety,
      hasScript,
      hasWidget,
      isDismissible,
      route: routePath,
      status: response.status(),
    });
  }

  smokeSummary.push({
    mismatches,
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "elevenlabs-widget",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "elevenlabs-widget-summary.json", {
      mismatches,
      results,
    });
  }

  expect(mismatches).toEqual([]);
});

test("legacy cookie banner stays out of the elevenlabs widget corner", async ({ page }, testInfo) => {
  const results: Array<Record<string, unknown>> = [];
  const mismatches: string[] = [];

  for (const viewport of [
    { height: 900, label: "desktop", width: 1280 },
    { height: 844, label: "mobile", width: 390 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });

    const result = await page.evaluate(() => {
      const banner = document.createElement("div");

      banner.setAttribute("data-aid", "FOOTER_COOKIE_BANNER_RENDERED");
      banner.textContent =
        "This website uses cookies. We use cookies to analyze website traffic and optimize your website experience.";
      banner.style.background = "rgb(43, 83, 85)";
      banner.style.color = "#fff";
      banner.style.padding = "16px";
      banner.style.position = "fixed";
      banner.style.width = "100vw";
      (document.querySelector(".rda-live-shell") ?? document.body).appendChild(banner);

      const widget = document.querySelector<HTMLElement>("[data-elevenlabs-widget-slot]");
      const bannerRect = banner.getBoundingClientRect();
      const widgetRect = widget?.getBoundingClientRect() ?? new DOMRect();
      const widgetStyle = widget ? window.getComputedStyle(widget) : undefined;
      const widgetVisible = Boolean(
        widget &&
          widgetStyle &&
          widgetStyle.display !== "none" &&
          widgetStyle.visibility !== "hidden" &&
          Number.parseFloat(widgetStyle.opacity || "1") > 0 &&
          widgetStyle.pointerEvents !== "none" &&
          widgetRect.width > 0 &&
          widgetRect.height > 0,
      );
      const overlaps =
        widgetVisible &&
        bannerRect.left < widgetRect.right &&
        bannerRect.right > widgetRect.left &&
        bannerRect.top < widgetRect.bottom &&
        bannerRect.bottom > widgetRect.top;

      banner.remove();

      return {
        banner: {
          bottom: Math.round(window.innerHeight - bannerRect.bottom),
          left: Math.round(bannerRect.left),
          right: Math.round(window.innerWidth - bannerRect.right),
          width: Math.round(bannerRect.width),
        },
        overlaps,
        widget: {
          bottom: Math.round(window.innerHeight - widgetRect.bottom),
          opacity: widgetStyle?.opacity ?? "",
          pointerEvents: widgetStyle?.pointerEvents ?? "",
          right: Math.round(window.innerWidth - widgetRect.right),
          visible: widgetVisible,
          width: Math.round(widgetRect.width),
        },
      };
    });

    if (result.overlaps) {
      mismatches.push(`${viewport.label} cookie banner overlaps ElevenLabs widget`);
    }

    results.push({
      ...result,
      viewport: viewport.label,
    });
  }

  smokeSummary.push({
    mismatches,
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "cookie-widget-corner",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "cookie-widget-corner-summary.json", {
      mismatches,
      results,
    });
  }

  expect(mismatches).toEqual([]);
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

test("Drive-derived FAQ and instructor material render on public pages", async ({ page }, testInfo) => {
  const faqSnapshot = await captureSnapshot(page, `${localOrigin}/faqs-1`, {
    viewport: { width: 1280, height: 900 },
  });
  const instructorSnapshot = await captureSnapshot(page, `${localOrigin}/meet-the-instructors`, {
    viewport: { width: 1280, height: 900 },
  });
  const mismatches: string[] = [];

  for (const phrase of [
    "Common Student Questions",
    "Do students need to provide patients?",
    "Roseville Dental Academy does not provide patients",
    "Monday, July 13, 2026",
    "Friday, September 4, 2026",
  ]) {
    if (!faqSnapshot.bodyText.includes(phrase)) {
      mismatches.push(`FAQ page missing Drive-derived phrase: ${phrase}`);
    }
  }

  for (const phrase of [
    "Instructor Bios",
    "Jessica",
    "Sandra",
    "Sajal",
    "Katelyn",
    "RDA-OA Lead Instructor",
  ]) {
    if (!instructorSnapshot.bodyText.includes(phrase)) {
      mismatches.push(`instructors page missing Drive-derived phrase: ${phrase}`);
    }
  }

  for (const retiredPhrase of [
    "There's much to see here",
    "Find out more",
    "Hello WELCOME",
  ]) {
    if (instructorSnapshot.bodyText.includes(retiredPhrase)) {
      mismatches.push(`instructors page still includes retired intro copy: ${retiredPhrase}`);
    }
  }

  for (const [routePath, snapshot] of [
    ["/faqs-1", faqSnapshot],
    ["/meet-the-instructors", instructorSnapshot],
  ] as const) {
    const publicSafeBodyText = snapshot.bodyText.replace(
      /rosevilledentalacademy@gmail\.com/gi,
      "",
    );

    if (/@gmail\.com|@yahoo\.com|@outlook\.com/i.test(publicSafeBodyText)) {
      mismatches.push(`${routePath} appears to expose a private student email address`);
    }
  }

  smokeSummary.push({
    mismatches,
    routes: ["/faqs-1", "/meet-the-instructors"],
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "drive-faq-instructors-material",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "drive-faq-instructors-material-summary.json", {
      faqBodyText: faqSnapshot.bodyText,
      instructorBodyText: instructorSnapshot.bodyText,
      mismatches,
    });
  }

  expect(mismatches).toEqual([]);
});

test("photos page renders the full live-site gallery inventory", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${localOrigin}/photos`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(".rda-gallery-item img", { timeout: 12_000 });

  for (let index = 0; index < 40; index += 1) {
    const reachedBottom = await page.evaluate(() => {
      window.scrollBy(0, Math.max(360, Math.floor(window.innerHeight * 0.85)));
      return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    });

    if (reachedBottom) {
      break;
    }

    await page.waitForTimeout(100);
  }

  const result = await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".rda-gallery-item img"));

    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolvePromise) => {
            if (image.complete && image.naturalWidth > 0) {
              resolvePromise();
              return;
            }

            const settle = () => resolvePromise();
            image.addEventListener("load", settle, { once: true });
            image.addEventListener("error", settle, { once: true });
            window.setTimeout(settle, 3_000);
          }),
      ),
    );

    return {
      broken: images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.getAttribute("src") || image.alt),
      count: images.length,
    };
  });

  const mismatches: string[] = [];

  if (result.count !== 72) {
    mismatches.push(`expected 72 live gallery photos, found ${result.count}`);
  }

  if (result.broken.length > 0) {
    mismatches.push(`broken gallery images: ${result.broken.join(", ")}`);
  }

  smokeSummary.push({
    broken: result.broken,
    count: result.count,
    route: "/photos",
    status: mismatches.length === 0 ? "passed" : "failed",
    type: "photos-live-gallery",
  });

  if (mismatches.length > 0) {
    writeJsonArtifact(testInfo, "photos-live-gallery-summary.json", {
      mismatches,
      result,
    });
  }

  expect(mismatches).toEqual([]);
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
