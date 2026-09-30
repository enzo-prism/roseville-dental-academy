import { expect, test } from "@playwright/test";

import { blockOpenAIAdsPixelNetwork, suppressSitePromo } from "./support/qa-helpers";

const fixtureOrigin = "https://rda-qa.invalid";

// A final catch-all is the network boundary: any request missed by the shared
// isolation helper is recorded and fulfilled locally, never sent to a provider.
test("shared QA isolation blocks SDKs, beacons, noscript pixels and mutation defaults", async ({ context, page }) => {
  const escapedRequests: string[] = [];
  await context.route("**/*", async (route) => {
    escapedRequests.push(route.request().url());
    await route.fulfill({ status: 599, body: "No network allowed in this regression" });
  });
  await suppressSitePromo(context);
  await blockOpenAIAdsPixelNetwork(context); // Repeated suite setup is harmless.
  await page.route(`${fixtureOrigin}/`, (route) => route.fulfill({
    status: 200, contentType: "text/html", body: "<!doctype html><title>Offline QA fixture</title>",
  }));
  await page.goto(fixtureOrigin);

  const sdkUrls = [
    "https://connect.facebook.net/en_US/fbevents.js",
    "https://connect.facebook.net/signals/config/123456789",
    "https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC",
    "https://bzrcdn.openai.com/sdk/oaiq.min.js",
    "https://static.hotjar.com/c/hotjar-123.js?sv=6",
    `${fixtureOrigin}/_vercel/insights/script.js`,
    `${fixtureOrigin}/_vercel/speed-insights/script.js`,
  ];
  await page.evaluate(async (urls) => {
    await Promise.all(urls.map((src) => new Promise<void>((done) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => done();
      script.onerror = () => done();
      document.head.append(script);
    })));
  }, sdkUrls);

  const collectorUrls = [
    "https://www.facebook.com/tr/?id=123456789&ev=Lead&noscript=1",
    "https://graph.facebook.com/v21.0/123456789/events",
    "https://www.google-analytics.com/g/collect?v=2&en=generate_lead",
    "https://region1.google-analytics.com/g/collect?v=2&en=generate_lead",
    "https://stats.g.doubleclick.net/g/collect?v=2",
    "https://www.google.com/ccm/collect?en=conversion",
    "https://bzr.openai.com/v1/track",
    "https://vars.hotjar.com/box-123.html",
    "https://vitals.vercel-insights.com/v1/vitals",
    `${fixtureOrigin}/_vercel/insights/event`,
    `${fixtureOrigin}/_vercel/speed-insights/vitals`,
  ];
  await page.evaluate((urls) => {
    for (const url of urls) navigator.sendBeacon(url, "synthetic-qa-event");
    const pixel = document.createElement("img");
    pixel.src = "https://www.facebook.com/tr/?id=123456789&ev=PageView&noscript=1";
    document.body.append(pixel);
  }, collectorUrls);
  await expect.poll(async () => {
    return page.evaluate(async (urls) => Promise.all(urls.map(async (url) =>
      (await fetch(url, { method: "POST", body: "synthetic-qa-event" })).status,
    )), collectorUrls);
  }).toEqual(collectorUrls.map(() => 204));

  const defaults = await page.evaluate(async (origin) => {
    const form = await fetch("https://formspree.io/f/synthetic-qa-form", {
      method: "POST", body: "synthetic-qa-lead",
    });
    const paths = ["receipt-token", "receipt", "sync/leads", "sync/conversions", "sync/ad-delivery", "sync/validations", "postbacks", "retention"];
    const mutations = await Promise.all(paths.map(async (path) => {
      const response = await fetch(`${origin}/api/attribution/${path}`, {
        method: "POST", body: "synthetic-qa-input",
      });
      return { status: response.status, body: await response.json() };
    }));
    return { formStatus: form.status, mutations };
  }, fixtureOrigin);
  expect(defaults.formStatus).toBe(422);
  expect(defaults.mutations).toEqual(defaults.mutations.map(() => ({
    status: 503, body: { error: "qa_network_isolation" },
  })));
  expect(escapedRequests).toEqual([]);
});

test("explicit form and receipt fixtures override safe defaults without allowing network", async ({ context, page }) => {
  const escapedRequests: string[] = [];
  await context.route("**/*", async (route) => {
    escapedRequests.push(route.request().url());
    await route.fulfill({ status: 599 });
  });
  await blockOpenAIAdsPixelNetwork(context);
  await page.route(`${fixtureOrigin}/`, (route) => route.fulfill({
    status: 200, contentType: "text/html", body: "<!doctype html><title>Offline QA fixture</title>",
  }));
  await page.route("https://formspree.io/f/synthetic-qa-form", (route) => route.fulfill({
    status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: '{"ok":true}',
  }));
  await page.route("**/api/attribution/receipt", (route) => route.fulfill({
    status: 202, contentType: "application/json", body: '{"fixture":true}',
  }));
  await page.goto(fixtureOrigin);
  const statuses = await page.evaluate(async (origin) => [
    (await fetch("https://formspree.io/f/synthetic-qa-form", { method: "POST", body: "synthetic" })).status,
    (await fetch(`${origin}/api/attribution/receipt`, { method: "POST", body: "synthetic" })).status,
  ], fixtureOrigin);
  expect(statuses).toEqual([200, 202]);
  expect(escapedRequests).toEqual([]);
});
