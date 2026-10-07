import { expect, test, type Locator, type Page } from "@playwright/test";

import { DEFAULT_META_PIXEL_ID } from "@/lib/meta-pixel-config";
import { suppressSitePromo } from "./support/qa-helpers";

const SECONDARY_PIXEL_ID = process.env.NEXT_PUBLIC_META_SECONDARY_PIXEL_ID?.trim() || "999888777666555";
const student = {
  name: "Synthetic Measurement Student",
  email: "synthetic-measurement@example.test",
  phone: "916-555-0107",
  notes: "SYNTHETIC_PRIVATE_NOTE",
};

type Captures = { meta: unknown[][]; successes: unknown[] };
type CaptureWindow = Window & {
  __rdaSecondaryMeta: Captures;
  fbq: (...args: unknown[]) => void;
};

function sealantsUrl() {
  return "/sealants?utm_source=facebook&utm_medium=paid_social&utm_campaign=rda_sealants_leads&utm_content=video_sept25_clinical";
}

async function captureCollectors(page: Page, origin: string) {
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin === origin) return route.fallback();
    await route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  await page.addInitScript(() => {
    const captured = window as unknown as CaptureWindow;
    captured.__rdaSecondaryMeta = { meta: [], successes: [] };
    captured.fbq = (...args) => captured.__rdaSecondaryMeta.meta.push(args);
    document.addEventListener("rda:lead-form-success", (event) => {
      captured.__rdaSecondaryMeta.successes.push((event as CustomEvent).detail);
    });
  });
}

