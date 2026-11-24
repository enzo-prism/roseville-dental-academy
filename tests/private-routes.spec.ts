import { expect, test } from "@playwright/test";
import { ENROLLMENT_PILOT_COOKIE } from "../lib/enrollment-auth";
import { suppressSitePromo } from "./support/qa-helpers";

const measurementUrl = (value: string) => {
  const url = new URL(value);
  return /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|hotjar\.com|hotjar\.io|facebook\.com|facebook\.net|openai\.com|vercel-insights\.com|vercel-analytics\.com|vercel-scripts\.com|doubleclick\.net|googleadservices\.com)$/.test(url.hostname)
    || /^\/_vercel\/(insights|speed-insights)(\/|$)/.test(url.pathname)
    || /^\/api\/attribution(\/|$)/.test(url.pathname);
};

test.beforeEach(async ({ page, context }) => {
  await suppressSitePromo(context);
  // Record attempted requests before aborting. Tests cannot send marketing data.
  await page.route("**/*", async (route) => {
    if (measurementUrl(route.request().url())) await route.abort();
    else await route.continue();
  });
});

test.afterEach(async ({ page }) => {
  // In-flight route.fetch callbacks (Next static chunks after a cross-origin
  // navigation) must not fail the test when Playwright closes the page.
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
});

for (const path of ["/student-jobs", "/enroll", "/enroll/confirmation?enrollment=00000000-0000-4000-8000-000000000000", "/enrollment-pilot/roster", "/enrollment-pilot", "/enrollment-pilot/confirmation?hold=00000000-0000-4000-8000-000000000000"]) {
  const enrollment = path === "/enroll" || path.startsWith("/enroll/");
  test(`${path} initial document isolates private measurement`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => { if (measurementUrl(request.url())) requests.push(request.url()); });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForTimeout(1000);
    expect(await page.locator("script[src]").evaluateAll((scripts) => scripts.map((script) => script.getAttribute("src")))).not.toEqual(expect.arrayContaining([expect.stringMatching(enrollment ? /hotjar|facebook|insights|openai/ : /googletagmanager|hotjar|facebook|insights|openai/)]));
    expect(await page.locator("#rda-google-analytics, #rda-meta-pixel, #rda-hotjar-analytics").count()).toBe(0);
    const globals = await page.evaluate(() => {
      const values = window as unknown as Record<string, unknown>;
      return ["gtag", "fbq", "hj", "_hjSettings", "dataLayer"].filter((name) => values[name] !== undefined);
    });
    expect(globals).toEqual(enrollment ? ["gtag", "dataLayer"] : []);
    if (enrollment) {
      expect(requests.map((request) => new URL(request).origin + new URL(request).pathname))
        .toEqual(["https://www.googletagmanager.com/gtag/js"]);
      const data = await page.evaluate(() => JSON.stringify(window.dataLayer));
      expect(data).not.toContain("enrollment=");
      expect(data).not.toContain("00000000-0000-4000-8000-000000000000");
    } else {
      expect(requests).toEqual([]);
    }
  });
}

test("public footer job-board navigation reloads the document and clears measurement globals", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/infection-control");
  await expect(page.locator("#rda-google-analytics")).toHaveCount(1);
  await page.evaluate(() => { (window as unknown as Record<string, unknown>).__rdaDocumentMarker = "public-document"; });
  const navigation = page.waitForRequest((request) => request.isNavigationRequest() && new URL(request.url()).pathname === "/student-jobs");
  await page.locator('[data-rda-shell-footer="true"] a[href="/student-jobs"]').click();
  expect((await navigation).resourceType()).toBe("document");
  await expect(page).toHaveURL(/\/student-jobs$/);
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__rdaDocumentMarker)).toBeUndefined();
  expect(await page.evaluate(() => ["gtag", "fbq", "hj"].filter((key) => (window as unknown as Record<string, unknown>)[key] !== undefined))).toEqual([]);
});

