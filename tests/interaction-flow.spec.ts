import { expect, test } from "@playwright/test";

import {
  blockElevenLabsWidgetScript,
  elevenLabsScriptSrc,
  localOrigin,
} from "./support/qa-helpers";

async function gotoSettled(page: import("@playwright/test").Page, path: string) {
  await page.goto(`${localOrigin}${path}`, {
    timeout: 120_000,
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(2_000);
}

test.describe("live-style interaction flows", () => {
  test("ElevenLabs widget stays bounded and does not block primary navigation", async ({
    context,
    page,
  }) => {
    await context.route(`${elevenLabsScriptSrc}**`, async (route) => {
      await route.fulfill({
        body: `
          class MockElevenLabsConvai extends HTMLElement {
            connectedCallback() {
              this.style.position = "fixed";
              this.style.inset = "0";
              this.style.width = "100vw";
              this.style.height = "100vh";
              this.style.zIndex = "1000";
              if (!this.shadowRoot) {
                const root = this.attachShadow({ mode: "open" });
                root.innerHTML = [
                  "<style>",
                  ".mock-elevenlabs-overlay {",
                  "align-items: flex-end;",
                  "display: flex;",
                  "inset: 32px;",
                  "justify-content: flex-end;",
                  "position: absolute;",
                  "}",
                  ".mock-elevenlabs-card {",
                  "background: #fff;",
                  "border-radius: 18px;",
                  "box-sizing: border-box;",
                  "color: #111827;",
                  "height: 100%;",
                  "max-width: 256px;",
                  "overflow: hidden;",
                  "width: 256px;",
                  "}",
                  ".mock-elevenlabs-row {",
                  "align-items: center;",
                  "box-sizing: border-box;",
                  "display: flex;",
                  "height: 44px;",
                  "padding: 0 12px;",
                  "}",
                  "</style>",
                  '<div class="mock-elevenlabs-overlay">',
                  '<div class="mock-elevenlabs-card">',
                  '<div class="mock-elevenlabs-row">Need help?</div>',
                  '<div class="mock-elevenlabs-row">Start a call</div>',
                  "</div>",
                  "</div>",
                ].join("");
              }
            }
          }
          customElements.define("elevenlabs-convai", MockElevenLabsConvai);
        `,
        contentType: "text/javascript",
        status: 200,
      });
    });

    await page.setViewportSize({ height: 720, width: 1280 });
    await gotoSettled(page, "/");

    const widgetBounds = await page.locator("elevenlabs-convai").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
      };
    });

    expect(widgetBounds.width).toBeLessThanOrEqual(340);
    expect(widgetBounds.height).toBeLessThanOrEqual(180);

    const mockWidgetFit = await page.locator("elevenlabs-convai").evaluate((element) => {
      const card = element.shadowRoot?.querySelector<HTMLElement>(".mock-elevenlabs-card");
      const rows = Array.from(
        element.shadowRoot?.querySelectorAll<HTMLElement>(".mock-elevenlabs-row") ?? [],
      );
      const cardRect = card?.getBoundingClientRect();
      const lastRowRect = rows.at(-1)?.getBoundingClientRect();

      return {
        cardHeight: Math.round(cardRect?.height ?? 0),
        cardWidth: Math.round(cardRect?.width ?? 0),
        clipsRows:
          Boolean(cardRect && lastRowRect) &&
          Math.ceil(lastRowRect!.bottom) > Math.floor(cardRect!.bottom),
      };
    });

    expect(mockWidgetFit.cardWidth).toBeGreaterThanOrEqual(250);
    expect(mockWidgetFit.cardHeight).toBeGreaterThanOrEqual(96);
    expect(mockWidgetFit.clipsRows).toBeFalsy();

    const contactButton = page.locator('[data-rda-contact-us="true"]:visible').first();
    await expect(contactButton).toBeVisible();

    const hitTestTargetsContactButton = await contactButton.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === element || element.contains(hit);
    });

    expect(hitTestTargetsContactButton).toBeTruthy();

    await contactButton.click();
    await page.waitForURL("**/contact", { timeout: 12_000 });
  });

  test.describe("without third-party widget noise", () => {
    test.beforeEach(async ({ context }) => {
      await blockElevenLabsWidgetScript(context);
    });

    test("desktop More menu opens and navigates to More Information pages", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      await page.getByRole("button", { name: /^more information$/i }).click();

      const menu = page.locator('[data-rda-more-menu][data-open="true"]');
      await expect(menu).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "Meet the Instructors" })).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "FAQs" })).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "Photos" })).toBeVisible();

      await menu.getByRole("menuitem", { name: "FAQs" }).click();
      await page.waitForURL("**/faqs-1", { timeout: 12_000 });
      await expect(
        page.locator("main").getByText("Dental Assisting Program FAQs", { exact: true }),
      ).toBeVisible();
    });

    test("cookie banner Accept dismisses the banner and persists locally", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      await expect(
        page.locator('#trustedsite-tm-image, [title="TrustedSite Certified"]'),
      ).toHaveCount(0);

      const banner = page.locator('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]').first();
      const accept = page.locator('[data-aid="FOOTER_COOKIE_CLOSE_RENDERED"]').first();

      await expect(banner).toBeVisible();
      await accept.click();
      await expect(banner).toBeHidden();

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1_000);
      await expect(banner).toBeHidden();
    });

    test("homepage newsletter signup has a submission path and email validation", async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const submit = page.locator('[data-aid="SUBSCRIBE_SUBMIT_BUTTON_REND"]').first();
      const form = page.locator('form[data-rda-subscribe-form="true"]').first();
      const email = form.locator('input[name="_replyto"]').first();

      await expect(submit).toBeVisible();
      await expect(form).toHaveAttribute("action", "https://formspree.io/f/xzdkgaeg");
      await expect(form).toHaveAttribute("method", /post/i);
      await expect(email).toHaveAttribute("type", "email");
      await expect(email).toHaveAttribute("required", "");
      await expect(email).toHaveAttribute("aria-label", "Email");
    });

    test("contact page actions are wired", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/contact");

      await expect(page.getByRole("link", { name: "916-888-9821" }).first()).toHaveAttribute(
        "href",
        /tel:9168889821/,
      );
      await expect(
        page.getByRole("link", { name: "rosevilledentalacademy@gmail.com" }).first(),
      ).toHaveAttribute("href", "mailto:rosevilledentalacademy@gmail.com");

      await page.getByRole("button", { name: "Drop us a line!" }).click();

      const formContainer = page.locator('[data-aid="CONTACT_FORM_CONTAINER_REND"]').first();
      const form = formContainer.locator("form").first();
      const email = form.locator('input[name="_replyto"]').first();

      await expect(formContainer).toBeVisible();
      await expect(form).toHaveAttribute("action", "https://formspree.io/f/xzdkgaeg");
      await expect(email).toHaveAttribute("type", "email");
      await expect(email).toHaveAttribute("required", "");

      await formContainer.getByText("Cancel").click();
      await expect(formContainer).toBeHidden();

      const popupPromise = page.waitForEvent("popup", { timeout: 8_000 });
      await page.getByRole("link", { name: "Get directions" }).click();
      const popup = await popupPromise;

      await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
      expect(popup.url()).toContain("google.com/maps/dir/");
      await popup.close();
    });
  });
});
