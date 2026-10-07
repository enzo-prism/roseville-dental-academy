import { expect, test, type Locator, type Page } from "@playwright/test";

import { DEFAULT_META_PIXEL_ID } from "@/lib/meta-pixel-config";
import { suppressSitePromo } from "./support/qa-helpers";

const creatives = [
  { name: "video", content: "video_sept25_clinical", adId: "120249119768590567" },
  { name: "photo", content: "photo_sept18_graduation", adId: "120249119794550567" },
] as const;
const campaignId = "120248940578090567";
const adsetId = "120248940578070567";
const attributionCases = creatives.flatMap((creative) => [
  { ...creative, name: `saved ${creative.name}`, expectedAdId: "", nativeQuery: "" },
  { ...creative, name: `${creative.name} with explicit native IDs`, expectedAdId: creative.adId,
    nativeQuery: `&ad_id=${creative.adId}&campaign_id=${campaignId}&adset_id=${adsetId}` },
]);
const student = { name: "Synthetic Measurement Student", email: "synthetic-measurement@example.test", phone: "916-555-0107", notes: "SYNTHETIC_PRIVATE_NOTE" };

type Captures = { meta: unknown[][]; ga: unknown[][]; openai: unknown[][]; vercel: unknown[][]; successes: unknown[] };
type CaptureWindow = Window & {
  __rdaMetaFlow: Captures;
  fbq: (...args: unknown[]) => void;
  gtag: (...args: unknown[]) => void;
  oaiq: (...args: unknown[]) => void;
};

function sealantsUrl(content: string) {
  return `/sealants?utm_source=facebook&utm_medium=paid_social&utm_campaign=rda_sealants_leads&utm_content=${content}`;
}

async function captureCollectors(page: Page, origin: string) {
  // Fail closed for every nonlocal request. Third-party SDKs/collectors and
  // any unmatched form submission can never reach a live service.
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin === origin) return route.fallback();
    await route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  await page.addInitScript(() => {
    const captured = window as unknown as CaptureWindow;
    captured.__rdaMetaFlow = { meta: [], ga: [], openai: [], vercel: [], successes: [] };
    captured.fbq = (...args) => captured.__rdaMetaFlow.meta.push(args);
    captured.gtag = (...args) => captured.__rdaMetaFlow.ga.push(args);
    captured.oaiq = (...args) => captured.__rdaMetaFlow.openai.push(args);
    Object.defineProperty(window, "va", {
      configurable: true,
      get: () => (...args: unknown[]) => captured.__rdaMetaFlow.vercel.push(args),
      set: () => undefined,
    });
    document.addEventListener("rda:lead-form-success", (event) => {
      captured.__rdaMetaFlow.successes.push((event as CustomEvent).detail);
    });
  });
}

async function captures(page: Page) {
  return page.evaluate(() => (window as unknown as CaptureWindow).__rdaMetaFlow);
}

function assertNoStudentData(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const secret of Object.values(student)) expect(serialized).not.toContain(secret);
}

function multipartField(body: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return body.match(new RegExp(`name="${escaped}"\\r\\n\\r\\n([^\\r]*)`))?.[1];
}

async function fillSignup(form: Locator) {
  await form.locator('input[name="Name"]').fill(student.name);
  await form.locator('input[name="_replyto"]').fill(student.email);
  await form.locator('input[name="Phone"]').fill(student.phone);
  await form.locator('textarea[name="Notes"]').fill(student.notes);
  if (await form.getByRole("checkbox", { checked: true }).count() === 0) {
    await form.getByRole("checkbox").first().check();
  }
}