test("private to public navigation and browser Back preserve an isolated private document", async ({ page }) => {
  await page.goto("/student-jobs");
  const navigation = page.waitForRequest((request) => request.isNavigationRequest() && new URL(request.url()).pathname === "/cancellation-policy", { timeout: 5000 });
  await page.locator('[data-rda-shell-footer="true"] a[href="/cancellation-policy"]').click();
  expect((await navigation).resourceType()).toBe("document");
  await expect(page).toHaveURL(/\/cancellation-policy$/);
  await expect(page.locator("#rda-google-analytics")).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/student-jobs$/);
  await expect(page.locator("#rda-google-analytics, #rda-meta-pixel, #rda-hotjar-analytics")).toHaveCount(0);
  expect(await page.evaluate(() => ["gtag", "fbq", "hj"].filter((key) => (window as unknown as Record<string, unknown>)[key] !== undefined))).toEqual([]);
});

test("unavailable enrollment exits with a fresh document and Back restores tracking isolation", async ({ page }) => {
  await page.goto("/enroll");
  await page.evaluate(() => { (window as unknown as Record<string,unknown>).__rdaEnrollmentDocument = true; });
  const documentRequest = page.waitForRequest(request => request.isNavigationRequest() && new URL(request.url()).pathname === "/contact");
  await page.getByRole("link",{name:"Contact Roseville Dental Academy",exact:true}).click();
  expect((await documentRequest).resourceType()).toBe("document");
  await expect(page).toHaveURL(/\/contact$/);
  expect(await page.evaluate(() => (window as unknown as Record<string,unknown>).__rdaEnrollmentDocument)).toBeUndefined();
  await expect(page.locator("#rda-google-analytics")).toHaveCount(1);
  await page.goBack(); await expect(page).toHaveURL(/\/enroll$/);
  await expect(page.locator("#rda-google-analytics, #rda-meta-pixel, #rda-hotjar-analytics")).toHaveCount(0);
  expect(await page.evaluate(() => ["fbq", "hj", "_hjSettings"].filter((key) => (window as unknown as Record<string, unknown>)[key] !== undefined))).toEqual([]);
});

test("enrollment analytics respects denied consent and privacy signals", async ({ page, context, baseURL }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (measurementUrl(request.url())) requests.push(request.url());
  });
  await context.addCookies([{ name: "rda_analytics_consent", value: "denied", url: baseURL! }]);
  await page.goto("/enroll");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
  await context.clearCookies({ name: "rda_analytics_consent" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true });
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
  expect(requests).toEqual([]);
});

test("Stripe cross-site return can retry verification with the original Strict private cookie", async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const secureOrigin = "https://rda-private-review.test";
  await page.route(`${secureOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    try {
      const response = await route.fetch({ url: `${origin}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    } catch (error) {
      if (page.isClosed() || /has been closed|Test ended/i.test(error instanceof Error ? error.message : String(error))) return;
      throw error;
    }
  });
  const confirmation = `${secureOrigin}/enrollment-pilot/confirmation?hold=00000000-0000-4000-8000-000000000000`;
  const token = "fixture-only-original-session";
  await context.addCookies([{ name: ENROLLMENT_PILOT_COOKIE, value: token, url: secureOrigin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.route("https://checkout.stripe.com/rda-test-return", (route) => route.fulfill({
    status: 200, contentType: "text/html", body: `<a href="${confirmation}">Return from fixture checkout</a>`,
  }));
  await page.goto("https://checkout.stripe.com/rda-test-return");
  const firstRequest = page.waitForRequest((request) => request.isNavigationRequest() && request.url() === confirmation);
  await page.getByRole("link", { name: "Return from fixture checkout" }).click();
  expect((await (await firstRequest).allHeaders()).cookie ?? "").not.toContain(ENROLLMENT_PILOT_COOKIE);
  await expect(page.getByRole("heading", { name: "Test payment not verified" })).toBeVisible();
  const retryRequest = page.waitForRequest((request) => request.isNavigationRequest() && request.url() === confirmation);
  await page.getByRole("link", { name: "Retry verification", exact: true }).click();
  expect((await (await retryRequest).allHeaders()).cookie).toContain(`${ENROLLMENT_PILOT_COOKIE}=${token}`);
  await expect(page.getByRole("heading", { name: "Test payment not verified" })).toBeVisible();
});