async function captures(page: Page) {
  return page.evaluate(() => (window as unknown as CaptureWindow).__rdaSecondaryMeta);
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

function eventsFor(
  observed: Captures,
  command: string,
  eventName: string,
  pixelId?: string,
) {
  return observed.meta.filter((event) => {
    if (event[0] !== command || event[1] !== (pixelId ?? eventName)) return false;
    return pixelId ? event[2] === eventName : true;
  });
}

test.describe("optional secondary Meta Pixel when enabled", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    expect(SECONDARY_PIXEL_ID).not.toBe(DEFAULT_META_PIXEL_ID);
    const origin = new URL(baseURL ?? "http://127.0.0.1:3208").origin;
    expect(["127.0.0.1", "localhost", "[::1]"]).toContain(new URL(origin).hostname);
    await suppressSitePromo(page.context());
    await captureCollectors(page, origin);
    await page.route("**/api/attribution/receipt-token", (route) => route.fulfill({
      status: 201, contentType: "application/json", body: JSON.stringify({ token: "synthetic-receipt-token" }),
    }));
  });

  test("both pixels receive exactly one PageView and one accepted Lead with the same eventID", async ({ page }) => {
    let postedBody = "";
    await page.route("https://formspree.io/**", async (route) => {
      postedBody = route.request().postData() ?? "";
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.route("**/api/attribution/receipt", (route) => route.fulfill({
      status: 202, contentType: "application/json", body: '{"ok":true}',
    }));

    await page.goto(sealantsUrl(), { waitUntil: "networkidle" });
    const bootstrap = await page.locator("#rda-meta-pixel").textContent();
    expect(bootstrap).toContain(`fbq('init', ${JSON.stringify(DEFAULT_META_PIXEL_ID)});`);
    expect(bootstrap).toContain(`fbq('init', ${JSON.stringify(SECONDARY_PIXEL_ID)});`);
    expect(bootstrap).toContain(
      `fbq('trackSingle', ${JSON.stringify(DEFAULT_META_PIXEL_ID)}, 'PageView');`,
    );
    expect(bootstrap).toContain(
      `fbq('trackSingle', ${JSON.stringify(SECONDARY_PIXEL_ID)}, 'PageView');`,
    );
    expect(bootstrap).not.toContain("fbq('track', 'PageView');");

    const noscript = await page.evaluate(() =>
      [...document.querySelectorAll("noscript")].map((node) => node.innerHTML).join(""),
    );
    expect(noscript).toContain(`facebook.com/tr?id=${DEFAULT_META_PIXEL_ID}&ev=PageView&noscript=1`);
    expect(noscript).toContain(`facebook.com/tr?id=${SECONDARY_PIXEL_ID}&ev=PageView&noscript=1`);
    expect(noscript.match(/facebook\.com\/tr\?id=/g)).toHaveLength(2);

    const beforeSubmit = await captures(page);
    expect(beforeSubmit.meta.filter((event) => event[0] === "init")).toEqual([
      ["init", DEFAULT_META_PIXEL_ID],
      ["init", SECONDARY_PIXEL_ID],
    ]);
    expect(eventsFor(beforeSubmit, "track", "PageView")).toEqual([]);
    expect(eventsFor(beforeSubmit, "trackSingle", "PageView", DEFAULT_META_PIXEL_ID)).toHaveLength(1);
    expect(eventsFor(beforeSubmit, "trackSingle", "PageView", SECONDARY_PIXEL_ID)).toHaveLength(1);

    const form = page.locator('form[data-rda-signup-form="true"]').first();
    await fillSignup(form);
    await form.getByRole("button", { name: "Request next steps" }).click();
    await expect(page.getByText("Request sent", { exact: true })).toBeVisible();

    const observed = await captures(page);
    const primaryLeads = eventsFor(observed, "trackSingle", "Lead", DEFAULT_META_PIXEL_ID);
    const secondaryLeads = eventsFor(observed, "trackSingle", "Lead", SECONDARY_PIXEL_ID);
    expect(eventsFor(observed, "track", "Lead")).toEqual([]);
    expect(primaryLeads).toHaveLength(1);
    expect(secondaryLeads).toHaveLength(1);
    const eventId = multipartField(postedBody, "lead_event_id");
    expect(eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(primaryLeads[0][4]).toEqual({ eventID: eventId });
    expect(secondaryLeads[0][4]).toEqual({ eventID: eventId });
    expect(primaryLeads[0][3]).toMatchObject({ lead_event_id: eventId });
    expect(secondaryLeads[0][3]).toMatchObject({ lead_event_id: eventId });
    expect(observed.successes).toHaveLength(1);
    assertNoStudentData([primaryLeads, secondaryLeads, observed.successes]);
  });

  test("rejected Formspree request produces no Lead on either pixel", async ({ page }) => {
    await page.route("https://formspree.io/**", (route) => route.fulfill({
      status: 422, contentType: "application/json", body: '{"error":"synthetic_rejection"}',
    }));
    await page.goto(sealantsUrl(), { waitUntil: "networkidle" });
    const form = page.locator('form[data-rda-signup-form="true"]').first();
    await fillSignup(form);
    await form.getByRole("button", { name: "Request next steps" }).click();
    await expect(page.locator('[data-rda-lead-form-error="true"]')).toBeVisible();
    const observed = await captures(page);
    expect(observed.meta.filter((event) => event.includes("Lead"))).toEqual([]);
    expect(observed.successes).toHaveLength(0);
  });

  for (const restriction of ["GPC", "denied-cookie"] as const) {
    test(`${restriction} blocks both pixels`, async ({ page, baseURL }) => {
      if (restriction === "denied-cookie") {
        await page.context().addCookies([
          { name: "rda_analytics_consent", value: "denied", url: baseURL ?? "http://127.0.0.1:3208" },
        ]);
      } else {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, "globalPrivacyControl", {
            configurable: true, value: true,
          });
        });
      }
      await page.route("https://formspree.io/**", (route) => route.fulfill({
        status: 200, contentType: "application/json", body: '{"ok":true}',
      }));
      await page.route("**/api/attribution/receipt", (route) => route.fulfill({ status: 202, body: '{}' }));
      await page.goto(sealantsUrl(), { waitUntil: "networkidle" });
      const form = page.locator('form[data-rda-signup-form="true"]').first();
      await fillSignup(form);
      await form.getByRole("button", { name: "Request next steps" }).click();
      await expect(page.getByText("Request sent", { exact: true })).toBeVisible();
      const observed = await captures(page);
      expect(observed.meta.filter((event) => (
        event[0] === "track" || event[0] === "trackSingle" || event[0] === "init"
      ))).toHaveLength(0);
      expect(observed.meta).toContainEqual(["consent", "revoke"]);
      expect(observed.successes).toHaveLength(1);
      await expect(page.locator('script[src*="connect.facebook.net"]')).toHaveCount(0);
    });
  }
});