test.describe("RDA Meta ads: local intercepted lead measurement", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
    expect(["127.0.0.1", "localhost", "[::1]"]).toContain(new URL(origin).hostname);
    await suppressSitePromo(page.context());
    await captureCollectors(page, origin);
    await page.route("**/api/attribution/receipt-token", (route) => route.fulfill({
      status: 201, contentType: "application/json", body: JSON.stringify({ token: "synthetic-receipt-token" }),
    }));
  });

  for (const creative of attributionCases) {
    test(`${creative.name} URL preserves attribution and sends one accepted Lead`, async ({ page }) => {
      let postedBody = "";
      let receipt: Record<string, unknown> | null = null;
      await page.route("https://formspree.io/**", async (route) => {
        expect(route.request().url()).toBe("https://formspree.io/f/xzdkgaeg");
        postedBody = route.request().postData() ?? "";
        await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      });
      await page.route("**/api/attribution/receipt", async (route) => {
        receipt = JSON.parse(route.request().postData() ?? "null") as Record<string, unknown>;
        await route.fulfill({ status: 202, contentType: "application/json", body: '{"ok":true}' });
      });

      await page.goto(`${sealantsUrl(creative.content)}${creative.nativeQuery}`, { waitUntil: "networkidle" });
      const courseForm = page.locator('form[data-rda-signup-form="true"]').first();
      await expect(courseForm.locator('input[name="utm_content"]')).toHaveValue(creative.content);
      await expect(courseForm.locator('input[name="ad_id"]')).toHaveValue(creative.expectedAdId);
      await expect(courseForm.locator('input[name="Interested classes[]"]')).toHaveValue("Pit and Fissure Sealants");
      expect((await captures(page)).meta).toContainEqual(["init", DEFAULT_META_PIXEL_ID]);

      // A clean course-info visit must retain the paid first touch.
      await page.goto("/dental-assisting-program", { waitUntil: "networkidle" });
      const form = page.locator('form[data-rda-signup-form="true"]').first();
      await expect(form.locator('input[name="utm_source"]')).toHaveValue("facebook");
      await expect(form.locator('input[name="utm_campaign"]')).toHaveValue("rda_sealants_leads");
      await expect(form.locator('input[name="utm_content"]')).toHaveValue(creative.content);
      await expect(form.locator('input[name="ad_id"]')).toHaveValue(creative.expectedAdId);
      await expect(form.locator('input[name="Interested classes[]"]')).toHaveValue("Dental Assisting Program");
      await fillSignup(form);
      await form.getByRole("button", { name: "Request next steps" }).click();
      await expect(page.getByText("Request sent", { exact: true })).toBeVisible();
      await expect.poll(() => receipt).not.toBeNull();

      const observed = await captures(page);
      const leads = observed.meta.filter((event) => event[0] === "track" && event[1] === "Lead");
      const gaLeads = observed.ga.filter((event) => event[0] === "event" && event[1] === "generate_lead");
      const openaiLeads = observed.openai.filter((event) => event[0] === "measure" && event[1] === "lead_created");
      expect(leads).toHaveLength(1);
      expect(gaLeads).toHaveLength(1);
      // These Meta fixtures provide no OpenAI consent. Positive isolated OpenAI
      // delivery/UUID assertions are covered by openai-isolation.spec.ts.
      expect(openaiLeads).toEqual([]);
      await expect(page.locator('[data-rda-openai-measurement="true"]')).toHaveCount(0);
      await expect(page.locator('script[src*="bzrcdn.openai.com"]')).toHaveCount(0);
      expect(observed.successes).toHaveLength(1);
      const eventId = multipartField(postedBody, "lead_event_id");
      expect(eventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(leads[0][2]).toMatchObject({ utm_content: creative.content, lead_event_id: eventId });
      if (creative.expectedAdId) {
        expect(leads[0][2]).toMatchObject({ ad_id: creative.expectedAdId });
        expect(multipartField(postedBody, "campaign_id")).toBe(campaignId);
        expect(multipartField(postedBody, "first_touch_adset_id")).toBe(adsetId);
        expect(multipartField(postedBody, "conversion_touch_adset_id")).toBe(adsetId);
      } else {
        expect(leads[0][2]).not.toHaveProperty("ad_id");
        expect(multipartField(postedBody, "ad_id")).toBe("");
      }
      expect(leads[0][3]).toEqual({ eventID: eventId });
      expect(gaLeads[0][2]).toMatchObject({ lead_event_id: eventId });
      expect(observed.successes[0]).toMatchObject({ leadEventId: eventId, openAIAdsReference: { allowed: false } });
      expect(receipt).toMatchObject({ leadEventId: eventId });
      assertNoStudentData([leads, gaLeads, openaiLeads, observed.successes, receipt]);
      expect(observed.meta).toContainEqual(["init", DEFAULT_META_PIXEL_ID]);

      // Replayed notification uses the accepted snapshot, never another POST.
      await page.evaluate(() => {
        const captured = window as unknown as CaptureWindow;
        const form = document.createElement("form");
        form.dataset.rdaSignupForm = "true";
        document.body.appendChild(form);
        form.dispatchEvent(new CustomEvent("rda:lead-form-success", { bubbles: true, detail: captured.__rdaMetaFlow.successes[0] }));
        form.remove();
      });
      const replayed = await captures(page);
      expect(replayed.meta.filter((event) => event[1] === "Lead")).toHaveLength(1);
      expect(replayed.ga.filter((event) => event[1] === "generate_lead")).toHaveLength(1);
    });
  }

  test("delayed response measures the accepted course, not later form changes", async ({ page }) => {
    let releaseResponse: (() => void) | undefined;
    let postedBody = "";
    const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
    await page.route("https://formspree.io/**", async (route) => {
      postedBody = route.request().postData() ?? "";
      await responseGate;
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.route("**/api/attribution/receipt", (route) => route.fulfill({ status: 202, body: '{}' }));
    await page.goto(sealantsUrl(creatives[0].content), { waitUntil: "networkidle" });
    const form = page.locator('form[data-rda-signup-form="true"]').first();
    await fillSignup(form);
    const originalCourse = await form.locator('input[name="Interested classes[]"]').first().inputValue();
    await form.getByRole("button", { name: "Request next steps" }).click();
    await expect.poll(() => postedBody).not.toBe("");
    await form.getByRole("checkbox", { checked: true }).first().uncheck();
    await expect(form.locator('input[name="Interested classes[]"]')).toHaveCount(0);
    expect((await captures(page)).meta.filter((event) => event[1] === "Lead")).toHaveLength(0);
    releaseResponse?.();
    await expect(page.getByText("Request sent", { exact: true })).toBeVisible();
    const observed = await captures(page);
    const leads = observed.meta.filter((event) => event[1] === "Lead");
    expect(leads).toHaveLength(1);
    expect(leads[0][2]).toMatchObject({ selected_count: 1, selected_items: originalCourse.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") });
    assertNoStudentData([leads, observed.successes]);
  });

  test("rejected Formspree request produces no lead or receipt", async ({ page }) => {
    let receipts = 0;
    await page.route("https://formspree.io/**", (route) => route.fulfill({ status: 422, contentType: "application/json", body: '{"error":"synthetic_rejection"}' }));
    await page.route("**/api/attribution/receipt", async (route) => {
      receipts += 1;
      await route.fulfill({ status: 202, body: '{}' });
    });
    await page.goto(sealantsUrl(creatives[1].content), { waitUntil: "networkidle" });
    const form = page.locator('form[data-rda-signup-form="true"]').first();
    await fillSignup(form);
    await form.getByRole("button", { name: "Request next steps" }).click();
    await expect(page.locator('[data-rda-lead-form-error="true"]')).toBeVisible();
    const observed = await captures(page);
      expect(observed.meta.filter((event) => event[1] === "Lead")).toHaveLength(0);
      expect(observed.meta.filter((event) => event[0] === "trackSingle")).toHaveLength(0);
      expect(observed.ga.filter((event) => event[1] === "generate_lead")).toHaveLength(0);
    expect(observed.openai.filter((event) => event[1] === "lead_created")).toHaveLength(0);
    expect(observed.successes).toHaveLength(0);
    expect(receipts).toBe(0);
  });

  test("phone and WhatsApp Meta Contact properties exclude query identifiers", async ({ page }) => {
    await page.goto(`${sealantsUrl(creatives[0].content)}&fbclid=synthetic_private_click&arbitrary=synthetic-private%40example.test`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      for (const selector of ['a[href^="tel:"]', "a[data-rda-whatsapp]"]) {
        const link = document.querySelector<HTMLAnchorElement>(selector);
        link?.addEventListener("click", (event) => event.preventDefault(), { once: true });
        link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }
    });
    const observed = await captures(page);
    const contacts = observed.meta.filter((event) => event[1] === "Contact");
    expect(contacts).toHaveLength(2);
    for (const event of contacts) {
      expect(event[2]).toMatchObject({ page_path: "/sealants" });
      const properties = JSON.stringify(event[2]);
      expect(properties).not.toMatch(/fbclid|synthetic_private_click|arbitrary|synthetic-private|utm_|ad_id/);
    }
  });

  test("unset secondary pixel keeps primary-only bootstrap, PageView, and Lead", async ({ page }) => {
    await page.route("https://formspree.io/**", (route) => route.fulfill({
      status: 200, contentType: "application/json", body: '{"ok":true}',
    }));
    await page.route("**/api/attribution/receipt", (route) => route.fulfill({ status: 202, body: '{}' }));
    await page.goto(sealantsUrl(creatives[0].content), { waitUntil: "networkidle" });

    const bootstrap = await page.locator("#rda-meta-pixel").textContent();
    expect(bootstrap).toContain(`fbq('init', ${JSON.stringify(DEFAULT_META_PIXEL_ID)});`);
    expect(bootstrap).toContain("fbq('track', 'PageView');");
    expect(bootstrap).not.toContain("trackSingle");
    expect(bootstrap).not.toContain("2267802987317047");
    const noscript = await page.evaluate(() =>
      [...document.querySelectorAll("noscript")].map((node) => node.innerHTML).join(""),
    );
    expect(noscript).toContain(`facebook.com/tr?id=${DEFAULT_META_PIXEL_ID}&ev=PageView&noscript=1`);
    expect(noscript.match(/facebook\.com\/tr\?id=/g)).toHaveLength(1);

    const beforeSubmit = await captures(page);
    const pageViews = beforeSubmit.meta.filter((event) => event[0] === "track" && event[1] === "PageView");
    expect(beforeSubmit.meta.filter((event) => event[0] === "init")).toEqual([["init", DEFAULT_META_PIXEL_ID]]);
    expect(beforeSubmit.meta.filter((event) => event[0] === "trackSingle")).toEqual([]);
    expect(pageViews).toHaveLength(1);

    const form = page.locator('form[data-rda-signup-form="true"]').first();
    await fillSignup(form);
    await form.getByRole("button", { name: "Request next steps" }).click();
    await expect(page.getByText("Request sent", { exact: true })).toBeVisible();

    const observed = await captures(page);
    const leads = observed.meta.filter((event) => event[0] === "track" && event[1] === "Lead");
    expect(leads).toHaveLength(1);
    expect(observed.meta.filter((event) => event[0] === "trackSingle")).toEqual([]);
    expect(leads[0][3]).toEqual({ eventID: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    assertNoStudentData([leads, observed.successes]);
  });

  for (const restriction of ["GPC", "DNT", "denied-cookie"] as const) {
    test(`${restriction} blocks Meta bootstrap and accepted Lead measurement`, async ({ page, baseURL }) => {
      if (restriction === "denied-cookie") {
        await page.context().addCookies([
          { name: "rda_attribution_consent", value: "granted", url: baseURL ?? "http://127.0.0.1:3000" },
          { name: "rda_analytics_consent", value: "denied", url: baseURL ?? "http://127.0.0.1:3000" },
        ]);
      } else {
        await page.addInitScript((privacySignal) => {
          Object.defineProperty(navigator, privacySignal === "GPC" ? "globalPrivacyControl" : "doNotTrack", {
            configurable: true, value: privacySignal === "GPC" ? true : "1",
          });
        }, restriction);
      }
      await page.route("https://formspree.io/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
      await page.route("**/api/attribution/receipt", (route) => route.fulfill({ status: 202, body: '{}' }));
      await page.goto(sealantsUrl(creatives[0].content), { waitUntil: "networkidle" });
      const form = page.locator('form[data-rda-signup-form="true"]').first();
      await fillSignup(form);
      await form.getByRole("button", { name: "Request next steps" }).click();
      await expect(page.getByText("Request sent", { exact: true })).toBeVisible();
      const observed = await captures(page);
      expect(observed.meta.filter((event) => event[0] === "track" || event[0] === "trackSingle" || event[0] === "init")).toHaveLength(0);
      expect(observed.meta).toContainEqual(["consent", "revoke"]);
      expect(observed.meta).not.toContainEqual(["consent", "grant"]);
      expect(observed.successes).toHaveLength(1);
      await expect(page.locator('script[src*="connect.facebook.net"]')).toHaveCount(0);
    });
  }
});
