import { expect, test, type Page } from "@playwright/test";

import {
  HOW_HEARD_FIELD,
  HOW_HEARD_OPTIONS,
  HOW_HEARD_OTHER_FIELD,
} from "@/lib/how-heard";
import { googleReviewsAggregate } from "@/lib/site-data";
import { localOrigin, suppressSeasonalTheme, suppressSitePromo } from "./support/qa-helpers";

// Behavior contracts for the October 2026 "Chairside" redesign: the
// "How did you hear about us?" question on every lead form, its payload and
// analytics boundaries, light/dark theming, the /reviews page, motion safety,
// and responsive overflow in both themes.

async function gotoSettled(page: Page, path: string) {
  await suppressSitePromo(page.context());
  await page.goto(`${localOrigin}${path}`, { timeout: 120_000, waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(1_200);
}

async function captureAnalytics(page: Page) {
  await page.addInitScript(() => {
    const analyticsWindow = window as Window & {
      __rdaTestGtagEvents?: unknown[][];
      __rdaTestMetaEvents?: unknown[][];
      __rdaTestVercelEvents?: unknown[][];
      fbq?: (...args: unknown[]) => void;
      gtag?: (...args: unknown[]) => void;
    };

    analyticsWindow.__rdaTestGtagEvents = [];
    analyticsWindow.__rdaTestMetaEvents = [];
    analyticsWindow.__rdaTestVercelEvents = [];
    analyticsWindow.gtag = (...args: unknown[]) => {
      analyticsWindow.__rdaTestGtagEvents?.push(args);
    };
    analyticsWindow.fbq = (...args: unknown[]) => {
      analyticsWindow.__rdaTestMetaEvents?.push(args);
    };
    const captureVercelEvent = (...args: unknown[]) => {
      analyticsWindow.__rdaTestVercelEvents?.push(args);
    };

    Object.defineProperty(window, "va", {
      configurable: true,
      get: () => captureVercelEvent,
      set: () => undefined,
    });
  });
}

async function mockLeadEndpoints(page: Page) {
  const bodies: string[] = [];

  await page.route("https://formspree.io/f/**", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.fulfill({ body: JSON.stringify({ ok: true }), contentType: "application/json", status: 200 });
  });
  await page.route("**/api/attribution/receipt-token", (route) =>
    route.fulfill({ body: JSON.stringify({ token: "" }), contentType: "application/json", status: 201 }),
  );
  await page.route("**/api/attribution/receipt", (route) =>
    route.fulfill({ body: "{}", contentType: "application/json", status: 202 }),
  );

  return bodies;
}

test.describe("redesign contracts", () => {
  test.beforeEach(async ({ context }) => {
    await suppressSeasonalTheme(context);
  });

  test("every public lead form asks how the visitor heard about us", async ({ page }) => {
    const forms = [
      { path: "/", selector: 'form[data-rda-signup-form="true"]' },
      { path: "/contact", selector: 'form[data-rda-contact-form="true"]' },
      { path: "/dental-assisting-program", selector: 'form[data-rda-signup-form="true"]' },
      { path: "/lp/dental-assisting-enroll", selector: 'form[data-rda-landing-form="true"]' },
      { path: "/lp/coronal-sealants-renewal", selector: 'form[data-rda-landing-form="true"]' },
    ];

    await page.setViewportSize({ height: 900, width: 1280 });

    for (const entry of forms) {
      await gotoSettled(page, entry.path);
      const form = page.locator(entry.selector).first();
      const radios = form.locator(`input[type="radio"][name="${HOW_HEARD_FIELD}"]`);

      await expect(radios, `${entry.path} how-heard options`).toHaveCount(HOW_HEARD_OPTIONS.length);
      await expect(radios.first()).toHaveAttribute("required", "");
      expect(await radios.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))).toEqual(
        HOW_HEARD_OPTIONS.map((option) => option.value),
      );
      for (const option of HOW_HEARD_OPTIONS) {
        await expect(form.locator(".ac-pill", { hasText: option.label })).toBeVisible();
      }
      // The visible answer never replaces the hidden attribution stamp.
      await expect(form.locator('input[name="how-heard"]')).toHaveValue("website");
      await expect(form.locator(`[name="${HOW_HEARD_OTHER_FIELD}"]`)).toHaveCount(0);
    }
  });

  test("choosing Other reveals a required free-text field that is removed on switch", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await gotoSettled(page, "/");
    const form = page.locator('form[data-rda-signup-form="true"]');
    const other = form.locator(`[name="${HOW_HEARD_OTHER_FIELD}"]`);

    await form.locator(".ac-pill", { hasText: "Other" }).click();
    await expect(other).toBeVisible();
    await expect(other).toBeFocused();
    await expect(other).toHaveAttribute("required", "");
    await expect(other).toHaveAttribute("maxlength", "120");

    await form.locator(".ac-pill", { hasText: "Google search" }).click();
    await expect(other).toHaveCount(0);
  });

  test("signup submit sends the answer to Formspree and only the category to analytics", async ({ page }) => {
    await captureAnalytics(page);
    const bodies = await mockLeadEndpoints(page);

    await page.setViewportSize({ height: 900, width: 1280 });
    await gotoSettled(page, "/");
    const form = page.locator('form[data-rda-signup-form="true"]');

    await form.locator(".ac-tile", { hasText: "BLS / CPR" }).click();
    await form.locator('input[name="Name"]').fill("Test Student");
    await form.locator('input[name="_replyto"]').fill("student@example.com");
    await form.locator('input[name="Phone"]').fill("9165550123");
    await expect(form.locator('input[name="Phone"]')).toHaveValue("(916) 555-0123");
    await form.locator(".ac-pill", { hasText: "Other" }).click();
    await form.locator(`[name="${HOW_HEARD_OTHER_FIELD}"]`).fill("Saw a flyer at the library");
    await expect(form.locator(".ac-progress")).toHaveAttribute("data-complete", "true");
    await form.getByRole("button", { name: /Request next steps/ }).click();

    await expect(page.locator('[data-rda-lead-form-success="true"]')).toBeVisible({ timeout: 15_000 });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain(`name="${HOW_HEARD_FIELD}"`);
    expect(bodies[0]).toContain("Other");
    expect(bodies[0]).toContain(`name="${HOW_HEARD_OTHER_FIELD}"`);
    expect(bodies[0]).toContain("Saw a flyer at the library");
    expect(bodies[0]).toContain('name="Interested classes[]"');
    expect(bodies[0]).toContain("BLS / CPR");

    const tracked = JSON.stringify(
      await page.evaluate(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };
        return [analyticsWindow.__rdaTestGtagEvents, analyticsWindow.__rdaTestMetaEvents, analyticsWindow.__rdaTestVercelEvents];
      }),
    );

    expect(tracked).toContain("generate_lead");
    expect(tracked).toContain('"self_reported_source":"other"');
    for (const secret of ["Saw a flyer", "student@example.com", "555-0123", "Test Student"]) {
      expect(tracked).not.toContain(secret);
    }
  });

  test("submitting without an answer is blocked with inline errors", async ({ page }) => {
    const bodies = await mockLeadEndpoints(page);

    await page.setViewportSize({ height: 900, width: 1280 });
    await gotoSettled(page, "/contact");
    const form = page.locator('form[data-rda-contact-form="true"]');

    await form.locator('input[name="name"]').fill("Test Student");
    await form.locator('input[name="_replyto"]').fill("not-an-email");
    await form.locator('textarea[name="message"]').fill("Hello");
    await form.getByRole("button", { name: /^Send/ }).click();

    await expect(form.getByText("Please tell us how you heard about us.")).toBeVisible();
    await expect(form.getByText(/email doesn't look quite right/)).toBeVisible();
    await expect(form.locator('input[name="_replyto"]')).toHaveAttribute("aria-invalid", "true");
    expect(bodies).toHaveLength(0);
  });

  test("theme follows the system and the toggle persists a choice", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark", viewport: { height: 900, width: 1280 } });
    await suppressSeasonalTheme(context);
    const page = await context.newPage();

    await gotoSettled(page, "/");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(10, 17, 24)");

    const toggle = page.locator('header [data-rda-theme-toggle="true"]').first();
    await expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");
    await toggle.click();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    await expect(page.locator('header [data-rda-theme-toggle="true"]').first()).toHaveAttribute(
      "aria-label",
      "Switch to dark mode",
    );
    await context.close();
  });

  test("reviews page shows the aggregate and filters the wall", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await suppressSitePromo(page.context());
    const response = await page.goto(`${localOrigin}/reviews`, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("load").catch(() => undefined);

    await expect(page).toHaveTitle("Student Reviews | Roseville Dental Academy");
    await expect(page.locator("h1")).toContainText("Hear it from the");
    await expect(page.getByText(`${googleReviewsAggregate.reviewCount} Google reviews`).first()).toBeVisible();

    const wall = page.locator('[data-rda-review-wall="true"]');
    const cards = wall.locator(".ac-wall-card");
    await expect(cards).toHaveCount(18);
    const xrays = wall.getByRole("button", { name: "X-rays" });
    // Retry until hydration has attached the filter handlers.
    await expect(async () => {
      if ((await xrays.getAttribute("aria-pressed")) !== "true") await xrays.click();
      await expect(xrays).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    const xrayCount = await cards.count();
    expect(xrayCount).toBeGreaterThan(0);
    expect(xrayCount).toBeLessThan(18);
    for (const text of await cards.allInnerTexts()) {
      expect(text).toMatch(/x-?ray|radiograph/i);
    }

    await wall.getByRole("button", { name: "All", exact: true }).click();
    await wall.getByRole("searchbox", { name: "Search reviews" }).fill("Sandra");
    await expect(cards.first()).toContainText("Sandra");
  });

  test("courses mega menu lists every course with its price", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await gotoSettled(page, "/");
    await page.locator(".rda-desktop-nav").getByRole("button", { name: "Courses" }).click();
    const menu = page.locator('[data-rda-courses-menu="true"]');

    await expect(menu).toBeVisible();
    for (const [label, price] of [
      ["Dental Assisting Program", "$2,500"],
      ["BLS/CPR", "$85"],
      ["Infection Control", "$395"],
      ["Radiation Safety", "$695"],
      ["Coronal Polish", "$500"],
      ["Sealants", "$550"],
    ]) {
      await expect(menu).toContainText(label);
      await expect(menu).toContainText(price);
    }
  });

  test("reduced motion shows every reveal and pauses the hero", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { height: 900, width: 1280 } });
    await suppressSeasonalTheme(context);
    const page = await context.newPage();

    await gotoSettled(page, "/");
    const hidden = await page.evaluate(
      () => Array.from(document.querySelectorAll("[data-reveal]")).filter((element) => getComputedStyle(element).opacity !== "1").length,
    );
    expect(hidden).toBe(0);
    await expect(page.locator("html")).not.toHaveClass(/rda-motion/);
    await expect(page.getByRole("button", { name: "Play slideshow" })).toBeVisible();
    await context.close();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`no horizontal overflow on key routes (${scheme})`, async ({ browser }) => {
      test.setTimeout(600_000);
      const context = await browser.newContext({ colorScheme: scheme });
      await suppressSeasonalTheme(context);
      const page = await context.newPage();

      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ height: 900, width });

        for (const path of ["/", "/reviews", "/meet-the-instructors", "/photos", "/sealants"]) {
          await gotoSettled(page, path);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          expect(overflow, `${path} at ${width}px (${scheme})`).toBeLessThanOrEqual(1);
        }
      }

      await context.close();
    });
  }
});
