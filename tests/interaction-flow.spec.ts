import { expect, test } from "@playwright/test";

import { adLandingPages } from "@/lib/ad-landing-pages";
import { activeSitePromo } from "@/lib/site-promo";
import {
  blockElevenLabsWidgetScript,
  elevenLabsScriptSrc,
  localOrigin,
  suppressSitePromo,
} from "./support/qa-helpers";

async function gotoSettled(
  page: import("@playwright/test").Page,
  path: string,
  options?: { allowPromo?: boolean },
) {
  if (!options?.allowPromo) {
    await suppressSitePromo(page.context());
  }

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
              this.dismissed = false;
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
              const minimizedMarkup = [
                '<div class="mock-elevenlabs-overlay">',
                '<button class="mock-elevenlabs-open" aria-label="Open chat"></button>',
                "</div>",
              ].join("");
              const collapsedMarkup = [
                '<div class="mock-elevenlabs-overlay">',
                '<div class="mock-elevenlabs-card">',
                '<div class="mock-elevenlabs-row">Need help?</div>',
                '<button aria-label="Start a call" class="mock-elevenlabs-row">Start a call</button>',
                '<button aria-label="Dismiss" class="mock-elevenlabs-dismiss">Dismiss</button>',
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
                ".mock-elevenlabs-open {",
                "background: radial-gradient(circle at 35% 35%, #8EC5E8, #2472A9 62%, #16344F);",
                "border: 0;",
                "border-radius: 999px;",
                "box-shadow: 0 14px 28px rgba(0, 0, 0, .18);",
                "height: 48px;",
                "width: 48px;",
                "}",
                ".mock-elevenlabs-row {",
                "align-items: center;",
                "box-sizing: border-box;",
                "display: flex;",
                "height: 44px;",
                "padding: 0 12px;",
                "}",
                "button.mock-elevenlabs-row { border: 0; width: 100%; }",
                ".mock-elevenlabs-dismiss { height: 36px; margin-left: auto; width: 44px; }",
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
                this.expanded ? expandedMarkup : this.dismissed ? minimizedMarkup : collapsedMarkup,
              ].join("");

              this.shadowRoot.querySelector('[aria-label="Open chat"]')?.addEventListener("click", (event) => {
                event.preventDefault();
                this.dismissed = false;
                this.render();
              });
              this.shadowRoot.querySelector('[aria-label="Dismiss"]')?.addEventListener("click", (event) => {
                event.preventDefault();
                this.dismissed = true;
                this.expanded = false;
                this.render();
              });
              this.shadowRoot.querySelector('[aria-label="Start a call"]')?.addEventListener("click", (event) => {
                event.preventDefault();
                this.dismissed = false;
                this.expanded = true;
                this.render();
              });
              this.shadowRoot.querySelector('[aria-label="Collapse"]')?.addEventListener("click", (event) => {
                event.preventDefault();
                this.expanded = false;
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

    expect(widgetBounds.width).toBeLessThanOrEqual(370);
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
    await expect(
      page.locator('[data-elevenlabs-widget-slot][data-elevenlabs-mobile-minimized="true"]'),
    ).toBeVisible();

    const mobileDefaultFit = await page.evaluate(() => {
      const slot = document.querySelector<HTMLElement>("[data-elevenlabs-widget-slot]");
      const widget = document.querySelector<HTMLElement>("elevenlabs-convai");
      const openButton =
        widget?.shadowRoot?.querySelector<HTMLElement>('[aria-label="Open chat"]');
      const startButton =
        widget?.shadowRoot?.querySelector<HTMLElement>('[aria-label="Start a call"]');
      const slotRect = slot?.getBoundingClientRect();
      const openRect = openButton?.getBoundingClientRect();

      return {
        openButtonHeight: Math.round(openRect?.height ?? 0),
        openButtonInViewport:
          Boolean(openRect) &&
          openRect!.bottom <= window.innerHeight &&
          openRect!.right <= window.innerWidth,
        slotHeight: Math.round(slotRect?.height ?? 0),
        slotWidth: Math.round(slotRect?.width ?? 0),
        startButtonVisible: Boolean(startButton && startButton.getBoundingClientRect().width > 1),
      };
    });

    expect(mobileDefaultFit.slotWidth).toBeLessThanOrEqual(72);
    expect(mobileDefaultFit.slotHeight).toBeLessThanOrEqual(72);
    expect(mobileDefaultFit.openButtonHeight).toBe(48);
    expect(mobileDefaultFit.openButtonInViewport).toBeTruthy();
    expect(mobileDefaultFit.startButtonVisible).toBe(false);

    await page.locator('elevenlabs-convai button[aria-label="Open chat"]').click();
    await expect(
      page.locator('[data-elevenlabs-widget-slot][data-elevenlabs-mobile-minimized="false"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-elevenlabs-widget-slot][data-elevenlabs-open="true"]'),
    ).toBeVisible();
    // Allow the slot width transition (180ms) to finish before measuring.
    await page.waitForTimeout(250);
    await expect
      .poll(async () => {
        return page.locator("[data-elevenlabs-widget-slot]").evaluate((el) => {
          return Math.round(el.getBoundingClientRect().width);
        });
      })
      .toBeGreaterThanOrEqual(250);

    // Open control bar must get a wide slot — never stay orb-sized (the mobile
    // regression that crushed the horizontal pill on compact routes).
    const mobileOpenBarFit = await page.evaluate(() => {
      const slot = document.querySelector<HTMLElement>("[data-elevenlabs-widget-slot]");
      const widget = document.querySelector<HTMLElement>("elevenlabs-convai");
      const startButton =
        widget?.shadowRoot?.querySelector<HTMLElement>('[aria-label="Start a call"]');
      const dismissButton =
        widget?.shadowRoot?.querySelector<HTMLElement>('[aria-label="Dismiss"]');
      const slotRect = slot?.getBoundingClientRect();
      const startRect = startButton?.getBoundingClientRect();
      const dismissRect = dismissButton?.getBoundingClientRect();

      return {
        dismissInViewport:
          Boolean(dismissRect) &&
          dismissRect!.bottom <= window.innerHeight &&
          dismissRect!.right <= window.innerWidth &&
          dismissRect!.left >= 0,
        slotHeight: Math.round(slotRect?.height ?? 0),
        slotWidth: Math.round(slotRect?.width ?? 0),
        startInViewport:
          Boolean(startRect) &&
          startRect!.bottom <= window.innerHeight &&
          startRect!.right <= window.innerWidth &&
          startRect!.left >= 0,
        startVisible: Boolean(startButton && (startRect?.width ?? 0) > 1),
      };
    });

    // Wide enough for the control pill, but leaves left gutter for WhatsApp FAB.
    expect(mobileOpenBarFit.slotWidth).toBeGreaterThanOrEqual(250);
    expect(mobileOpenBarFit.slotWidth).toBeLessThanOrEqual(310);
    expect(mobileOpenBarFit.slotHeight).toBeGreaterThanOrEqual(100);
    expect(mobileOpenBarFit.startVisible).toBe(true);
    expect(mobileOpenBarFit.startInViewport).toBeTruthy();
    expect(mobileOpenBarFit.dismissInViewport).toBeTruthy();

    await page.locator('elevenlabs-convai button[aria-label="Start a call"]').click();
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

      return {
        collapseInViewport:
          Boolean(collapseRect) &&
          collapseRect!.bottom <= window.innerHeight &&
          collapseRect!.right <= window.innerWidth,
        cookiePresent: Boolean(cookieBanner),
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
    expect(mobileExpandedFit.cookiePresent).toBe(false);
  });

  test.describe("without third-party widget noise", () => {
    test.beforeEach(async ({ context }) => {
      await blockElevenLabsWidgetScript(context);
      await suppressSitePromo(context);
    });

    test("desktop More menu opens and navigates to More Information pages", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      await page.getByRole("button", { name: /^more information$/i }).click();

      const menu = page.locator('[data-rda-more-menu][data-open="true"]');
      await expect(menu).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "Career Journey" })).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "Meet the Instructors" })).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "FAQs" })).toBeVisible();
      await expect(menu.getByRole("menuitem", { name: "Photos" })).toBeVisible();

      await menu.getByRole("menuitem", { name: "FAQs" }).click();
      await page.waitForURL("**/faqs-1", { timeout: 12_000 });
      await expect(
        page.locator("main").getByText("Dental Assisting Program FAQs", { exact: true }),
      ).toBeVisible();
    });

    test("career journey page guides students through the DA to RDA roadmap", async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/journey");

      const journey = page.locator('[data-rda-journey-page="true"]');
      await expect(
        journey.getByRole("heading", { name: "DA to RDA Career Journey" }),
      ).toBeVisible();
      await expect(
        journey.getByRole("link", { name: /Start with the 9-week program/ }),
      ).toHaveAttribute("href", "/dental-assisting-program");
      await expect(page.locator("footer").getByRole("link", { name: "Career Journey" })).toHaveAttribute(
        "href",
        "/journey",
      );
      await expect(page.locator("footer")).toContainText(
        "All Roseville Dental Academy courses are nonrefundable.",
      );

      const alreadyWorking = journey.getByRole("button", { name: /Already working/ });
      await alreadyWorking.click();
      await expect(alreadyWorking).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator('[data-rda-journey-next-action="true"]')).toContainText(
        "Confirm your work-experience documentation",
      );

      await journey.getByRole("button", { name: /Apply and Pass Exam/ }).click();
      await expect(page.locator('[data-rda-journey-active-step="true"]')).toContainText(
        "After the Dental Board processes a complete application",
      );

      await expect(
        journey.getByRole("link", {
          name: "Open official source: Dental Board RDA applicants",
        }),
      ).toHaveAttribute(
        "href",
        "https://www.dbc.ca.gov/applicants/become_licensed_rda.shtml",
      );

      const sitemapResponse = await request.get(`${localOrigin}/sitemap.website.xml`);
      expect(await sitemapResponse.text()).toContain("/journey");

      const desktopOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(desktopOverflow).toBe(0);

      await page.setViewportSize({ height: 844, width: 390 });
      await gotoSettled(page, "/journey");
      await expect(journey.getByRole("button", { name: /Ready for RDA steps/ })).toBeVisible();
      await expect(journey.getByRole("button", { name: /Complete RDA Courses/ })).toBeVisible();
      const mobileOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(mobileOverflow).toBe(0);
    });

    test("cookie banner is not rendered", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      await expect(
        page.locator('#trustedsite-tm-image, [title="TrustedSite Certified"]'),
      ).toHaveCount(0);

      await expect(page.locator('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]')).toHaveCount(0);
      await expect(page.locator('[data-aid="FOOTER_COOKIE_CLOSE_RENDERED"]')).toHaveCount(0);
      await expect(page.getByText("This website uses cookies.")).toHaveCount(0);

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]')).toHaveCount(0);
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
      await expect(hero).toHaveClass(/is-interactive/);

      const heroControls = hero.locator("[data-rda-home-hero-control]");
      const heroPrevious = hero.locator("[data-rda-home-hero-previous]");
      const heroNext = hero.locator("[data-rda-home-hero-next]");

      await expect(heroControls).toHaveCount(3);
      await expect(heroPrevious).toBeVisible();
      await expect(heroNext).toBeVisible();
      await expect(heroPrevious).toBeEnabled();
      await expect(heroNext).toBeEnabled();
      await expect(heroControls.nth(0)).toBeEnabled();
      await expect(hero).toHaveAttribute("data-rda-active-slide", "1");
      await expect(heroControls.nth(0)).toHaveAttribute("aria-current", "true");

      const heroControlDesign = await hero.evaluate((element) => {
        const arrow = element.querySelector<HTMLElement>("[data-rda-home-hero-next]");
        const dot = element.querySelector<HTMLElement>("[data-rda-home-hero-control]");
        const arrowRect = arrow?.getBoundingClientRect();
        const dotRect = dot?.getBoundingClientRect();

        return {
          arrowBorderRadius: arrow ? getComputedStyle(arrow).borderRadius : "",
          arrowHeight: arrowRect ? Math.round(arrowRect.height) : 0,
          arrowWidth: arrowRect ? Math.round(arrowRect.width) : 0,
          dotHeight: dotRect ? Math.round(dotRect.height) : 0,
          dotPointerEvents: dot ? getComputedStyle(dot).pointerEvents : "",
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
        };
      });

      expect(heroControlDesign).toMatchObject({
        arrowBorderRadius: "8px",
        arrowHeight: 44,
        arrowWidth: 44,
        dotHeight: 5,
        dotPointerEvents: "auto",
        overflowX: 0,
      });

      await heroControls.nth(1).click();
      await expect(hero).toHaveAttribute("data-rda-active-slide", "2");
      await expect(hero.locator('[data-rda-home-hero-slide="2"]')).toHaveAttribute(
        "aria-hidden",
        "false",
      );
      await expect(heroControls.nth(1)).toHaveAttribute("aria-current", "true");
      await heroNext.click();
      await expect(hero).toHaveAttribute("data-rda-active-slide", "3");
      await heroPrevious.click();
      await expect(hero).toHaveAttribute("data-rda-active-slide", "2");
      await expect(cta).toBeVisible();
      await expect(cta).toHaveText("Ask About Classes");
      await expect(cta).toHaveAttribute("href", "#quick-sign-up");
      await expect(signup).toBeVisible();

      const signupDesign = await signup.evaluate((element) => {
        const form = element.querySelector<HTMLElement>("[data-rda-signup-form='true']");
        const options = element.querySelector<HTMLElement>(".rda-interest-options");
        const option = element.querySelector<HTMLElement>(".rda-interest-option");
        const input = element.querySelector<HTMLElement>(".rda-signup-fields input");
        const button = element.querySelector<HTMLElement>("button[type='submit']");
        const headingIcon = element.querySelector<HTMLElement>(".rda-signup-heading-icon");
        const columnCount = (value: string | undefined) =>
          value ? value.split(" ").filter(Boolean).length : 0;

        return {
          buttonRadius: button ? getComputedStyle(button).borderRadius : "",
          fieldIconCount: element.querySelectorAll(
            '[data-rda-signup-icon="name"], [data-rda-signup-icon="email"], [data-rda-signup-icon="phone"], [data-rda-signup-icon="notes"], [data-rda-signup-icon="note"], [data-rda-signup-icon="submit"]',
          ).length,
          formColumnCount: form ? columnCount(getComputedStyle(form).gridTemplateColumns) : 0,
          formRadius: form ? getComputedStyle(form).borderRadius : "",
          headingIconVisible: headingIcon ? getComputedStyle(headingIcon).display !== "none" : false,
          inputRadius: input ? getComputedStyle(input).borderRadius : "",
          optionColumnCount: options ? columnCount(getComputedStyle(options).gridTemplateColumns) : 0,
          optionIconCount: element.querySelectorAll(".rda-interest-option-icon[data-rda-signup-icon]").length,
          optionRadius: option ? getComputedStyle(option).borderRadius : "",
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
        };
      });

      expect(signupDesign).toMatchObject({
        buttonRadius: "6px",
        fieldIconCount: 6,
        formColumnCount: 2,
        formRadius: "8px",
        headingIconVisible: true,
        inputRadius: "6px",
        optionColumnCount: 2,
        optionIconCount: 8,
        optionRadius: "8px",
        overflowX: 0,
      });

      const reviewCard = page.locator(".rda-review-photo-grid-desktop .rda-review-photo-card").first();
      const reviewCardBefore = await reviewCard.evaluate((element) => {
        const image = element.querySelector<HTMLElement>(".rda-review-photo-media img");

        return {
          borderColor: getComputedStyle(element).borderColor,
          boxShadow: getComputedStyle(element).boxShadow,
          imageTransform: image ? getComputedStyle(image).transform : "",
          transform: getComputedStyle(element).transform,
        };
      });

      await expect(page.getByRole("heading", { name: "What Students Are Saying" })).toBeVisible();
      await expect(page.locator(".rda-review-photo-grid-desktop .rda-review-photo-card")).toHaveCount(6);
      await reviewCard.hover({ force: true });
      await page.waitForTimeout(100);
      const reviewCardHover = await reviewCard.evaluate((element) => {
        const image = element.querySelector<HTMLElement>(".rda-review-photo-media img");

        return {
          borderColor: getComputedStyle(element).borderColor,
          boxShadow: getComputedStyle(element).boxShadow,
          imageTransform: image ? getComputedStyle(image).transform : "",
          transform: getComputedStyle(element).transform,
        };
      });

      const changedReviewHoverStyles = [
        reviewCardHover.borderColor !== reviewCardBefore.borderColor,
        reviewCardHover.boxShadow !== reviewCardBefore.boxShadow,
        reviewCardHover.imageTransform !== reviewCardBefore.imageTransform,
        reviewCardHover.transform !== reviewCardBefore.transform,
      ].filter(Boolean);

      expect(changedReviewHoverStyles.length).toBeGreaterThanOrEqual(2);

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

    test("homepage quick sign up stays mounted after client navigation", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const signup = page.locator("#quick-sign-up[data-rda-signup-section='true']");

      await expect(signup).toHaveCount(1);
      await expect(signup).toBeVisible();

      await page.getByRole("link", { name: "BLS/CPR" }).first().click();
      await expect(page).toHaveURL(/\/(?:bls%2Fcpr-1|bls-cpr-1)$/);
      await expect(page.locator("[data-rda-homepage-signup-slot='true']")).toHaveCount(0);

      await page.getByRole("link", { name: "Roseville Dental Academy" }).first().click();
      await expect(page).toHaveURL(`${localOrigin}/`);
      await expect(page.locator("[data-rda-homepage-signup-slot='true']")).toHaveCount(1);
      await expect(signup).toHaveCount(1);
      await expect(signup).toBeVisible();
      await expect(
        page.locator(
          "[data-rda-homepage-signup-slot='true'] > #quick-sign-up[data-rda-signup-section='true']",
        ),
      ).toHaveCount(1);

      await page.locator("[data-rda-home-hero-signup='true']").click();
      await expect(page).toHaveURL(/#quick-sign-up$/);
      await expect
        .poll(() => signup.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
        .toBeLessThan(80);
    });

    test("homepage course sections use React cards while preserving course copy and links", async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const legacyWidgetIds = [
        "f11e5afa-6606-44e2-847f-fe03d31d5b23",
        "2009b5dd-c84c-4596-9a42-e54428494e26",
        "4dc12e4b-c2cf-4fef-aa22-43ee15d1afc8",
        "266dc504-a138-4f78-9cc8-779377f6b972",
        "0c353bbb-1b60-4fa3-aed9-de2e739a4807",
        "db5c88e6-f24c-47cf-a362-5819da7f2ba5",
      ];

      for (const id of legacyWidgetIds) {
        await expect(page.locator(`[id="${id}"]`)).toHaveCount(0);
      }

      const reviews = page.locator('[data-rda-home-review-highlights="true"]');
      const tiktokFollow = page.locator('[data-rda-stable-widget="tiktok-follow"]');
      const courseSystem = page.locator('[data-rda-home-course-system="true"]');
      const board = page.locator('[data-rda-stable-widget="board"]');
      const gallery = page.locator('[data-rda-stable-widget="gallery"][data-rda-gallery-mode="home"]');
      const contact = page.locator(".rda-contact-section");

      await expect(reviews).toBeVisible();
      await expect(tiktokFollow).toBeVisible();
      await expect(courseSystem).toBeVisible();
      await expect(board).toBeVisible();
      await expect(gallery).toBeVisible();
      await expect(contact).toBeVisible();

      const pageOrder = await page.evaluate(() => {
        const before = (left: Element | null, right: Element | null) =>
          Boolean(
            left &&
              right &&
              (left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
          );

        const reviewsNode = document.querySelector('[data-rda-home-review-highlights="true"]');
        const tiktokNode = document.querySelector('[data-rda-stable-widget="tiktok-follow"]');
        const courseNode = document.querySelector('[data-rda-home-course-system="true"]');
        const boardNode = document.querySelector('[data-rda-stable-widget="board"]');
        const galleryNode = document.querySelector(
          '[data-rda-stable-widget="gallery"][data-rda-gallery-mode="home"]',
        );
        const contactNode = document.querySelector(".rda-contact-section");

        return {
          boardBeforeGallery: before(boardNode, galleryNode),
          courseBeforeBoard: before(courseNode, boardNode),
          galleryBeforeContact: before(galleryNode, contactNode),
          reviewsBeforeTiktok: before(reviewsNode, tiktokNode),
          tiktokBeforeCourse: before(tiktokNode, courseNode),
        };
      });

      expect(pageOrder).toEqual({
        boardBeforeGallery: true,
        courseBeforeBoard: true,
        galleryBeforeContact: true,
        reviewsBeforeTiktok: true,
        tiktokBeforeCourse: true,
      });

      await expect(tiktokFollow.getByText("Follow along on TikTok", { exact: true })).toBeVisible();
      await expect(
        tiktokFollow.getByRole("heading", { name: "Help us reach 1,000 followers." }),
      ).toBeVisible();
      const tiktokButton = tiktokFollow.getByRole("link", { name: "Follow on TikTok" });
      await expect(tiktokButton).toHaveAttribute(
        "href",
        "https://www.tiktok.com/@rosevilledentalacademy?_r=1&_t=ZP-96u9ZhtrfJu",
      );
      await expect(tiktokButton).toHaveAttribute("target", "_blank");
      await expect(tiktokButton).toHaveAttribute("rel", "noreferrer");
      await expect(tiktokFollow.locator("video")).toHaveAttribute("autoplay", "");
      await expect(tiktokFollow.locator("video")).toHaveAttribute("loop", "");
      await expect(tiktokFollow.locator("video")).toHaveAttribute("muted", "");
      await expect(tiktokFollow.locator("video")).toHaveAttribute("playsinline", "");
      await expect(tiktokFollow.locator("video")).toHaveJSProperty("muted", true);
      await expect(tiktokFollow.locator("video source")).toHaveAttribute(
        "src",
        "/assets/social/tiktok/homepage-follow-1000.mp4",
      );
      await expect(
        tiktokFollow.locator('img[src^="/assets/brand/tiktok-dark.svg"]'),
      ).toHaveCount(1);
      await expect(
        tiktokButton.locator('img[src^="/assets/brand/tiktok-light.svg"]'),
      ).toHaveCount(1);

      const desktopTiktokDesign = await tiktokFollow.evaluate((element) => {
        const inner = element.querySelector<HTMLElement>(".rda-tiktok-follow-inner");
        const video = element.querySelector<HTMLVideoElement>("video");
        const button = element.querySelector<HTMLElement>('[data-rda-social-button="tiktok"]');
        const sectionRect = element.getBoundingClientRect();
        const videoRect = video?.getBoundingClientRect();
        const buttonRect = button?.getBoundingClientRect();
        const columnCount = (value: string | undefined) =>
          value ? value.split(" ").filter(Boolean).length : 0;

        return {
          buttonFitsSection: buttonRect
            ? buttonRect.left >= sectionRect.left && buttonRect.right <= sectionRect.right
            : false,
          columns: inner ? columnCount(getComputedStyle(inner).gridTemplateColumns) : 0,
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
          videoHeight: Math.round(videoRect?.height ?? 0),
          videoWidth: Math.round(videoRect?.width ?? 0),
        };
      });

      expect(desktopTiktokDesign).toMatchObject({
        buttonFitsSection: true,
        columns: 2,
        overflowX: 0,
      });
      expect(desktopTiktokDesign.videoHeight).toBeGreaterThan(desktopTiktokDesign.videoWidth);

      await expect(courseSystem.getByText("Now offering blended learning BLS", { exact: true })).toBeVisible();
      await expect(courseSystem.getByText("HEARTCODE BLS $85", { exact: true })).toBeVisible();
      await expect(
        courseSystem.getByRole("link", { name: "Link for online portion" }),
      ).toHaveAttribute("href", "https://shopcpr.heart.org/heartcode-bls");
      await expect(courseSystem.getByText("OFFERED COURSES", { exact: true })).toHaveCount(2);
      await expect(courseSystem.getByText("2026 Class Schedule", { exact: true })).toBeVisible();
      await expect(
        courseSystem.getByText("Dates are penciled in and may change; admissions will confirm current availability.", { exact: true }),
      ).toBeVisible();
      await expect(courseSystem.getByText("June 19", { exact: true })).toBeVisible();
      await expect(
        courseSystem.getByLabel("Dental Assisting Training is full on June 19"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("X-rays / Radiation Safety is full on July 18"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("Infection Control is full on July 18"),
      ).toBeVisible();
      await expect(courseSystem.getByLabel("BLS / CPR is full on July 18")).toBeVisible();
      await expect(
        courseSystem.getByLabel("Pit and Fissure Sealants is full on August 8"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("Dental Assisting Training is full on September 4"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("X-rays / Radiation Safety is full on September 5"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("BLS / CPR is full on September 5"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("Infection Control is full on September 5"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("Pit and Fissure Sealants is full on September 12"),
      ).toBeVisible();
      await expect(
        courseSystem.getByLabel("Coronal Polish is full on September 12"),
      ).toBeVisible();
      await expect(courseSystem.getByText("October 12", { exact: true })).toBeVisible();
      await expect(courseSystem.getByText("October 17", { exact: true })).toBeVisible();
      await expect(courseSystem.getByText("October 24", { exact: true })).toBeVisible();
      await expect(courseSystem.getByText("Stand Alone Courses", { exact: true })).toHaveCount(1);
      await expect(courseSystem.getByText("Click on photo to learn more", { exact: true })).toHaveCount(1);
      await expect(
        courseSystem.getByRole("link", { name: "BLS Certification Course - Initial or Renewal" }),
      ).toHaveAttribute("href", "/bls-cpr-1");
      await expect(
        courseSystem.getByRole("link", { name: "8-Hour Infection Control Course" }),
      ).toHaveAttribute("href", "/infection-control");
      await expect(
        courseSystem.getByRole("link", { name: "Radiation Safety Course" }),
      ).toHaveAttribute("href", "/radiation-safety");
      await expect(
        courseSystem.getByRole("link", { name: "Coronal Polish Course" }),
      ).toHaveAttribute("href", "/coronal-polish");
      await expect(
        courseSystem.getByRole("link", { name: "Pit and Fissure Sealant Course" }),
      ).toHaveAttribute("href", "/sealants");
      await expect(courseSystem.getByText("Dental Assisting Training Course - $2,500.00")).toBeVisible();
      await expect(
        courseSystem.getByText(
          "Choose one class schedule — Monday, Friday, or Saturday. Those options are separate; you attend one schedule, not all three, plus one assigned externship day.",
        ),
      ).toBeVisible();
      await expect(
        courseSystem.getByText("September 12, 2026 (Saturday Academy). Additional starts are October 12, 2026 and November 20, 2026."),
      ).toBeVisible();
      await expect(courseSystem.getByRole("link", { name: "Learn more" })).toHaveAttribute(
        "href",
        "/dental-assisting-program",
      );
      await expect(courseSystem.getByRole("link", { name: "Book Appointment Here" })).toHaveCount(2);
      await expect(courseSystem.getByText("COURSES FOR HYGIENIST", { exact: true })).toBeVisible();
      await expect(courseSystem.getByText("ERGONOMICS AND PATIENT CARE", { exact: true })).toBeVisible();
      await expect(courseSystem.getByText("WHY DENTAL ASSISTING?", { exact: true })).toBeVisible();

      const desktopCourseDesign = await courseSystem.evaluate((element) => {
        const columnCount = (selector: string) => {
          const node = element.querySelector<HTMLElement>(selector);
          const columns = node ? getComputedStyle(node).gridTemplateColumns : "";

          return columns.split(" ").filter(Boolean).length;
        };

        return {
          blsColumns: columnCount(".rda-home-bls-feature"),
          boardIconCount: document.querySelectorAll(
            ".rda-board-grid-desktop [data-rda-board-icon]",
          ).length,
          courseCardCount: element.querySelectorAll('[data-rda-home-course-card="standalone"]').length,
          courseCardIconCount: element.querySelectorAll('[data-rda-home-course-icon="course-card"]').length,
          hygienistIconCount: element.querySelectorAll('[data-rda-home-course-icon="hygienist"]').length,
          offeredColumns: columnCount(".rda-home-offered-grid"),
          offeredIconCount: element.querySelectorAll('[data-rda-home-course-icon="offered"]').length,
          supportIconCount: element.querySelectorAll('[data-rda-home-course-icon="support"]').length,
          firstStandaloneColumns: columnCount(".rda-home-course-group:first-child .rda-home-standalone-grid"),
          whyColumns: columnCount(".rda-home-why-grid"),
          whyIconCount: element.querySelectorAll('[data-rda-home-course-icon="why"]').length,
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
        };
      });

      expect(desktopCourseDesign).toMatchObject({
        blsColumns: 2,
        boardIconCount: 3,
        courseCardCount: 5,
        courseCardIconCount: 5,
        firstStandaloneColumns: 3,
        hygienistIconCount: 1,
        offeredColumns: 3,
        offeredIconCount: 3,
        supportIconCount: 3,
        whyColumns: 4,
        whyIconCount: 4,
        overflowX: 0,
      });

      const courseCard = courseSystem.locator('[data-rda-home-course-card="standalone"]').first();
      const readCourseCardStyle = () =>
        courseCard.evaluate((element) => {
          const image = element.querySelector<HTMLElement>(".rda-home-course-card-media img");

          return {
            borderColor: getComputedStyle(element).borderColor,
            boxShadow: getComputedStyle(element).boxShadow,
            height: Math.round((element as HTMLElement).offsetHeight),
            imageTransform: image ? getComputedStyle(image).transform : "",
            transform: getComputedStyle(element).transform,
            width: Math.round((element as HTMLElement).offsetWidth),
          };
        });

      const courseCardBefore = await readCourseCardStyle();

      await courseCard.hover();

      await expect
        .poll(async () => {
          const style = await readCourseCardStyle();

          return {
            borderColor: style.borderColor !== courseCardBefore.borderColor,
            boxShadow: style.boxShadow !== courseCardBefore.boxShadow,
            imageTransform: style.imageTransform !== courseCardBefore.imageTransform,
            transform: style.transform !== courseCardBefore.transform,
          };
        })
        .toEqual({
          borderColor: true,
          boxShadow: true,
          imageTransform: true,
          transform: true,
        });

      const courseCardHover = await readCourseCardStyle();

      expect(courseCardHover.borderColor).not.toBe(courseCardBefore.borderColor);
      expect(courseCardHover.boxShadow).not.toBe(courseCardBefore.boxShadow);
      expect(courseCardHover.imageTransform).not.toBe(courseCardBefore.imageTransform);
      expect(courseCardHover.transform).not.toBe(courseCardBefore.transform);
      expect(courseCardHover.height).toBe(courseCardBefore.height);
      expect(courseCardHover.width).toBe(courseCardBefore.width);

      await courseCard.getByRole("link", { name: "BLS Certification Course - Initial or Renewal" }).focus();
      await expect
        .poll(async () => {
          const style = await readCourseCardStyle();

          return {
            borderColor: style.borderColor !== courseCardBefore.borderColor,
            boxShadow: style.boxShadow !== courseCardBefore.boxShadow,
          };
        })
        .toEqual({
          borderColor: true,
          boxShadow: true,
        });
    });

    test("mobile homepage prioritizes signup and avoids overlay collisions", async ({ page }) => {
      await page.setViewportSize({ height: 844, width: 390 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoSettled(page, "/");

      const headerHeight = await page.locator(".rda-live-header").evaluate((element) => {
        return Math.round(element.getBoundingClientRect().height);
      });
      expect(headerHeight).toBeLessThan(260);

      const heroCta = page.locator('[data-rda-home-hero-signup="true"]');
      const mobileHero = page.locator('[data-rda-home-hero="true"]');
      const mobileHeroNext = page.locator("[data-rda-home-hero-next]");
      const cookie = page.locator('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]');
      const widget = page.locator("[data-elevenlabs-widget-slot]");
      const widgetElement = page.locator("elevenlabs-convai");

      await expect(heroCta).toBeVisible();
      await expect(mobileHero).toHaveClass(/is-interactive/);
      await expect(mobileHeroNext).toBeVisible();
      await expect(mobileHeroNext).toBeEnabled();
      await mobileHeroNext.click();
      await expect(mobileHero).toHaveAttribute("data-rda-active-slide", "2");
      await expect(cookie).toHaveCount(0);
      await expect(widget).toBeVisible();
      await expect(widget).toHaveCSS("pointer-events", "none");
      await expect(widgetElement).toHaveCSS("pointer-events", "auto");

      const overlap = await page.evaluate(() => {
        const cta = document.querySelector<HTMLElement>("[data-rda-home-hero-signup='true']");
        const widget = document.querySelector<HTMLElement>("[data-elevenlabs-widget-slot]");
        const ctaRect = cta?.getBoundingClientRect();
        const widgetRect = widget?.getBoundingClientRect();

        return Boolean(
          ctaRect &&
            widgetRect &&
            ctaRect.left < widgetRect.right &&
            ctaRect.right > widgetRect.left &&
            ctaRect.top < widgetRect.bottom &&
            ctaRect.bottom > widgetRect.top,
        );
      });
      expect(overlap).toBe(false);

      await heroCta.click();
      await expect(page).toHaveURL(/#quick-sign-up$/);
      const signupTop = await page.locator("#quick-sign-up").evaluate((element) => {
        return Math.round(element.getBoundingClientRect().top);
      });
      expect(signupTop).toBeGreaterThanOrEqual(0);
      expect(signupTop).toBeLessThan(80);

      const mobileSignupDesign = await page.locator("#quick-sign-up").evaluate((element) => {
        const form = element.querySelector<HTMLElement>("[data-rda-signup-form='true']");
        const options = element.querySelector<HTMLElement>(".rda-interest-options");
        const option = element.querySelector<HTMLElement>(".rda-interest-option");
        const formRect = form?.getBoundingClientRect();
        const optionRect = option?.getBoundingClientRect();
        const columnCount = (value: string | undefined) =>
          value ? value.split(" ").filter(Boolean).length : 0;

        return {
          formColumnCount: form ? columnCount(getComputedStyle(form).gridTemplateColumns) : 0,
          formWidth: formRect ? Math.round(formRect.width) : 0,
          optionColumnCount: options ? columnCount(getComputedStyle(options).gridTemplateColumns) : 0,
          optionWidth: optionRect ? Math.round(optionRect.width) : 0,
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
        };
      });

      expect(mobileSignupDesign.formColumnCount).toBe(1);
      expect(mobileSignupDesign.optionColumnCount).toBe(1);
      expect(mobileSignupDesign.optionWidth).toBeLessThanOrEqual(mobileSignupDesign.formWidth);
      expect(mobileSignupDesign.overflowX).toBe(0);

      const mobileTiktok = page.locator('[data-rda-stable-widget="tiktok-follow"]');
      await expect(mobileTiktok).toBeVisible();
      const mobileTiktokDesign = await mobileTiktok.evaluate((element) => {
        const inner = element.querySelector<HTMLElement>(".rda-tiktok-follow-inner");
        const button = element.querySelector<HTMLElement>('[data-rda-social-button="tiktok"]');
        const video = element.querySelector<HTMLElement>("video");
        const sectionRect = element.getBoundingClientRect();
        const buttonRect = button?.getBoundingClientRect();
        const videoRect = video?.getBoundingClientRect();
        const columnCount = (value: string | undefined) =>
          value ? value.split(" ").filter(Boolean).length : 0;

        return {
          buttonFitsSection: buttonRect
            ? buttonRect.left >= sectionRect.left && buttonRect.right <= sectionRect.right
            : false,
          columns: inner ? columnCount(getComputedStyle(inner).gridTemplateColumns) : 0,
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
          videoFitsSection: videoRect
            ? videoRect.left >= sectionRect.left && videoRect.right <= sectionRect.right
            : false,
        };
      });

      expect(mobileTiktokDesign).toMatchObject({
        buttonFitsSection: true,
        columns: 1,
        overflowX: 0,
        videoFitsSection: true,
      });

      const mobileCourseDesign = await page.locator('[data-rda-home-course-system="true"]').evaluate((element) => {
        const columnCount = (selector: string) => {
          const node = element.querySelector<HTMLElement>(selector);
          const columns = node ? getComputedStyle(node).gridTemplateColumns : "";

          return columns.split(" ").filter(Boolean).length;
        };

        const button = element.querySelector<HTMLElement>(".rda-home-course-button");
        const sectionRect = element.getBoundingClientRect();
        const buttonRect = button?.getBoundingClientRect();

        return {
          blsColumns: columnCount(".rda-home-bls-feature"),
          buttonFitsSection: buttonRect
            ? buttonRect.left >= sectionRect.left && buttonRect.right <= sectionRect.right
            : false,
          firstStandaloneColumns: columnCount(".rda-home-course-group:first-child .rda-home-standalone-grid"),
          offeredColumns: columnCount(".rda-home-offered-grid"),
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
          whyColumns: columnCount(".rda-home-why-grid"),
        };
      });

      expect(mobileCourseDesign).toMatchObject({
        blsColumns: 1,
        buttonFitsSection: true,
        firstStandaloneColumns: 1,
        offeredColumns: 1,
        overflowX: 0,
        whyColumns: 1,
      });
    });

    test("mobile menu and long homepage sections use progressive disclosure", async ({ page }) => {
      await page.setViewportSize({ height: 844, width: 390 });
      await gotoSettled(page, "/");

      await page.getByRole("button", { name: "Hamburger Site Navigation Icon" }).click();
      const mobileMenu = page.locator('[data-rda-mobile-menu="true"]');
      await expect(mobileMenu.getByRole("link", { name: "Ask About Classes" })).toBeVisible();

      const socialBox = await mobileMenu.locator('[data-rda-social-button="instagram"]').evaluate(
        (element) => {
          const rect = element.getBoundingClientRect();
          return {
            height: Math.round(rect.height),
            width: Math.round(rect.width),
          };
        },
      );
      expect(socialBox.height).toBeGreaterThanOrEqual(44);
      expect(socialBox.width).toBeGreaterThanOrEqual(44);

      await page.getByRole("button", { name: "Close Site Navigation" }).click();

      await expect(page.locator(".rda-review-photo-grid-mobile .rda-review-photo-card")).toHaveCount(3);
      const reviewMore = page.locator(".rda-mobile-review-more");
      await expect(reviewMore.getByText("Show more reviews")).toBeVisible();
      await reviewMore.locator("summary").hover();
      const reviewMoreSummary = await reviewMore.locator("summary").evaluate((element) => {
        return {
          backgroundColor: getComputedStyle(element).backgroundColor,
          borderRadius: getComputedStyle(element).borderRadius,
        };
      });
      expect(reviewMoreSummary.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(reviewMoreSummary.borderRadius).toBe("6px");
      await reviewMore.locator("summary").click();
      await expect(reviewMore.locator(".rda-review-photo-card")).toHaveCount(3);

      const googleReviewLibrary = page.locator(".rda-google-review-library");
      await expect(googleReviewLibrary.getByText("Read all 77 Google reviews")).toBeVisible();
      await expect(googleReviewLibrary.locator(".rda-google-review-card")).toHaveCount(0);
      await googleReviewLibrary.locator("summary").click();
      await expect(googleReviewLibrary.getByRole("link", { name: "Open Google reviews" })).toHaveAttribute(
        "href",
        /maps\.google\.com/,
      );

      await expect(page.locator(".rda-board-accordion")).toBeVisible();
      await expect(page.locator(".rda-board-grid-desktop")).toBeHidden();
      await expect(page.locator(".rda-gallery-section-home .rda-gallery-item:visible")).toHaveCount(4);
    });

    test("GA4 and Vercel custom conversion events fire for key website actions", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const events = await page.evaluate(async () => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
          gtag?: (...args: unknown[]) => void;
          va?: (...args: unknown[]) => void;
        };

        analyticsWindow.__rdaTestGtagEvents = [];
        analyticsWindow.__rdaTestVercelEvents = [];
        analyticsWindow.gtag = (...args: unknown[]) => {
          analyticsWindow.__rdaTestGtagEvents?.push(args);
        };
        analyticsWindow.va = (...args: unknown[]) => {
          analyticsWindow.__rdaTestVercelEvents?.push(args);
        };
        const dispatchClick = (selector: string) => {
          document
            .querySelector<HTMLElement>(selector)
            ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        };
        const waitForReactUpdate = () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });

        dispatchClick("[data-rda-home-hero-signup='true']");
        dispatchClick("[data-rda-contact-us='true']");
        dispatchClick("[data-rda-social-button='instagram']");
        dispatchClick("a[href^='tel:']");
        dispatchClick("a[href^='mailto:']");
        dispatchClick("a[href*='google.com/maps']");
        dispatchClick("[data-rda-contact-form-toggle='true']");

        const signupForm = document.querySelector<HTMLFormElement>("[data-rda-signup-form='true']");
        const firstInterest = signupForm?.querySelector<HTMLElement>(
          "[role='checkbox']",
        );
        if (signupForm && firstInterest) {
          firstInterest.click();
          await waitForReactUpdate();
          signupForm.dispatchEvent(
            new CustomEvent("rda:lead-form-success", {
              bubbles: true,
              detail: { submissionId: "accepted-analytics-test" },
            }),
          );
          await waitForReactUpdate();
        }

        return {
          ga: analyticsWindow.__rdaTestGtagEvents ?? [],
          vercel: analyticsWindow.__rdaTestVercelEvents ?? [],
        };
      });

      const gaEvents = events.ga.filter(
        (event): event is ["event", string, Record<string, unknown>?] => event[0] === "event",
      );
      const gaEventNames = gaEvents.map((event) => event[1]);
      const leadEvent = gaEvents.find((event) => event[1] === "generate_lead")?.[2] ?? {};
      const selectContentEvent = gaEvents.find((event) => event[1] === "select_content")?.[2] ?? {};
      const vercelEventNames = events.vercel
        .filter((event): event is ["event", { name: string; data?: Record<string, unknown> }] => {
          return event[0] === "event" && typeof event[1] === "object" && event[1] !== null && "name" in event[1];
        })
        .map((event) => event[1].name);

      expect(gaEventNames).toEqual(
        expect.arrayContaining([
          "select_content",
          "social_click",
          "click_to_call",
          "email_click",
          "get_directions",
          "generate_lead",
          "cta_click",
          "contact_action",
          "lead_form_submit",
        ]),
      );
      expect(leadEvent).toMatchObject({
        form_id: "quick_sign_up",
        lead_source: "website_quick_sign_up",
        lead_type: "quick_sign_up",
        selected_count: 1,
      });
      expect(selectContentEvent).toEqual(
        expect.objectContaining({
          content_id: expect.any(String),
          content_type: expect.any(String),
        }),
      );
      expect(vercelEventNames).toEqual(
        expect.arrayContaining([
          "cta_click",
          "social_click",
          "contact_action",
          "lead_form_submit",
        ]),
      );
    });

    test("ad landing page attribution and safe Meta conversion events fire", async ({
      page,
    }) => {
      const landingPage =
        adLandingPages.find((candidate) => candidate.slug === "coronal-sealants-renewal") ??
        adLandingPages[0];
      const utmCampaign = "coronal_sealants_renewal";
      const utmId = "meta_campaign_123";
      let formspreeRequestBody = "";
      let attributionReceipt: Record<string, unknown> | null = null;

      await page.route("https://formspree.io/f/**", async (route) => {
        formspreeRequestBody = route.request().postData() ?? "";
        await route.fulfill({
          body: JSON.stringify({ ok: true }),
          contentType: "application/json",
          status: 200,
        });
      });
      await page.route("**/api/attribution/receipt-token", async (route) => {
        await route.fulfill({
          body: JSON.stringify({ token: "signed-test-receipt-token" }),
          contentType: "application/json",
          status: 201,
        });
      });
      await page.route("**/api/attribution/receipt", async (route) => {
        expect(route.request().headers()["x-rda-receipt-token"]).toBe("signed-test-receipt-token");
        attributionReceipt = JSON.parse(route.request().postData() ?? "null") as Record<
          string,
          unknown
        > | null;
        await route.fulfill({
          body: JSON.stringify({ error: "temporary_attribution_outage" }),
          contentType: "application/json",
          status: 503,
        });
      });

      await page.addInitScript(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
          fbq?: (...args: unknown[]) => void;
          gtag?: (...args: unknown[]) => void;
          va?: (...args: unknown[]) => void;
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

      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(
        page,
        `${landingPage.path}?utm_source=fb&utm_medium=paid&utm_campaign=${utmCampaign}&utm_id=${utmId}&utm_source_platform=meta_ads&utm_content=renewal_ready_test&fbclid=meta_click_123&fbc=meta_fbc_123&fbp=meta_fbp_123&ttclid=tiktok_click_456&ttp=tiktok_cookie_456&gclid=google_click_123&gbraid=google_braid_123&wbraid=google_web_braid_123&dclid=display_click_123&msclkid=microsoft_click_123&ScCid=snap_click_123&sc_click_id=snap_alt_click_123`,
      );

      const form = page.locator('form[data-rda-landing-form="true"]');
      await expect(form).toBeVisible();
      await expect(form.locator('input[name="landing_page"]')).toHaveValue(landingPage.slug);
      await expect(form.locator('input[name="campaign_intent"]')).toHaveValue(
        landingPage.campaignIntent,
      );
      await expect(form.locator('input[name="course_interest"]')).toHaveValue(
        landingPage.courseInterests.join(", "),
      );
      await expect(form.locator('input[name="utm_source"]')).toHaveValue("fb");
      await expect(form.locator('input[name="utm_medium"]')).toHaveValue("paid");
      await expect(form.locator('input[name="utm_campaign"]')).toHaveValue(
        utmCampaign,
      );
      await expect(form.locator('input[name="utm_id"]')).toHaveValue(utmId);
      await expect(form.locator('input[name="utm_source_platform"]')).toHaveValue("meta_ads");
      await expect(form.locator('input[name="utm_content"]')).toHaveValue("renewal_ready_test");
      await expect(form.locator('input[name="fbclid"]')).toHaveValue("meta_click_123");
      await expect(form.locator('input[name="ttclid"]')).toHaveValue("tiktok_click_456");

      await expect
        .poll(
          () =>
            page.evaluate(() =>
              (
                (window as Window & { __rdaTestVercelEvents?: unknown[][] })
                  .__rdaTestVercelEvents ?? []
              ).some(
                (event) =>
                  typeof event[1] === "object" &&
                  event[1] &&
                  "name" in event[1] &&
                  event[1].name === "ad_landing_view",
              ),
            ),
          { timeout: 5_000 },
        )
        .toBe(true);

      const initialEvents = await page.evaluate(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };

        return {
          ga: analyticsWindow.__rdaTestGtagEvents ?? [],
          vercel: analyticsWindow.__rdaTestVercelEvents ?? [],
        };
      });
      const gaViewEvent =
        initialEvents.ga
          .filter(
            (event): event is ["event", string, Record<string, unknown>?] =>
              event[0] === "event",
          )
          .find((event) => event[1] === "ad_landing_view")?.[2] ?? {};
      const vercelViewPayload = initialEvents.vercel.find(
        (event) =>
          typeof event[1] === "object" &&
          event[1] &&
          "name" in event[1] &&
          event[1].name === "ad_landing_view",
      )?.[1] as { data?: Record<string, unknown> } | undefined;
      const vercelViewEvent = vercelViewPayload?.data ?? {};

      expect(gaViewEvent).toMatchObject({
        campaign_intent: landingPage.campaignIntent,
        course_interest: landingPage.courseInterests.join(", "),
        landing_page: landingPage.slug,
        page_path: landingPage.path,
        utm_campaign: utmCampaign,
        utm_content: "renewal_ready_test",
        utm_id: utmId,
        utm_medium: "paid",
        utm_source: "fb",
        utm_source_platform: "meta_ads",
      });
      expect(vercelViewEvent).toMatchObject({
        campaign_intent: landingPage.campaignIntent,
        course_interest: landingPage.courseInterests.join(", "),
        landing_page: landingPage.slug,
        page_path: landingPage.path,
        utm_campaign: utmCampaign,
        utm_content: "renewal_ready_test",
        utm_id: utmId,
        utm_medium: "paid",
        utm_source: "fb",
        utm_source_platform: "meta_ads",
      });

      await form.locator('input[name="Name"]').fill("Private Test Student");
      await form.locator('input[name="_replyto"]').fill("private-test@example.com");
      await form.locator('input[name="Phone"]').fill("916-555-1234");
      await form.locator('textarea[name="Notes"]').fill("Private note should not be tracked");
      await form
        .locator('select[name="Renewal focus"]')
        .selectOption("Pit and Fissure Sealants");
      await form.locator('input[name="Consent to contact"]').check();

      await page.evaluate(async () => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
          gtag?: (...args: unknown[]) => void;
          va?: (...args: unknown[]) => void;
        };

        analyticsWindow.__rdaTestGtagEvents = [];
        analyticsWindow.__rdaTestVercelEvents = [];
        analyticsWindow.gtag = (...args: unknown[]) => {
          analyticsWindow.__rdaTestGtagEvents?.push(args);
        };
        analyticsWindow.va = (...args: unknown[]) => {
          analyticsWindow.__rdaTestVercelEvents?.push(args);
        };

        const dispatchClick = (selector: string) => {
          document
            .querySelector<HTMLElement>(selector)
            ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        };

        dispatchClick("[data-rda-ad-landing-cta='true']");
        dispatchClick(".rda-ad-hero-actions a[href^='tel:']");
        dispatchClick(".rda-ad-form-panel a[href^='mailto:'], .rda-ad-form-panel a[href^='tel:']");
      });

      await form.getByRole("button", { name: landingPage.primaryCtaLabel }).click();
      await expect(page.getByText("Request sent")).toBeVisible();

      const events = await page.evaluate(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };

        return {
          ga: analyticsWindow.__rdaTestGtagEvents ?? [],
          meta: analyticsWindow.__rdaTestMetaEvents ?? [],
          vercel: analyticsWindow.__rdaTestVercelEvents ?? [],
        };
      });

      const gaEvents = events.ga.filter(
        (event): event is ["event", string, Record<string, unknown>?] => event[0] === "event",
      );
      const metaTrackEvents = events.meta.filter(
        (event): event is ["track", string, Record<string, unknown>?] => event[0] === "track",
      );
      const vercelEvents = events.vercel
        .filter((event): event is ["event", { name: string; data?: Record<string, unknown> }] => {
          return event[0] === "event" && typeof event[1] === "object" && event[1] !== null && "name" in event[1];
        });
      const vercelEventNames = vercelEvents.map((event) => event[1].name);
      const viewContentEvent = metaTrackEvents.find((event) => event[1] === "ViewContent")?.[2] ?? {};
      const leadEvent = metaTrackEvents.find((event) => event[1] === "Lead")?.[2] ?? {};
      const leadEventOptions = events.meta.find(
        (event) => event[0] === "track" && event[1] === "Lead",
      )?.[3] as { eventID?: string } | undefined;
      const contactEvent = metaTrackEvents.find((event) => event[1] === "Contact")?.[2] ?? {};
      const ctaEvent = gaEvents.find((event) => event[1] === "cta_click")?.[2] ?? {};
      const gaLeadEvent = gaEvents.find((event) => event[1] === "generate_lead")?.[2] ?? {};
      const gaSubmitEvent = gaEvents.find((event) => event[1] === "lead_form_submit")?.[2] ?? {};
      const vercelLeadEvent =
        vercelEvents.find((event) => event[1].name === "lead_form_submit")?.[1].data ?? {};
      const expectedAttribution = {
        campaign_intent: landingPage.campaignIntent,
        course_interest: landingPage.courseInterests.join(", "),
        landing_page: landingPage.slug,
        page_path: landingPage.path,
        utm_campaign: utmCampaign,
        utm_content: "renewal_ready_test",
        utm_id: utmId,
        utm_medium: "paid",
        utm_source: "fb",
        utm_source_platform: "meta_ads",
      };
      const expectedLeadAttribution = {
        ...expectedAttribution,
        renewal_focus: "pit_and_fissure_sealants",
      };
      const trackedPayload = JSON.stringify({
        contactEvent,
        gaLeadEvent,
        gaSubmitEvent,
        leadEvent,
        vercelLeadEvent,
        viewContentEvent,
      }).toLowerCase();

      expect(viewContentEvent).toMatchObject({
        ...expectedAttribution,
        content_category: landingPage.contentCategory,
        content_name: landingPage.campaignIntent,
      });
      expect(leadEvent).toMatchObject({
        ...expectedLeadAttribution,
        content_category: "ad_landing_lead",
        content_name: "Ad Landing Lead",
        selected_count: landingPage.courseInterests.length,
      });
      expect(contactEvent).toMatchObject({
        content_category: "contact",
      });
      expect(ctaEvent).toMatchObject({
        campaign_intent: landingPage.campaignIntent,
        cta_id: "ad_landing_form",
        cta_location: "ad_hero",
        landing_page: landingPage.slug,
      });
      expect(gaLeadEvent).toMatchObject({
        form_id: "ad_landing_lead",
        lead_source: "website_ad_landing_lead",
        lead_type: "ad_landing_lead",
        selected_count: landingPage.courseInterests.length,
        ...expectedLeadAttribution,
      });
      expect(gaSubmitEvent).toMatchObject({
        form_id: "ad_landing_lead",
        lead_source: "website_ad_landing_lead",
        lead_type: "ad_landing_lead",
        selected_count: landingPage.courseInterests.length,
        ...expectedLeadAttribution,
      });
      expect(vercelLeadEvent).toMatchObject({
        form_id: "ad_landing_lead",
        selected_count: landingPage.courseInterests.length,
        ...expectedLeadAttribution,
      });
      expect(vercelEventNames).toEqual(
        expect.arrayContaining(["contact_action", "cta_click", "lead_form_submit"]),
      );
      const leadEventIds = [
        leadEvent.lead_event_id,
        gaLeadEvent.lead_event_id,
        gaSubmitEvent.lead_event_id,
        vercelLeadEvent.lead_event_id,
      ];

      expect(leadEventIds[0]).toEqual(expect.any(String));
      expect(leadEventIds.every((leadEventId) => leadEventId === leadEventIds[0])).toBe(true);
      expect(leadEventOptions).toEqual({ eventID: leadEventIds[0] });
      await expect.poll(() => attributionReceipt).not.toBeNull();
      const receivedReceipt = attributionReceipt as unknown as Record<string, unknown>;

      expect(receivedReceipt).toMatchObject({
        formId: "xzdkgaeg",
        leadEventId: leadEventIds[0],
        schemaVersion: 1,
      });
      expect(receivedReceipt.firstTouch).toMatchObject({
        anonymousId: expect.any(String),
        clickIds: {
          fbclid: "meta_click_123",
          gclid: "google_click_123",
          sc_click_id: "snap_alt_click_123",
          sccid: "snap_click_123",
          ttclid: "tiktok_click_456",
        },
        sessionId: expect.any(String),
        touchId: expect.any(String),
        type: "first",
        utm: { utm_campaign: utmCampaign },
      });
      expect(receivedReceipt.conversionTouch).toMatchObject({
        clickIds: {
          fbc: "meta_fbc_123",
          fbp: "meta_fbp_123",
          gbraid: "google_braid_123",
          msclkid: "microsoft_click_123",
          ttp: "tiktok_cookie_456",
          wbraid: "google_web_braid_123",
        },
        type: "conversion",
      });
      expect((receivedReceipt.firstTouch as { touchId: string }).touchId)
        .not.toBe((receivedReceipt.conversionTouch as { touchId: string }).touchId);
      expect(formspreeRequestBody).toContain("meta_click_123");
      expect(formspreeRequestBody).toContain("tiktok_click_456");
      expect(formspreeRequestBody).toContain("snap_click_123");
      expect(formspreeRequestBody).toContain("google_click_123");
      expect(formspreeRequestBody).toContain(utmId);
      expect(formspreeRequestBody).toContain("meta_ads");
      expect(formspreeRequestBody).toContain("Pit and Fissure Sealants");
      expect(formspreeRequestBody).toContain(String(leadEventIds[0]));
      expect(trackedPayload).not.toContain("private-test@example.com");
      expect(trackedPayload).not.toContain("916-555-1234");
      expect(trackedPayload).not.toContain("private note");
      expect(trackedPayload).not.toContain("private test student");
      expect(trackedPayload).not.toContain("meta_click_123");
      expect(trackedPayload).not.toContain("snap_click_123");
      expect(trackedPayload).not.toContain("google_click_123");
    });

    test("failed Formspree requests are not counted as leads", async ({ page }) => {
      const landingPage =
        adLandingPages.find((candidate) => candidate.slug === "dental-assisting-enroll") ??
        adLandingPages[0];
      let receiptRequests = 0;

      await page.route("https://formspree.io/f/**", async (route) => {
        await route.fulfill({
          body: JSON.stringify({ error: "temporary_failure" }),
          contentType: "application/json",
          status: 500,
        });
      });
      await page.route("**/api/attribution/receipt", async (route) => {
        receiptRequests += 1;
        await route.fulfill({ status: 202 });
      });
      await page.addInitScript(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
          fbq?: (...args: unknown[]) => void;
          gtag?: (...args: unknown[]) => void;
          va?: (...args: unknown[]) => void;
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
        analyticsWindow.va = (...args: unknown[]) => {
          analyticsWindow.__rdaTestVercelEvents?.push(args);
        };
      });

      await gotoSettled(
        page,
        `${landingPage.path}?utm_source=facebook&utm_medium=paid_social&utm_campaign=failure_check`,
      );

      const form = page.locator('form[data-rda-landing-form="true"]');

      await form.locator('input[name="Name"]').fill("Failure Test");
      await form.locator('input[name="_replyto"]').fill("failure-test@example.com");
      await form.locator('input[name="Phone"]').fill("916-555-0199");
      await form.locator('input[name="Consent to contact"]').check();
      await page.evaluate(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };

        analyticsWindow.__rdaTestGtagEvents = [];
        analyticsWindow.__rdaTestMetaEvents = [];
        analyticsWindow.__rdaTestVercelEvents = [];
      });

      await form.getByRole("button", { name: landingPage.primaryCtaLabel }).click();
      await expect(page.locator('[data-rda-lead-form-error="true"]')).toBeVisible();

      const eventNames = await page.evaluate(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };

        return {
          ga: (analyticsWindow.__rdaTestGtagEvents ?? []).map((event) => event[1]),
          meta: (analyticsWindow.__rdaTestMetaEvents ?? []).map((event) => event[1]),
          vercel: (analyticsWindow.__rdaTestVercelEvents ?? []).map((event) =>
            typeof event[1] === "object" && event[1] && "name" in event[1]
              ? (event[1] as { name: string }).name
              : undefined,
          ),
        };
      });

      expect(eventNames.ga).not.toContain("generate_lead");
      expect(eventNames.ga).not.toContain("lead_form_submit");
      expect(eventNames.meta).not.toContain("Lead");
      expect(eventNames.vercel).not.toContain("lead_form_submit");
      expect(receiptRequests).toBe(0);
    });

    test("ad attribution persists when a visitor continues to another site form", async ({
      page,
    }) => {
      const landingPage =
        adLandingPages.find((candidate) => candidate.slug === "dental-assisting-enroll") ??
        adLandingPages[0];

      await gotoSettled(
        page,
        `${landingPage.path}?utm_source=instagram&utm_medium=paid_social&utm_campaign=persisted_campaign&utm_content=persisted_creative&fbclid=persisted_meta_click`,
      );
      await expect(
        page.locator('form[data-rda-landing-form="true"] input[name="utm_campaign"]'),
      ).toHaveValue("persisted_campaign");

      await gotoSettled(page, "/");

      const signupForm = page.locator('form[data-rda-signup-form="true"]');

      await expect(signupForm.locator('input[name="utm_source"]')).toHaveValue("instagram");
      await expect(signupForm.locator('input[name="utm_medium"]')).toHaveValue("paid_social");
      await expect(signupForm.locator('input[name="utm_campaign"]')).toHaveValue(
        "persisted_campaign",
      );
      await expect(signupForm.locator('input[name="utm_content"]')).toHaveValue(
        "persisted_creative",
      );
      await expect(signupForm.locator('input[name="fbclid"]')).toHaveValue(
        "persisted_meta_click",
      );
    });

    test("first-touch Saturday tags and parsed ad_id stamp both Formspree forms", async ({
      page,
    }) => {
      const enrollPage =
        adLandingPages.find((candidate) => candidate.slug === "dental-assisting-enroll") ??
        adLandingPages[0];
      const adId = "120248349183900567";
      const utmContent = `static_photo_${adId}`;
      let enrollRequestUrl = "";
      let courseInfoRequestUrl = "";
      let courseInfoRequestBody = "";

      await page.route("https://formspree.io/f/**", async (route) => {
        const url = route.request().url();
        const body = route.request().postData() ?? "";

        if (url.includes("mpqgyjjg")) {
          enrollRequestUrl = url;
        }

        if (url.includes("xzdkgaeg")) {
          courseInfoRequestUrl = url;
          courseInfoRequestBody = body;
        }

        await route.fulfill({
          body: JSON.stringify({ ok: true }),
          contentType: "application/json",
          status: 200,
        });
      });
      await page.addInitScript(() => {
        const analyticsWindow = window as Window & {
          __rdaTestMetaEvents?: unknown[][];
          fbq?: (...args: unknown[]) => void;
        };

        analyticsWindow.__rdaTestMetaEvents = [];
        analyticsWindow.fbq = (...args: unknown[]) => {
          analyticsWindow.__rdaTestMetaEvents?.push(args);
        };
      });

      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(
        page,
        `${enrollPage.path}?utm_source=fb&utm_medium=paid&utm_campaign=saturday_academy_sep12&utm_id=120248349183900000&utm_source_platform=meta_ads&utm_content=${utmContent}&fbclid=saturday_click_123`,
      );

      const enrollForm = page.locator('form[data-rda-landing-form="true"]');
      await expect(enrollForm).toHaveAttribute("action", "https://formspree.io/f/mpqgyjjg");
      await expect(enrollForm.locator('input[name="utm_campaign"]')).toHaveValue(
        "saturday_academy_sep12",
      );
      await expect(enrollForm.locator('input[name="utm_content"]')).toHaveValue(utmContent);
      await expect(enrollForm.locator('input[name="ad_id"]')).toHaveValue(adId);
      await expect(enrollForm.locator('input[name="campaign_id"]')).toHaveValue(
        "120248349183900000",
      );

      await enrollForm.locator('input[name="Name"]').fill("Saturday First Touch");
      await enrollForm.locator('input[name="_replyto"]').fill("saturday-first-touch@example.com");
      await enrollForm.locator('input[name="Phone"]').fill("916-555-0112");
      await enrollForm.locator('input[name="Consent to contact"]').check();
      await enrollForm.getByRole("button", { name: enrollPage.primaryCtaLabel }).click();
      await expect(page.getByText("Request sent")).toBeVisible();
      await expect.poll(() => enrollRequestUrl).toContain("mpqgyjjg");

      await gotoSettled(page, "/");

      const signupForm = page.locator('form[data-rda-signup-form="true"]').first();
      await expect(signupForm).toHaveAttribute("action", "https://formspree.io/f/xzdkgaeg");
      await expect(signupForm.locator('input[name="utm_campaign"]')).toHaveValue(
        "saturday_academy_sep12",
      );
      await expect(signupForm.locator('input[name="utm_content"]')).toHaveValue(utmContent);
      await expect(signupForm.locator('input[name="ad_id"]')).toHaveValue(adId);
      await expect(signupForm.locator('input[name="landing_page"]')).toHaveValue(enrollPage.path);

      await signupForm.getByRole("checkbox").first().click();
      await signupForm.locator('input[name="Name"]').fill("Course Info First Touch");
      await signupForm.locator('input[name="_replyto"]').fill("course-info-first-touch@example.com");
      await signupForm.locator('input[name="Phone"]').fill("916-555-0113");
      await signupForm.getByRole("button", { name: "Request next steps" }).click();
      await expect(page.getByText("Request sent")).toBeVisible();
      await expect.poll(() => courseInfoRequestUrl).toContain("xzdkgaeg");
      expect(courseInfoRequestBody).toContain("saturday_academy_sep12");
      expect(courseInfoRequestBody).toContain(utmContent);
      expect(courseInfoRequestBody).toContain(adId);
      expect(courseInfoRequestBody).toContain(enrollPage.path);

      await gotoSettled(page, "/dental-assisting-program");
      const programForm = page.locator('form[data-rda-signup-form="true"]');
      await expect(programForm).toHaveAttribute("action", "https://formspree.io/f/xzdkgaeg");
      await expect(programForm.locator('input[name="landing_page"]')).toHaveValue(enrollPage.path);
      await expect(programForm.locator('input[name="campaign_intent"]')).toHaveValue(
        "saturday_academy_sep12",
      );
      await expect(programForm.locator('input[name="ad_id"]')).toHaveValue(adId);

      await gotoSettled(page, "/contact");
      await page.locator('[data-rda-contact-form-toggle="true"]').click();
      const contactForm = page.locator('form[data-rda-contact-form="true"]');
      await expect(contactForm.locator('input[name="utm_content"]')).toHaveValue(utmContent);
      await expect(contactForm.locator('input[name="ad_id"]')).toHaveValue(adId);

      await page.evaluate(() => {
        const analyticsWindow = window as Window & { __rdaTestMetaEvents?: unknown[][] };
        analyticsWindow.__rdaTestMetaEvents = [];
        document
          .querySelector<HTMLAnchorElement>('a[href^="tel:"]')
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        document
          .querySelector<HTMLAnchorElement>("[data-rda-whatsapp]")
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });

      const contactEvents = await page.evaluate(() => {
        const analyticsWindow = window as Window & { __rdaTestMetaEvents?: unknown[][] };
        return (analyticsWindow.__rdaTestMetaEvents ?? []).filter(
          (event): event is ["track", string, Record<string, unknown>?] =>
            event[0] === "track" && event[1] === "Contact",
        );
      });

      expect(contactEvents.length).toBeGreaterThanOrEqual(2);
      expect(contactEvents.map((event) => event[2])).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ad_id: adId,
            content_name: "call",
            utm_content: utmContent,
          }),
          expect.objectContaining({
            ad_id: adId,
            content_name: "whatsapp",
            utm_content: utmContent,
          }),
        ]),
      );
    });

    test("first touch stays immutable while a later paid touch becomes the conversion touch", async ({
      page,
    }) => {
      const landingPage =
        adLandingPages.find((candidate) => candidate.slug === "dental-assisting-enroll") ??
        adLandingPages[0];

      await gotoSettled(
        page,
        `${landingPage.path}?utm_source=google&utm_medium=cpc&utm_campaign=first_campaign&gclid=first_google_click`,
      );
      await expect(
        page.locator('form[data-rda-landing-form="true"] input[name="utm_campaign"]'),
      ).toHaveValue("first_campaign");

      await gotoSettled(
        page,
        `${landingPage.path}?utm_source=instagram&utm_medium=paid_social&utm_campaign=conversion_campaign&fbclid=conversion_meta_click`,
      );
      await expect(
        page.locator('form[data-rda-landing-form="true"] input[name="utm_campaign"]'),
      ).toHaveValue("first_campaign");

      const storedAttribution = await page.evaluate(() => {
        const raw = window.localStorage.getItem("rda_lead_attribution_v2");
        return raw ? JSON.parse(raw) : null;
      });

      expect(storedAttribution).toMatchObject({
        anonymousId: expect.any(String),
        conversionTouch: {
          clickIds: { fbclid: "conversion_meta_click" },
          touchId: expect.any(String),
          utm: { utm_campaign: "conversion_campaign", utm_source: "instagram" },
        },
        firstTouch: {
          clickIds: { gclid: "first_google_click" },
          touchId: expect.any(String),
          utm: { utm_campaign: "first_campaign", utm_source: "google" },
        },
        policyVersion: "2026-08-23",
        version: 2,
      });
      expect(storedAttribution.firstTouch.touchId).not.toBe(
        storedAttribution.conversionTouch.touchId,
      );
    });

    test("privacy signals restrict durable attribution to the browser session", async ({ page }) => {
      const landingPage =
        adLandingPages.find((candidate) => candidate.slug === "dental-assisting-enroll") ??
        adLandingPages[0];

      await page.addInitScript(() => {
        Object.defineProperty(navigator, "globalPrivacyControl", {
          configurable: true,
          value: true,
        });
      });
      await gotoSettled(
        page,
        `${landingPage.path}?utm_source=facebook&utm_medium=paid_social&utm_campaign=privacy_restricted&fbclid=restricted_meta_click`,
      );
      await expect(
        page.locator('form[data-rda-landing-form="true"] input[name="utm_campaign"]'),
      ).toHaveValue("privacy_restricted");

      const storageState = await page.evaluate(() => ({
        durable: window.localStorage.getItem("rda_lead_attribution_v2"),
        session: window.sessionStorage.getItem("rda_lead_attribution_session_v2"),
      }));

      expect(storageState.durable).toBeNull();
      expect(storageState.session).toContain("privacy_restricted");
    });

    test("current ad attribution still works when session storage is unavailable", async ({
      page,
    }) => {
      const landingPage =
        adLandingPages.find((candidate) => candidate.slug === "dental-assisting-enroll") ??
        adLandingPages[0];

      await page.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw new DOMException("Storage unavailable", "SecurityError");
        };
        Storage.prototype.setItem = () => {
          throw new DOMException("Storage unavailable", "SecurityError");
        };
      });
      await gotoSettled(
        page,
        `${landingPage.path}?utm_source=facebook&utm_medium=paid_social&utm_campaign=restricted_storage&fbclid=restricted_click`,
      );

      const form = page.locator('form[data-rda-landing-form="true"]');

      await expect(form.locator('input[name="utm_source"]')).toHaveValue("facebook");
      await expect(form.locator('input[name="utm_campaign"]')).toHaveValue(
        "restricted_storage",
      );
      await expect(form.locator('input[name="fbclid"]')).toHaveValue("restricted_click");
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
      const checkboxes = form.getByRole("checkbox");
      const selectedPayloads = form.locator('input[type="hidden"][name="Interested classes[]"]');
      const optionIcons = form.locator(".rda-interest-option-icon[data-rda-signup-icon]");

      await expect(submit).toBeVisible();
      await expect(page.getByRole("heading", { name: "Request Course Info" })).toBeVisible();
      await expect(page.getByText("This is the first step, not a reserved seat.")).toBeVisible();
      await expect(page.locator(".rda-signup-next-steps li")).toHaveCount(3);
      await expect(form).toHaveAttribute("action", "https://formspree.io/f/xzdkgaeg");
      await expect(form).toHaveAttribute("method", /post/i);
      await expect(form.locator('input[name="_subject"]')).toHaveValue(
        "Roseville Dental Academy course info request",
      );
      await expect(form.locator('input[name="page_path"]')).toHaveValue("/");
      await expect(name).toHaveAttribute("required", "");
      await expect(email).toHaveAttribute("type", "email");
      await expect(email).toHaveAttribute("required", "");
      await expect(phone).toHaveAttribute("type", "tel");
      await expect(phone).toHaveAttribute("required", "");
      await expect(notes).toBeVisible();
      await expect(checkboxes).toHaveCount(8);
      await expect(optionIcons).toHaveCount(8);
      await expect(form.locator('[data-rda-signup-icon="name"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="email"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="phone"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="notes"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="note"]')).toBeVisible();
      await expect(form.locator('[data-rda-signup-icon="submit"]')).toBeVisible();
      await expect(form.getByText("Classes or certifications to ask about")).toBeVisible();
      await expect(form.getByText("Next open date: September 12, 2026 (Saturday Academy)")).toHaveCount(1);
      await expect(form.getByText("Next open date: September 12, 2026", { exact: true })).toHaveCount(0);
      await expect(form.getByText("Next open date: July 18, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: August 1, 2026")).toHaveCount(2);
      await expect(form.getByText("Next open date: September 5, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: October 17, 2026")).toHaveCount(1);
      await expect(form.getByText("Next open date: August 8, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: October 12, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: October 24, 2026")).toHaveCount(2);
      await expect(form.getByText("By appointment")).toBeVisible();
      await expect(form.getByText("Team can recommend a starting point")).toBeVisible();
      await expect(submit).toHaveText(/Request next steps/);
      await expect(selectedPayloads).toHaveCount(0);

      await name.fill("Test Student");
      await email.fill("student@example.com");
      await phone.fill("916-555-0123");
      await submit.click();
      await expect(form.getByText("Choose at least one class or certification.")).toBeVisible();

      const dentalAssisting = form.getByRole("checkbox", { name: "Dental Assisting Program" });
      await expect(dentalAssisting).toBeVisible();
      await expect(form.getByRole("checkbox", { name: "BLS / CPR" })).toBeVisible();
      await expect(form.getByLabel("Front Office Program")).toHaveCount(0);
      await dentalAssisting.click();
      await expect(dentalAssisting).toHaveAttribute("aria-checked", "true");
      await expect(selectedPayloads).toHaveCount(1);
      await expect(selectedPayloads.first()).toHaveValue("Dental Assisting Program");

      await gotoSettled(page, "/infection-control");
      const coursePage = page.locator('[data-rda-live-course="infection-control"]');
      await expect(coursePage.getByText("$395*.", { exact: true })).toBeVisible();
      await expect(coursePage.locator(".rda-course-policy-note")).toHaveText(
        "* All Roseville Dental Academy courses are nonrefundable.",
      );
      const courseForm = page.locator('form[data-rda-signup-form="true"]').first();
      await expect(courseForm).toBeVisible();
      await expect(courseForm.locator(".rda-interest-option-icon[data-rda-signup-icon]")).toHaveCount(8);
      await expect(courseForm.locator('[data-rda-signup-icon="name"]')).toBeVisible();
      await expect(courseForm.locator('[data-rda-signup-icon="email"]')).toBeVisible();
      await expect(courseForm.locator('[data-rda-signup-icon="phone"]')).toBeVisible();
      await expect(courseForm.locator('[data-rda-signup-icon="notes"]')).toBeVisible();
      await expect(courseForm.locator('[data-rda-signup-icon="submit"]')).toBeVisible();

      await gotoSettled(page, "/contact");
      await expect(page.locator('form[data-rda-signup-form="true"]').first()).toBeVisible();
    });

    test("course pages show matched Google review excerpts", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });

      const courseReviewCases = [
        {
          id: "dental-assisting-program",
          path: "/dental-assisting-program",
          phrases: ["9-week program was well-structured", "DA program gives you"],
          title: "Student reviews for Dental Assisting",
        },
        {
          id: "bls-cpr-1",
          path: "/bls%2Fcpr-1",
          phrases: ["BLS certifications", "BLS, x-rays"],
          title: "Student reviews for BLS / CPR",
        },
        {
          id: "infection-control",
          path: "/infection-control",
          phrases: ["infection control", "working toward my RDA"],
          title: "Student reviews for Infection Control",
        },
        {
          id: "radiation-safety",
          path: "/radiation-safety",
          phrases: ["X Ray and BLS certifications", "taking x-rays"],
          title: "Student reviews for Radiation Safety",
        },
        {
          id: "coronal-polish",
          path: "/coronal-polish",
          phrases: ["working toward my RDA", "Second time taking a class here"],
          title: "Student reviews for Coronal Polish",
        },
        {
          id: "sealants",
          path: "/sealants",
          phrases: ["X-ray and sealant course", "working toward my RDA"],
          title: "Student reviews for Sealants",
        },
      ];

      for (const course of courseReviewCases) {
        await gotoSettled(page, course.path);

        const reviews = page.locator(`[data-rda-course-reviews="${course.id}"]`);

        await expect(reviews).toBeVisible();
        await expect(reviews.getByRole("heading", { name: course.title })).toBeVisible();
        await expect(reviews.locator(".rda-course-review-card")).toHaveCount(3);

        const introCenterOffset = await reviews
          .locator(".rda-review-photo-intro")
          .evaluate((intro) => {
            const section = intro.closest("[data-rda-course-reviews]");
            if (!section) {
              return Number.POSITIVE_INFINITY;
            }

            const introBox = intro.getBoundingClientRect();
            const sectionBox = section.getBoundingClientRect();

            return Math.abs(
              introBox.left + introBox.width / 2 - (sectionBox.left + sectionBox.width / 2),
            );
        });

        expect(introCenterOffset).toBeLessThan(2);

        const cardBottomDelta = await reviews.locator(".rda-course-review-card").evaluateAll(
          (cards) => {
            const bottoms = cards.map((card) => card.getBoundingClientRect().bottom);

            return Math.max(...bottoms) - Math.min(...bottoms);
          },
        );

        expect(cardBottomDelta).toBeLessThan(2);

        for (const phrase of course.phrases) {
          await expect(reviews).toContainText(phrase);
        }

        await expect(reviews.getByRole("link", { name: "Open Google reviews" })).toHaveAttribute(
          "href",
          /maps\.google\.com/,
        );
      }
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
      await expect(page.getByText("Office hours").first()).toBeVisible();
      await expect(page.getByText("Monday").first()).toBeVisible();
      await expect(page.getByText("9AM-5PM").first()).toBeVisible();
      await expect(page.getByText("Wednesday").first()).toBeVisible();
      await expect(page.getByText("8AM-5PM").first()).toBeVisible();
      await expect(page.getByText("Friday").first()).toBeVisible();
      await expect(page.getByText("9AM-3PM").first()).toBeVisible();
      await expect(page.getByText("Saturday").first()).toBeVisible();
      await expect(page.getByText("Office closed; Saturday Academy classes start Sept 12").first()).toBeVisible();
      await expect(
        page.getByText("Front-desk hours only. Saturday Academy classes start September 12, 2026").first(),
      ).toBeVisible();

      const mapFrame = page.locator('iframe[data-rda-google-map="true"]');

      await expect(mapFrame).toHaveCount(1);
      await expect(mapFrame).toBeVisible();
      await expect(mapFrame).toHaveAttribute(
        "src",
        /google\.com\/maps\/embed\?pb=.*Roseville%20Dental%20Academy/,
      );
      await expect(mapFrame).toHaveAttribute(
        "title",
        "Google Maps location for Roseville Dental Academy",
      );

      const mapBox = await mapFrame.boundingBox();
      expect(mapBox?.width ?? 0).toBeGreaterThanOrEqual(200);
      expect(mapBox?.height ?? 0).toBeGreaterThanOrEqual(200);

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

    test("mobile contact map stacks without creating blank space", async ({ page }) => {
      await page.setViewportSize({ height: 844, width: 390 });
      await gotoSettled(page, "/contact");

      const mobileContactLayout = await page.locator(".rda-contact-section").evaluate((section) => {
        const grid = section.querySelector<HTMLElement>(".rda-contact-grid");
        const copy = section.querySelector<HTMLElement>(".rda-contact-copy");
        const map = section.querySelector<HTMLElement>(".rda-contact-map-card");
        const signup = document.querySelector<HTMLElement>(".rda-signup-section");
        const read = (element: HTMLElement | null) => {
          const rect = element?.getBoundingClientRect();

          return rect
            ? {
                bottom: Math.round(rect.bottom),
                height: Math.round(rect.height),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
              }
            : null;
        };
        const gridColumns = grid ? getComputedStyle(grid).gridTemplateColumns : "";

        return {
          blankAfterMap:
            signup && map
              ? Math.round(signup.getBoundingClientRect().top - map.getBoundingClientRect().bottom)
              : 0,
          columnCount: gridColumns.split(" ").filter(Boolean).length,
          copy: read(copy),
          grid: read(grid),
          map: read(map),
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      expect(mobileContactLayout.columnCount).toBe(1);
      expect(mobileContactLayout.copy?.width ?? 0).toBeGreaterThanOrEqual(320);
      expect(mobileContactLayout.map?.width ?? 0).toBeGreaterThanOrEqual(320);
      expect(mobileContactLayout.map?.top ?? 0).toBeGreaterThan(mobileContactLayout.copy?.bottom ?? 0);
      expect(mobileContactLayout.copy?.height ?? 0).toBeLessThan(880);
      expect(mobileContactLayout.blankAfterMap).toBeLessThanOrEqual(72);
      expect(mobileContactLayout.overflowX).toBe(0);
    });
  });

  test.describe("Saturday Academy promo", () => {
    test.beforeEach(async ({ context }) => {
      await blockElevenLabsWidgetScript(context);
    });

    test("banner promotes Saturday Academy and links to the DA enroll LP", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const banner = page.locator("[data-rda-promo-banner='true']");

      await expect(banner).toBeVisible();
      await expect(banner).toContainText("Saturday Academy starts Sept 12");
      await expect(banner).toContainText("Mon, Fri, or Sat schedules (pick one)");
      await expect(banner).toHaveAttribute("href", activeSitePromo.ctaHref);
      expect(activeSitePromo.ctaHref).toBe("/lp/dental-assisting-enroll");
    });

    test("popup appears, uses the enroll CTA, and stays dismissed", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/", { allowPromo: true });

      const dialog = page.locator("[data-rda-promo-dialog='true']");

      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(dialog.getByText("Now enrolling")).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Saturday Academy starts September 12, 2026" }),
      ).toBeVisible();
      await expect(dialog.getByText("You attend one schedule, not all three.")).toBeVisible();

      const cta = dialog.locator("[data-rda-promo-cta='true']");

      await expect(cta).toHaveAttribute("href", "/lp/dental-assisting-enroll");
      await expect(cta).toHaveText("Ask about Saturday Academy");

      await dialog.getByRole("button", { name: "Dismiss Saturday Academy announcement" }).click();
      await expect(dialog).toHaveCount(0);

      const stored = await page.evaluate(
        (key) => window.localStorage.getItem(key),
        activeSitePromo.storageKey,
      );

      expect(stored).toBe("dismissed");

      await gotoSettled(page, "/contact", { allowPromo: true });
      await expect(page.locator("[data-rda-promo-dialog='true']")).toHaveCount(0);
    });

    test("popup is not shown on ad landing pages", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/lp/dental-assisting-enroll", { allowPromo: true });

      await expect(page.locator("[data-rda-promo-banner='true']")).toBeVisible();
      await expect(page.locator("[data-rda-promo-dialog='true']")).toHaveCount(0);
      await expect(page.locator('form[data-rda-landing-form="true"]')).toBeVisible();
    });

    test("DA enroll LP lists September 12 Saturday Academy as the next start", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/lp/dental-assisting-enroll");

      const dates = page.locator(".rda-ad-date-list");

      await expect(page.getByText("Next start: September 12, 2026 (Saturday Academy)")).toBeVisible();
      await expect(dates.getByText("September 12, 2026 (Saturday Academy)")).toBeVisible();
      await expect(dates.getByText("October 12, 2026")).toBeVisible();
      await expect(dates.getByText("November 20, 2026")).toBeVisible();
      await expect(
        page.getByText("Monday, Friday, and Saturday class schedules are separate options; students attend one, not all three."),
      ).toBeVisible();

      const startSelect = page.locator('select[name="Preferred start date"]');

      await expect(startSelect).toBeVisible();
      await expect(startSelect.locator("option", { hasText: "September 12, 2026 (Saturday Academy)" })).toHaveCount(1);
    });
  });
});
