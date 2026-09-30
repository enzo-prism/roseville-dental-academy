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

for (const path of ["/student-jobs", "/enrollment-pilot", "/enrollment-pilot/confirmation?hold=00000000-0000-4000-8000-000000000000"]) {
  test(`${path} initial document has no tracking scripts, globals or network requests`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => { if (measurementUrl(request.url())) requests.push(request.url()); });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForTimeout(1000);
    expect(await page.locator("script[src]").evaluateAll((scripts) => scripts.map((script) => script.getAttribute("src")))).not.toEqual(expect.arrayContaining([expect.stringMatching(/googletagmanager|hotjar|facebook|insights|openai/)]));
    expect(await page.locator("#rda-google-analytics, #rda-meta-pixel, #rda-hotjar-analytics").count()).toBe(0);
    const globals = await page.evaluate(() => {
      const values = window as unknown as Record<string, unknown>;
      return ["gtag", "fbq", "hj", "_hjSettings", "dataLayer"].filter((name) => values[name] !== undefined);
    });
    expect(globals).toEqual([]);
    expect(requests).toEqual([]);
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

test("Stripe cross-site return can retry verification with the original Strict private cookie", async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const secureOrigin = "https://rda-private-review.test";
  await page.route(`${secureOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${origin}${url.pathname}${url.search}` });
    await route.fulfill({ response });
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
