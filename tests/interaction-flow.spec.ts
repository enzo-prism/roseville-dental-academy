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
              if (!this.shadowRoot) {
                this.attachShadow({ mode: "open" });
              }
              this.expanded = false;
              this.render();
            }

            render() {
              const expandedMarkup = [
                '<div class="mock-elevenlabs-overlay">',
                '<div class="sheet mock-elevenlabs-sheet">',
                '<div class="mock-elevenlabs-avatar"></div>',
                '<textarea aria-label="Send a message..."></textarea>',
                "</div>",
                '<button class="mock-elevenlabs-collapse" aria-label="Collapse">⌄</button>',
                '<p class="mock-elevenlabs-powered">Powered by ElevenAgents</p>',
                "</div>",
              ].join("");
              const collapsedMarkup = [
                '<div class="mock-elevenlabs-overlay">',
                '<div class="mock-elevenlabs-card">',
                '<div class="mock-elevenlabs-row">Need help?</div>',
                '<button class="mock-elevenlabs-row">Start a call</button>',
                "</div>",
                "</div>",
              ].join("");

              this.shadowRoot.innerHTML = [
                "<style>",
                ":host { display: block; height: 100%; position: relative; width: 100%; }",
                ".mock-elevenlabs-overlay {",
                "align-items: flex-end;",
                "display: flex;",
                "inset: 32px;",
                "justify-content: flex-end;",
                "position: absolute;",
                "}",
                ".mock-elevenlabs-card, .mock-elevenlabs-sheet {",
                "background: #fff;",
                "border-radius: 18px;",
                "box-sizing: border-box;",
                "box-shadow: 0 20px 50px rgba(0, 0, 0, .18);",
                "color: #111827;",
                "overflow: hidden;",
                "}",
                ".mock-elevenlabs-card { padding: 4px; width: 256px; }",
                ".mock-elevenlabs-row {",
                "align-items: center;",
                "box-sizing: border-box;",
                "display: flex;",
                "height: 44px;",
                "padding: 0 12px;",
                "}",
                "button.mock-elevenlabs-row { border: 0; width: 100%; }",
                ".mock-elevenlabs-sheet {",
                "bottom: 80px;",
                "height: calc(100% - 120px);",
                "max-height: 560px;",
                "min-height: 360px;",
                "position: absolute;",
                "right: 0;",
                "width: min(356px, calc(100% - 64px));",
                "}",
                ".mock-elevenlabs-avatar {",
                "background: linear-gradient(135deg, #9ce6e6, #2792dc);",
                "border-radius: 999px;",
                "height: 192px;",
                "margin: 72px auto 0;",
                "width: 192px;",
                "}",
                "textarea {",
                "border: 1px solid #d9dee8;",
                "border-radius: 16px;",
                "bottom: 20px;",
                "box-sizing: border-box;",
                "height: 96px;",
                "left: 16px;",
                "padding: 16px;",
                "position: absolute;",
                "right: 16px;",
                "}",
                ".mock-elevenlabs-collapse {",
                "background: #000;",
                "border: 6px solid #fff;",
                "border-radius: 999px;",
                "bottom: 0;",
                "color: #fff;",
                "height: 66px;",
                "position: absolute;",
                "right: 0;",
                "width: 66px;",
                "}",
                ".mock-elevenlabs-powered {",
                "bottom: -32px;",
                "font-size: 10px;",
                "margin: 0;",
                "opacity: .45;",
                "position: absolute;",
                "right: 0;",
                "}",
                "</style>",
                this.expanded ? expandedMarkup : collapsedMarkup,
              ].join("");

              this.shadowRoot.querySelector("button")?.addEventListener("click", (event) => {
                event.preventDefault();
                this.expanded = !this.expanded;
                this.render();
              });
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

    await page.locator("elevenlabs-convai").evaluate((element) => {
      element.shadowRoot?.querySelector<HTMLButtonElement>("button")?.click();
    });
    await expect(page.locator('[data-elevenlabs-widget-expanded="true"]')).toBeVisible();
    await page.waitForTimeout(250);

    const expandedWidgetBounds = await page.locator("[data-elevenlabs-widget-slot]").evaluate(
      (element) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: Math.round(window.innerHeight - rect.bottom),
          height: Math.round(rect.height),
          right: Math.round(window.innerWidth - rect.right),
          width: Math.round(rect.width),
        };
      },
    );

    expect(expandedWidgetBounds.width).toBeGreaterThanOrEqual(400);
    expect(expandedWidgetBounds.width).toBeLessThanOrEqual(430);
    expect(expandedWidgetBounds.height).toBeGreaterThanOrEqual(560);
    expect(expandedWidgetBounds.height).toBeLessThanOrEqual(630);
    expect(expandedWidgetBounds.bottom).toBe(24);
    expect(expandedWidgetBounds.right).toBe(24);

    const expandedWidgetFit = await page.locator("elevenlabs-convai").evaluate((element) => {
      const root = element.shadowRoot;
      const sheet = root?.querySelector<HTMLElement>(".sheet");
      const textarea = root?.querySelector<HTMLElement>("textarea");
      const collapseButton = root?.querySelector<HTMLElement>(".mock-elevenlabs-collapse");
      const powered = root?.querySelector<HTMLElement>(".mock-elevenlabs-powered");
      const sheetRect = sheet?.getBoundingClientRect();
      const textareaRect = textarea?.getBoundingClientRect();
      const collapseRect = collapseButton?.getBoundingClientRect();
      const poweredRect = powered?.getBoundingClientRect();

      return {
        collapseInViewport:
          Boolean(collapseRect) &&
          collapseRect!.bottom <= window.innerHeight &&
          collapseRect!.right <= window.innerWidth,
        poweredInViewport:
          Boolean(poweredRect) &&
          poweredRect!.bottom <= window.innerHeight &&
          poweredRect!.right <= window.innerWidth,
        sheetHeight: Math.round(sheetRect?.height ?? 0),
        textareaInsideSheet:
          Boolean(sheetRect && textareaRect) &&
          textareaRect!.bottom <= sheetRect!.bottom &&
          textareaRect!.right <= sheetRect!.right,
      };
    });

    expect(expandedWidgetFit.sheetHeight).toBeGreaterThanOrEqual(360);
    expect(expandedWidgetFit.textareaInsideSheet).toBeTruthy();
    expect(expandedWidgetFit.collapseInViewport).toBeTruthy();
    expect(expandedWidgetFit.poweredInViewport).toBeTruthy();

    await page.setViewportSize({ height: 667, width: 390 });
    await gotoSettled(page, "/");
    await page.locator("elevenlabs-convai").evaluate((element) => {
      element.shadowRoot?.querySelector<HTMLButtonElement>("button")?.click();
    });
    await expect(page.locator('[data-elevenlabs-widget-expanded="true"]')).toBeVisible();
    await page.waitForTimeout(250);

    const mobileExpandedFit = await page.evaluate(() => {
      const slot = document.querySelector<HTMLElement>("[data-elevenlabs-widget-slot]");
      const widget = document.querySelector<HTMLElement>("elevenlabs-convai");
      const sheet = widget?.shadowRoot?.querySelector<HTMLElement>(".sheet");
      const collapseButton =
        widget?.shadowRoot?.querySelector<HTMLElement>(".mock-elevenlabs-collapse");
      const cookieBanner = document.querySelector<HTMLElement>(".rda-cookie-banner");
      const slotRect = slot?.getBoundingClientRect();
      const sheetRect = sheet?.getBoundingClientRect();
      const collapseRect = collapseButton?.getBoundingClientRect();
      const cookieStyle = cookieBanner ? window.getComputedStyle(cookieBanner) : null;

      return {
        collapseInViewport:
          Boolean(collapseRect) &&
          collapseRect!.bottom <= window.innerHeight &&
          collapseRect!.right <= window.innerWidth,
        cookieOpacity: cookieStyle?.opacity,
        cookiePointerEvents: cookieStyle?.pointerEvents,
        sheetBottom: Math.round(window.innerHeight - (sheetRect?.bottom ?? 0)),
        sheetHeight: Math.round(sheetRect?.height ?? 0),
        slotHeight: Math.round(slotRect?.height ?? 0),
        slotRight: Math.round(window.innerWidth - (slotRect?.right ?? 0)),
        slotWidth: Math.round(slotRect?.width ?? 0),
      };
    });

    expect(mobileExpandedFit.slotWidth).toBe(390);
    expect(mobileExpandedFit.slotHeight).toBe(555);
    expect(mobileExpandedFit.slotRight).toBe(0);
    expect(mobileExpandedFit.sheetHeight).toBeGreaterThanOrEqual(360);
    expect(mobileExpandedFit.sheetBottom).toBeGreaterThanOrEqual(79);
    expect(mobileExpandedFit.collapseInViewport).toBeTruthy();
    expect(mobileExpandedFit.cookieOpacity).toBe("0");
    expect(mobileExpandedFit.cookiePointerEvents).toBe("none");
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

    test("homepage carousel hero presents a clear sign up path", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoSettled(page, "/");

      const hero = page.locator('[data-rda-home-hero="true"]');
      const cta = page.locator('[data-rda-home-hero-signup="true"]');
      const signup = page.locator("#quick-sign-up[data-rda-signup-section='true']");

      await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
        "Begin Your Career in Dental Assisting",
      );
      await expect(hero.getByText("Train hands-on inside a working dental office")).toBeVisible();
      await expect(hero.locator(".rda-home-hero-slide")).toHaveCount(3);
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", "#quick-sign-up");
      await expect(signup).toBeVisible();

      await cta.click();
      await expect(page).toHaveURL(/#quick-sign-up$/);

      const position = await signup.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: Math.round(rect.bottom),
          top: Math.round(rect.top),
        };
      });

      expect(position.top).toBeGreaterThanOrEqual(0);
      expect(position.top).toBeLessThan(80);
      expect(position.bottom).toBeGreaterThan(300);
    });

    test("quick sign up form is reusable and wired for class interest", async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const submit = page.locator('[data-aid="SIGNUP_INTEREST_SUBMIT_BUTTON_REND"]').first();
      const form = page.locator('form[data-rda-signup-form="true"]').first();
      const name = form.locator('input[name="Name"]').first();
      const email = form.locator('input[name="_replyto"]').first();
      const phone = form.locator('input[name="Phone"]').first();
      const notes = form.locator('textarea[name="Notes"]').first();
      const options = form.locator('input[name="Interested classes[]"]');
      const optionIcons = form.locator(".rda-interest-option-icon[data-rda-signup-icon]");

      await expect(submit).toBeVisible();
      await expect(form).toHaveAttribute("action", "https://formspree.io/f/xzdkgaeg");
      await expect(form).toHaveAttribute("method", /post/i);
      await expect(name).toHaveAttribute("required", "");
      await expect(email).toHaveAttribute("type", "email");
      await expect(email).toHaveAttribute("required", "");
      await expect(phone).toHaveAttribute("type", "tel");
      await expect(phone).toHaveAttribute("required", "");
      await expect(notes).toBeVisible();
      await expect(options).toHaveCount(9);
      await expect(optionIcons).toHaveCount(9);
      await expect(form.locator('[data-rda-signup-icon="name"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="email"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="phone"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="notes"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="submit"]')).toBeVisible();

      await name.fill("Test Student");
      await email.fill("student@example.com");
      await phone.fill("916-555-0123");
      await submit.click();
      await expect(form.getByText("Choose at least one class or certification.")).toBeVisible();

      await expect(form.getByLabel("Dental Assisting Program")).toBeVisible();
      await expect(form.getByLabel("BLS / CPR")).toBeVisible();

      await gotoSettled(page, "/infection-control");
      await expect(page.locator('form[data-rda-signup-form="true"]').first()).toBeVisible();

      await gotoSettled(page, "/contact");
      await expect(page.locator('form[data-rda-signup-form="true"]').first()).toBeVisible();
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
      await expect(page.getByText("Located in Woodcreek Plaza")).toBeVisible();
      await expect(page.getByText("Monday").first()).toBeVisible();
      await expect(page.getByText("9AM-5PM").first()).toBeVisible();
      await expect(page.getByText("Wednesday").first()).toBeVisible();
      await expect(page.getByText("8AM-5PM").first()).toBeVisible();
      await expect(page.getByText("Friday").first()).toBeVisible();
      await expect(page.getByText("9AM-3PM").first()).toBeVisible();
      await expect(page.getByText("Saturday").first()).toBeVisible();
      await expect(page.getByText("Closed").first()).toBeVisible();

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
