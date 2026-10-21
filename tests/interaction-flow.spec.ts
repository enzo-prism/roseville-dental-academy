import { expect, test } from "@playwright/test";

import { adLandingPages, PAID_TRAFFIC_LANDER_SLUGS } from "@/lib/ad-landing-pages";
import { activeSitePromo } from "@/lib/site-promo";
import {
  blockOpenAIAdsPixelNetwork,
  localOrigin,
  suppressSeasonalTheme,
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
  // Covers the allowPromo paths too, which skip suppressSitePromo.
  test.beforeEach(async ({ context }) => {
    await suppressSeasonalTheme(context);
  });

  test("WhatsApp button stays bottom-right and ElevenLabs is gone", async ({ page }) => {
    const viewports = [
      { height: 900, name: "desktop", width: 1280 },
      { height: 1024, name: "tablet", width: 768 },
      { height: 844, name: "mobile", width: 390 },
    ] as const;

    for (const viewport of viewports) {
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await gotoSettled(page, "/");

      await expect(page.locator("elevenlabs-convai")).toHaveCount(0);
      await expect(page.locator(".live-elevenlabs-widget")).toHaveCount(0);
      await expect(page.locator('script[src*="elevenlabs"], script[src*="convai-widget-embed"]')).toHaveCount(0);

      const fab = page.locator(".rda-whatsapp-fab");
      await expect(fab).toBeVisible();
      await expect(fab).toHaveAttribute("href", /wa\.me\/19165075157/);
      await expect(fab).toHaveCSS("position", "fixed");
      await expect(fab).toHaveCSS("pointer-events", "auto");

      const mainTop = await page.locator("#rda-main-content").evaluate((element) => {
        return Math.round(element.getBoundingClientRect().top);
      });

      const placement = await page.evaluate(() => {
        const fabElement = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
        const header = document.querySelector<HTMLElement>(".rda-live-header");
        const fabRect = fabElement?.getBoundingClientRect();
        const headerRect = header?.getBoundingClientRect();
        const hit = fabRect
          ? document.elementFromPoint(
              fabRect.left + fabRect.width / 2,
              fabRect.top + fabRect.height / 2,
            )
          : null;

        return {
          bottomGap: fabRect ? Math.round(window.innerHeight - fabRect.bottom) : -1,
          clickable: Boolean(fabElement && hit && (hit === fabElement || fabElement.contains(hit))),
          headerOverlap: Boolean(
            headerRect &&
              fabRect &&
              fabRect.top < headerRect.bottom &&
              fabRect.bottom > headerRect.top &&
              fabRect.left < headerRect.right &&
              fabRect.right > headerRect.left,
          ),
          height: fabRect ? Math.round(fabRect.height) : 0,
          left: fabRect ? Math.round(fabRect.left) : 0,
          rightGap: fabRect ? Math.round(window.innerWidth - fabRect.right) : -1,
          width: fabRect ? Math.round(fabRect.width) : 0,
        };
      });

      expect(placement.clickable, viewport.name).toBe(true);
      expect(placement.headerOverlap, viewport.name).toBe(false);
      expect(placement.rightGap, viewport.name).toBeGreaterThanOrEqual(12);
      expect(placement.rightGap, viewport.name).toBeLessThanOrEqual(32);
      expect(placement.bottomGap, viewport.name).toBeGreaterThanOrEqual(12);
      expect(placement.bottomGap, viewport.name).toBeLessThanOrEqual(40);
      expect(placement.left, viewport.name).toBeGreaterThan(viewport.width / 2);
      expect(placement.width, viewport.name).toBeGreaterThanOrEqual(56);
      expect(placement.height, viewport.name).toBeGreaterThanOrEqual(40);

      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      const footerClearance = await page.evaluate(() => {
        const fabElement = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
        const policy = document.querySelector<HTMLElement>(".rda-footer-policy");
        const copy = document.querySelector<HTMLElement>(".rda-footer-copy");
        const fabRect = fabElement?.getBoundingClientRect();

        function overlaps(element: HTMLElement | null) {
          if (!element || !fabRect) {
            return false;
          }

          // Paragraph boxes span the footer width; only rendered text can be
          // obscured by the floating button in their otherwise empty gutters.
          const range = document.createRange();
          range.selectNodeContents(element);
          return Array.from(range.getClientRects()).some((rect) => (
            rect.left < fabRect.right &&
            rect.right > fabRect.left &&
            rect.top < fabRect.bottom &&
            rect.bottom > fabRect.top
          ));
        }

        return {
          copyOverlap: overlaps(copy),
          policyOverlap: overlaps(policy),
        };
      });
      expect(footerClearance.policyOverlap, viewport.name).toBe(false);
      expect(footerClearance.copyOverlap, viewport.name).toBe(false);

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      // The promo banner collapses while scrolled and re-expands at the top;
      // once that settles, main content must be back exactly where it was.
      await expect
        .poll(
          () => page.locator("#rda-main-content").evaluate((element) => Math.round(element.getBoundingClientRect().top)),
          { message: viewport.name },
        )
        .toBe(mainTop);
    }

    await page.setViewportSize({ height: 844, width: 390 });
    await gotoSettled(page, "/contact");
    // The full /contact page shows its message form without a toggle.
    const sendButton = page.locator('form[data-rda-contact-form="true"]').getByRole("button", { name: "Send" });
    await expect(sendButton).toBeVisible();
    await sendButton.evaluate((button) => button.scrollIntoView({ block: "center", inline: "nearest" }));
    const formClear = await sendButton.evaluate((button) => {
      const fabElement = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
      const fabRect = fabElement?.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      if (!fabRect) {
        return false;
      }

      return !(
        buttonRect.left < fabRect.right &&
        buttonRect.right > fabRect.left &&
        buttonRect.top < fabRect.bottom &&
        buttonRect.bottom > fabRect.top
      );
    });
    expect(formClear).toBe(true);

    await page.setViewportSize({ height: 900, width: 1280 });
    await gotoSettled(page, "/dental-assisting-program");
    await expect(page.locator("elevenlabs-convai")).toHaveCount(0);
    await expect(page.locator(".rda-whatsapp-fab")).toBeVisible();
    const courseRightGap = await page.locator(".rda-whatsapp-fab").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return Math.round(window.innerWidth - rect.right);
    });
    expect(courseRightGap).toBeGreaterThanOrEqual(12);
    expect(courseRightGap).toBeLessThanOrEqual(32);

    await page.setViewportSize({ height: 844, width: 390 });
    await gotoSettled(page, "/");
    await page.getByRole("button", { name: "Hamburger Site Navigation Icon" }).click();
    await expect(page.locator(".rda-whatsapp-fab")).toBeHidden();
    await expect(page.getByRole("link", { name: "Home", exact: true }).first()).toBeVisible();

    await page.setViewportSize({ height: 900, width: 390 });
    await gotoSettled(page, "/lp/dental-assisting-enroll");
    await expect(page.locator("elevenlabs-convai")).toHaveCount(0);
    await expect(page.locator(".live-elevenlabs-widget")).toHaveCount(0);
    await expect(page.locator(".rda-whatsapp-fab")).toHaveCount(0);
    await expect(page.locator('form[data-rda-landing-form="true"]')).toBeVisible();
  });

  test.describe("without third-party widget noise", () => {
    test.beforeEach(async ({ context }) => {
      await blockOpenAIAdsPixelNetwork(context);
      await suppressSitePromo(context);
    });

    test("desktop More menu opens and navigates to More Information pages", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const nav = page.locator(".rda-desktop-nav");
      // Instructors, reviews, and photos are first-class top-level links.
      await expect(nav.getByRole("link", { name: "Instructors" })).toHaveAttribute("href", "/meet-the-instructors");
      await expect(nav.getByRole("link", { name: "Reviews" })).toHaveAttribute("href", "/reviews");
      await expect(nav.getByRole("link", { name: "Photos" })).toHaveAttribute("href", "/photos");

      const moreButton = nav.getByRole("button", { name: /^more$/i });
      await moreButton.click();
      await expect(moreButton).toHaveAttribute("aria-expanded", "true");

      const menu = page.locator('[data-rda-more-menu][data-open="true"]');
      await expect(menu).toBeVisible();
      await expect(menu.getByRole("link", { name: /Career Journey/ })).toHaveAttribute("href", "/journey");
      await expect(menu.getByRole("link", { name: /FAQs/ })).toHaveAttribute("href", "/faqs-1");
      await expect(menu.getByRole("link", { name: /Resources/ })).toHaveAttribute("href", "/resources");
      await expect(menu.getByRole("link", { name: /Student & Alumni Jobs/ })).toHaveAttribute("href", "/student-jobs");
      await expect(menu.getByRole("link", { name: /Resume Portal DR\/OMS only/ })).toHaveAttribute(
        "href",
        /rosevilledental\.godaddysites\.com\/m\/login/,
      );

      await menu.getByRole("link", { name: /FAQs/ }).click();
      await page.waitForURL("**/faqs-1", { timeout: 12_000 });
      await expect(page.locator("main").getByRole("heading", { level: 1 })).toContainText(
        "Dental Assisting Program FAQs",
      );
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
        "If Roseville Dental Academy cancels, students may choose another available course date or a refund.",
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
        journey.getByRole("heading", {
          name: "Expiration Dates Applied to Course Certificates",
        }),
      ).toBeVisible();
      await expect(journey.locator("[data-rda-certificate-expiration='true']")).toContainText(
        "do not apply to unlicensed dental assistants",
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
      const stage = hero.locator("[data-rda-active-slide]");
      const slides = hero.locator(".rda-home-hero-slide");
      const cta = page.locator('[data-rda-home-hero-signup="true"]');
      const signup = page.locator("#quick-sign-up[data-rda-signup-section='true']");

      await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
        "Begin Your Career in Dental Assisting",
      );
      await expect(hero.getByText("Train hands-on inside a working dental office")).toBeVisible();
      await expect(slides).toHaveCount(3);
      await expect(stage).toHaveClass(/is-interactive/);
      await expect(stage).toHaveAttribute("aria-roledescription", "carousel");

      const heroControls = hero.locator("[data-rda-home-hero-control]");
      const heroPrevious = hero.locator("[data-rda-home-hero-previous]");
      const heroNext = hero.locator("[data-rda-home-hero-next]");

      await expect(heroControls).toHaveCount(3);
      await expect(heroPrevious).toBeVisible();
      await expect(heroNext).toBeVisible();
      await expect(heroPrevious).toBeEnabled();
      await expect(heroNext).toBeEnabled();
      // Reduced motion keeps the slideshow paused on the first photo.
      await expect(hero.getByRole("button", { name: "Play slideshow" })).toBeVisible();
      await expect(stage).toHaveAttribute("data-rda-active-slide", "0");
      await expect(heroControls.nth(0)).toHaveAttribute("aria-current", "true");
      await expect(slides.nth(0)).toHaveAttribute("aria-hidden", "false");
      await expect(slides.nth(1)).toHaveAttribute("aria-hidden", "true");

      const heroControlDesign = await hero.evaluate((element) => {
        const arrow = element.querySelector<HTMLElement>("[data-rda-home-hero-next]");
        const dot = element.querySelector<HTMLElement>("[data-rda-home-hero-control]");
        const arrowRect = arrow?.getBoundingClientRect();

        return {
          arrowHeight: arrowRect ? Math.round(arrowRect.height) : 0,
          arrowWidth: arrowRect ? Math.round(arrowRect.width) : 0,
          dotPointerEvents: dot ? getComputedStyle(dot).pointerEvents : "",
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
        };
      });

      // Touch-sized arrows, clickable dots, and no horizontal overflow.
      expect(heroControlDesign.arrowHeight).toBeGreaterThanOrEqual(44);
      expect(heroControlDesign.arrowWidth).toBeGreaterThanOrEqual(44);
      expect(heroControlDesign).toMatchObject({ dotPointerEvents: "auto", overflowX: 0 });

      await heroControls.nth(1).click();
      await expect(stage).toHaveAttribute("data-rda-active-slide", "1");
      await expect(slides.nth(1)).toHaveAttribute("aria-hidden", "false");
      await expect(heroControls.nth(1)).toHaveAttribute("aria-current", "true");
      await heroNext.click();
      await expect(stage).toHaveAttribute("data-rda-active-slide", "2");
      await heroPrevious.click();
      await expect(stage).toHaveAttribute("data-rda-active-slide", "1");
      await expect(cta).toBeVisible();
      await expect(cta).toHaveText("Ask About Classes");
      await expect(cta).toHaveAttribute("href", "#quick-sign-up");
      await expect(signup).toBeVisible();

      const signupDesign = await signup.evaluate((element) => {
        const tiles = element.querySelector<HTMLElement>(".rda-interest-options");
        const grid = element.querySelector<HTMLElement>(".ac-signup-grid");
        const columnCount = (value: string | undefined) =>
          value ? value.split(" ").filter(Boolean).length : 0;

        return {
          fieldIconCount: element.querySelectorAll(
            '[data-rda-signup-icon="name"], [data-rda-signup-icon="email"], [data-rda-signup-icon="phone"], [data-rda-signup-icon="notes"], [data-rda-signup-icon="note"], [data-rda-signup-icon="submit"]',
          ).length,
          howHeardOptionCount: element.querySelectorAll('input[type="radio"][name="How did you hear about us?"]').length,
          interestCheckboxCount: element.querySelectorAll('input[type="checkbox"][name="Interested classes[]"]').length,
          layoutColumnCount: grid ? columnCount(getComputedStyle(grid).gridTemplateColumns) : 0,
          optionColumnCount: tiles ? columnCount(getComputedStyle(tiles).gridTemplateColumns) : 0,
          optionIconCount: element.querySelectorAll(".rda-interest-option-icon[data-rda-signup-icon]").length,
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
        };
      });

      expect(signupDesign).toMatchObject({
        fieldIconCount: 6,
        howHeardOptionCount: 5,
        interestCheckboxCount: 8,
        layoutColumnCount: 2,
        optionColumnCount: 2,
        optionIconCount: 8,
        overflowX: 0,
      });

      const reviews = page.locator('[data-rda-home-review-highlights="true"]');
      const reviewCard = reviews.locator(".rda-review-photo-card").first();
      await expect(reviews.getByRole("heading", { name: "What Students Are Saying" })).toBeVisible();
      await expect(reviews.locator(".rda-review-photo-card")).toHaveCount(6);
      await reviewCard.scrollIntoViewIfNeeded();
      const readReviewCard = () =>
        reviewCard.evaluate((element) => {
          const image = element.querySelector<HTMLElement>("img");

          return {
            borderColor: getComputedStyle(element).borderColor,
            imageTransform: image ? getComputedStyle(image).transform : "",
            transform: getComputedStyle(element).transform,
          };
        });
      const reviewCardBefore = await readReviewCard();

      await reviewCard.hover({ force: true });
      await expect
        .poll(async () => {
          const hover = await readReviewCard();

          return [
            hover.borderColor !== reviewCardBefore.borderColor,
            hover.imageTransform !== reviewCardBefore.imageTransform,
            hover.transform !== reviewCardBefore.transform,
          ].filter(Boolean).length;
        })
        .toBeGreaterThanOrEqual(2);

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await cta.click();
      await expect(page).toHaveURL(/#quick-sign-up$/);

      // The section lands just below the sticky header, not hidden under it.
      await expect
        .poll(() =>
          page.evaluate(() => {
            const section = document.querySelector("#quick-sign-up")?.getBoundingClientRect();
            const header = document.querySelector(".rda-live-header")?.getBoundingClientRect();
            return section && header ? Math.round(section.top - header.bottom) : -999;
          }),
        )
        .toBeGreaterThanOrEqual(-2);
      const position = await signup.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { bottom: Math.round(rect.bottom), top: Math.round(rect.top) };
      });

      expect(position.top).toBeLessThan(140);
      expect(position.bottom).toBeGreaterThan(300);
    });

    test("homepage quick sign up stays mounted after client navigation", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const signup = page.locator("#quick-sign-up[data-rda-signup-section='true']");

      await expect(signup).toHaveCount(1);
      await expect(signup).toBeVisible();

      await page.locator("footer").getByRole("link", { name: "BLS / CPR" }).click();
      await expect(page).toHaveURL(/\/(?:bls%2Fcpr-1|bls-cpr-1)$/);
      await expect(page.locator('[data-rda-live-course="bls-cpr-1"]')).toBeVisible();

      await page.locator('header a[aria-label="Roseville Dental Academy"]').click();
      await expect(page).toHaveURL(`${localOrigin}/`, { timeout: 15_000 });
      await expect(signup).toHaveCount(1);
      await expect(signup).toBeVisible();
      await expect(signup.locator('form[data-rda-signup-form="true"]')).toHaveCount(1);

      await page.locator("[data-rda-home-hero-signup='true']").click();
      await expect(page).toHaveURL(/#quick-sign-up$/);
      await expect
        .poll(() => signup.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
        .toBeLessThan(140);
    });

    test("homepage course sections use React cards while preserving course copy and links", async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoSettled(page, "/");

      // No GoDaddy snapshot widgets remain on the React homepage.
      await expect(page.locator('[data-ux-widget], [class*="widget-"]')).toHaveCount(0);

      const reviews = page.locator('[data-rda-home-review-highlights="true"]');
      const tiktokFollow = page.locator('[data-rda-stable-widget="tiktok-follow"]');
      const courseSystem = page.locator('[data-rda-home-course-system="true"]');
      const schedule = page.locator('[data-rda-home-course-block="schedule"]');
      const board = page.locator('[data-rda-stable-widget="board"]');
      const gallery = page.locator('[data-rda-stable-widget="gallery"][data-rda-gallery-mode="home"]');
      const contact = page.locator(".rda-contact-section");

      for (const section of [reviews, tiktokFollow, courseSystem, schedule, board, gallery, contact]) {
        await expect(section).toBeVisible();
      }

      const pageOrder = await page.evaluate(() => {
        const selectors = [
          '[data-rda-home-hero="true"]',
          '[data-rda-home-review-highlights="true"]',
          '[data-rda-home-course-system="true"]',
          '[data-rda-home-course-block="schedule"]',
          "#quick-sign-up",
          '[data-rda-stable-widget="board"]',
          '[data-rda-stable-widget="gallery"][data-rda-gallery-mode="home"]',
          ".rda-contact-section",
        ];
        const nodes = selectors.map((selector) => document.querySelector(selector));

        return nodes.every(
          (node, index) =>
            node &&
            (index === 0 ||
              (nodes[index - 1]!.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0),
        );
      });

      expect(pageOrder).toBe(true);

      await expect(tiktokFollow.getByText("Follow along on TikTok", { exact: true })).toBeVisible();
      await expect(
        tiktokFollow.getByRole("heading", { name: "Help us reach 1,000 followers." }),
      ).toBeVisible();
      const tiktokButton = tiktokFollow.getByRole("link", { name: /Follow on TikTok/ });
      await expect(tiktokButton).toHaveAttribute(
        "href",
        "https://www.tiktok.com/@rosevilledentalacademy?_r=1&_t=ZP-96u9ZhtrfJu",
      );
      await expect(tiktokButton).toHaveAttribute("target", "_blank");
      await expect(tiktokButton).toHaveAttribute("rel", "noreferrer");
      const tiktokVideo = tiktokFollow.locator("video");
      // Lazy clip: muted, looping, inline, and only fetched once on screen.
      await expect(tiktokVideo).toHaveAttribute("loop", "");
      await expect(tiktokVideo).toHaveAttribute("playsinline", "");
      await expect(tiktokVideo).toHaveAttribute("preload", "none");
      await expect(tiktokVideo).toHaveJSProperty("muted", true);
      await expect(tiktokVideo).toHaveAttribute("data-src", "/assets/social/tiktok/homepage-follow-1000.mp4");
      await expect(tiktokVideo).toHaveAttribute("poster", "/assets/social/tiktok/homepage-follow-1000-poster.jpg");

      await expect(courseSystem.getByRole("heading", { name: "HeartCode BLS — $85" })).toBeVisible();
      await expect(
        courseSystem.getByRole("link", { name: "Link for online portion" }),
      ).toHaveAttribute("href", "https://shopcpr.heart.org/heartcode-bls");
      await expect(schedule.getByRole("heading", { name: "Upcoming Class Schedule" })).toBeVisible();
      await expect(
        schedule.getByText("Dates are penciled in and may change; admissions will confirm current availability.", { exact: true }),
      ).toBeVisible();
      for (const month of ["06", "07", "08", "09"]) {
        await expect(schedule.locator(`time[datetime^="2026-${month}"]`)).toHaveCount(0);
      }
      await expect(schedule.locator('time[datetime="2026-10-12"]')).toHaveCount(0);
      await expect(schedule.locator('time[datetime="2026-10-17"]')).toBeVisible();
      await expect(schedule.locator('time[datetime="2026-10-24"]')).toBeVisible();

      const courseCards = courseSystem.locator(".ac-course-card");
      await expect(courseCards).toHaveCount(5);
      for (const [name, href, price] of [
        ["BLS / CPR", "/bls-cpr-1", "$85"],
        ["Infection Control", "/infection-control", "$395"],
        ["Radiation Safety", "/radiation-safety", "$695"],
        ["Coronal Polish", "/coronal-polish", "$500"],
        ["Pit & Fissure Sealants", "/sealants", "$550"],
      ]) {
        const card = courseCards.filter({ hasText: name });
        await expect(card).toHaveAttribute("href", href);
        await expect(card).toContainText(price);
      }

      await expect(courseSystem.getByRole("heading", { name: "Dental Assisting Program" })).toBeVisible();
      await expect(courseSystem.locator(".ac-program-price")).toContainText("$2,500");
      await expect(
        courseSystem.getByText("Pick one class day — Monday, Friday, or Saturday — plus one internship day"),
      ).toBeVisible();
      await expect(courseSystem.locator(".ac-next-dates")).toContainText("November 20, 2026");
      await expect(courseSystem.locator(".ac-next-dates")).toContainText("December 5, 2026");
      await expect(courseSystem.getByRole("link", { name: "Explore the program" })).toHaveAttribute(
        "href",
        "/dental-assisting-program",
      );
      await expect(courseSystem.getByRole("link", { name: "Book Appointment Here" })).toHaveAttribute(
        "href",
        "https://n95fittests.com/",
      );
      await expect(courseSystem.getByRole("link", { name: "Ask about coaching" })).toHaveAttribute("href", "/contact");
      await expect(courseSystem.getByRole("heading", { name: "Ergonomics & patient care for hygienists" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "A career that opens doors" })).toBeVisible();
      await expect(board.getByRole("heading", { name: "Dental Board Course Details" })).toBeVisible();
      await expect(board.locator(".ac-board-item")).toHaveCount(3);

      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflowX).toBe(0);

      const courseCard = courseCards.first();
      await courseCard.scrollIntoViewIfNeeded();
      const readCourseCardStyle = () =>
        courseCard.evaluate((element) => {
          const image = element.querySelector<HTMLElement>("img");

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

      expect(courseCardHover.height).toBe(courseCardBefore.height);
      expect(courseCardHover.width).toBe(courseCardBefore.width);
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
      const heroStage = page.locator('[data-rda-home-hero="true"] [data-rda-active-slide]');
      const mobileHeroNext = page.locator("[data-rda-home-hero-next]");
      const whatsapp = page.locator(".rda-whatsapp-fab");

      await expect(heroCta).toBeVisible();
      await expect(heroStage).toHaveClass(/is-interactive/);
      await expect(mobileHeroNext).toBeVisible();
      await expect(mobileHeroNext).toBeEnabled();
      await mobileHeroNext.click();
      await expect(heroStage).toHaveAttribute("data-rda-active-slide", "1");
      await expect(page.locator('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]')).toHaveCount(0);
      await expect(page.locator("elevenlabs-convai")).toHaveCount(0);
      await expect(whatsapp).toBeVisible();
      await expect(whatsapp).toHaveCSS("pointer-events", "auto");

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      const overlap = await page.evaluate(() => {
        const cta = document.querySelector<HTMLElement>("[data-rda-home-hero-signup='true']");
        const fab = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
        const ctaRect = cta?.getBoundingClientRect();
        const fabRect = fab?.getBoundingClientRect();

        return Boolean(
          ctaRect &&
            fabRect &&
            ctaRect.left < fabRect.right &&
            ctaRect.right > fabRect.left &&
            ctaRect.top < fabRect.bottom &&
            ctaRect.bottom > fabRect.top,
        );
      });
      expect(overlap).toBe(false);

      await heroCta.click();
      await expect(page).toHaveURL(/#quick-sign-up$/);
      await expect
        .poll(() => page.locator("#quick-sign-up").evaluate((element) => Math.round(element.getBoundingClientRect().top)))
        .toBeLessThan(140);
      const signupTop = await page.locator("#quick-sign-up").evaluate((element) => {
        return Math.round(element.getBoundingClientRect().top);
      });
      expect(signupTop).toBeGreaterThanOrEqual(0);

      const mobileSignupDesign = await page.locator("#quick-sign-up").evaluate((element) => {
        const form = element.querySelector<HTMLElement>("[data-rda-signup-form='true']");
        const options = element.querySelector<HTMLElement>(".rda-interest-options");
        const option = element.querySelector<HTMLElement>(".rda-interest-option");
        const fields = element.querySelector<HTMLElement>(".rda-signup-fields");
        const formRect = form?.getBoundingClientRect();
        const optionRect = option?.getBoundingClientRect();
        const columnCount = (value: string | undefined) =>
          value ? value.split(" ").filter(Boolean).length : 0;

        return {
          fieldColumnCount: fields ? columnCount(getComputedStyle(fields).gridTemplateColumns) : 0,
          formWidth: formRect ? Math.round(formRect.width) : 0,
          optionColumnCount: options ? columnCount(getComputedStyle(options).gridTemplateColumns) : 0,
          optionWidth: optionRect ? Math.round(optionRect.width) : 0,
          overflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
        };
      });

      expect(mobileSignupDesign.fieldColumnCount).toBe(1);
      expect(mobileSignupDesign.optionColumnCount).toBe(1);
      expect(mobileSignupDesign.optionWidth).toBeLessThanOrEqual(mobileSignupDesign.formWidth);
      expect(mobileSignupDesign.overflowX).toBe(0);

      const mobileTiktok = page.locator('[data-rda-stable-widget="tiktok-follow"]');
      await mobileTiktok.scrollIntoViewIfNeeded();
      await expect(mobileTiktok).toBeVisible();
      const mobileTiktokDesign = await mobileTiktok.evaluate((element) => {
        const button = element.querySelector<HTMLElement>('[data-rda-social-button="tiktok"]');
        const video = element.querySelector<HTMLElement>("video");
        const sectionRect = element.getBoundingClientRect();
        const buttonRect = button?.getBoundingClientRect();
        const videoRect = video?.getBoundingClientRect();

        return {
          buttonFitsSection: buttonRect
            ? buttonRect.left >= sectionRect.left && buttonRect.right <= sectionRect.right
            : false,
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
        overflowX: 0,
        videoFitsSection: true,
      });

      // Course cards become a horizontal swipe rail instead of a tall stack.
      const mobileCourseRail = await page.locator('[data-rda-home-course-system="true"] .ac-course-grid').evaluate(
        (element) => ({
          display: getComputedStyle(element).display,
          overflowX: getComputedStyle(element).overflowX,
          scrolls: element.scrollWidth > element.clientWidth,
          pageOverflowX:
            element.ownerDocument.documentElement.scrollWidth -
            element.ownerDocument.documentElement.clientWidth,
        }),
      );

      expect(mobileCourseRail).toMatchObject({
        display: "flex",
        overflowX: "auto",
        pageOverflowX: 0,
        scrolls: true,
      });
    });

    test("mobile menu and long homepage sections use progressive disclosure", async ({ page }) => {
      await page.setViewportSize({ height: 844, width: 390 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoSettled(page, "/");

      await page.getByRole("button", { name: "Hamburger Site Navigation Icon" }).click();
      const mobileMenu = page.locator('[data-rda-mobile-menu="true"]');
      await expect(mobileMenu.getByRole("link", { name: "Ask About Classes" })).toBeVisible();
      for (const course of ["Dental Assisting Program", "BLS/CPR", "Infection Control", "Sealants"]) {
        await expect(mobileMenu.getByRole("link", { name: new RegExp(course) }).first()).toBeVisible();
      }

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
      await expect(mobileMenu).toHaveCount(0);

      // Review cards swipe sideways; the full library lives on /reviews.
      const reviews = page.locator('[data-rda-home-review-highlights="true"]');
      const reviewRail = reviews.locator(".ac-review-grid");
      await expect(reviewRail.locator(".rda-review-photo-card")).toHaveCount(6);
      expect(await reviewRail.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
      await expect(reviews.locator('[data-rda-review-marquee="true"]')).toBeAttached();
      await expect(reviews.getByRole("link", { name: /Read all 77 reviews/ })).toHaveAttribute("href", "/reviews");
      await expect(reviews.getByRole("link", { name: /Open on Google/ })).toHaveAttribute(
        "href",
        /maps\.google\.com/,
      );

      await expect(page.locator('[data-rda-stable-widget="board"] .ac-board-item')).toHaveCount(3);

      const galleryTiles = page.locator(".ac-gallery-home .ac-gallery-tile");
      await expect(galleryTiles).toHaveCount(9);
      await galleryTiles.first().click();
      const lightbox = page.getByRole("dialog", { name: "Photo viewer" });
      await expect(lightbox).toBeVisible();
      await expect(lightbox).toContainText("1 / 9");
      await lightbox.getByRole("button", { name: "Next photo" }).click();
      await expect(lightbox).toContainText("2 / 9");
      await expect(page.locator(".rda-whatsapp-fab")).toBeHidden();
      await lightbox.getByRole("button", { name: "Close photo viewer" }).click();
      await expect(lightbox).toBeHidden();
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
          const target = document.querySelector<HTMLElement>(selector);
          const event = new MouseEvent("click", { bubbles: true, cancelable: true });

          // Exercise the delegated analytics listener without allowing anchor
          // defaults to navigate away before the remaining actions run.
          event.preventDefault();
          target?.dispatchEvent(event);
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
          'input[type="checkbox"][name="Interested classes[]"]',
        );
        if (signupForm && firstInterest) {
          firstInterest.click();
          await waitForReactUpdate();
          signupForm.dispatchEvent(
            new CustomEvent("rda:lead-form-success", {
              bubbles: true,
              detail: {
                submissionId: "accepted-analytics-test",
                leadEventId: "accepted-analytics-test",
                acceptedFields: Array.from(new FormData(signupForm).entries()).filter(
                  ([name, value]) =>
                    ["Source page", "Interested classes[]", "course_interest", "page_path"].includes(name) &&
                    typeof value === "string",
                ),
              },
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
          __rdaTestOpenAIEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
          fbq?: (...args: unknown[]) => void;
          gtag?: (...args: unknown[]) => void;
          oaiq?: (...args: unknown[]) => void;
          va?: (...args: unknown[]) => void;
        };

        analyticsWindow.__rdaTestGtagEvents = [];
        analyticsWindow.__rdaTestMetaEvents = [];
        analyticsWindow.__rdaTestOpenAIEvents = [];
        analyticsWindow.__rdaTestVercelEvents = [];
        analyticsWindow.gtag = (...args: unknown[]) => {
          analyticsWindow.__rdaTestGtagEvents?.push(args);
        };
        analyticsWindow.fbq = (...args: unknown[]) => {
          analyticsWindow.__rdaTestMetaEvents?.push(args);
        };
        analyticsWindow.oaiq = (...args: unknown[]) => {
          analyticsWindow.__rdaTestOpenAIEvents?.push(args);
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
          __rdaTestOpenAIEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };

        return {
          ga: analyticsWindow.__rdaTestGtagEvents ?? [],
          openai: analyticsWindow.__rdaTestOpenAIEvents ?? [],
          vercel: analyticsWindow.__rdaTestVercelEvents ?? [],
        };
      });
      const openAIPageViewEvents = initialEvents.openai.filter(
        (event) => event[0] === "measure" && event[1] === "page_viewed",
      );
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
      expect(openAIPageViewEvents).toEqual([]);

      await form.locator('input[name="Name"]').fill("Private Test Student");
      await form.locator('input[name="_replyto"]').fill("private-test@example.com");
      await form.locator('input[name="Phone"]').fill("916-555-1234");
      await form.locator('textarea[name="Notes"]').fill("Private note should not be tracked");
      await form
        .locator('select[name="Renewal focus"]')
        .selectOption("Pit and Fissure Sealants");
      await form.locator("label.rda-ad-form-consent").click();
      await expect(form.locator('input[name="Consent to contact"]')).toBeChecked();
      await form.locator(".ac-pill", { hasText: "Facebook or Instagram ad" }).click();

      await page.evaluate(async () => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestOpenAIEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
          gtag?: (...args: unknown[]) => void;
          va?: (...args: unknown[]) => void;
        };

        analyticsWindow.__rdaTestGtagEvents = [];
        analyticsWindow.__rdaTestOpenAIEvents = [];
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
          __rdaTestOpenAIEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };

        return {
          ga: analyticsWindow.__rdaTestGtagEvents ?? [],
          meta: analyticsWindow.__rdaTestMetaEvents ?? [],
          openai: analyticsWindow.__rdaTestOpenAIEvents ?? [],
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
      const openAILeadEvents = events.openai.filter(
        (event) => event[0] === "measure" && event[1] === "lead_created",
      );
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
      const omitPageUrls = (value: unknown): unknown => {
        if (Array.isArray(value)) {
          return value.map(omitPageUrls);
        }

        if (value && typeof value === "object") {
          return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
              .filter(([key]) => key !== "page_location" && key !== "page_path")
              .map(([key, entry]) => [key, omitPageUrls(entry)]),
          );
        }

        return value;
      };
      const trackedPayload = JSON.stringify(
        omitPageUrls({
          contactEvent,
          gaLeadEvent,
          gaSubmitEvent,
          leadEvent,
          openAILeadEvents,
          vercelLeadEvent,
          viewContentEvent,
        }),
      ).toLowerCase();

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
        content_name: "call",
        how_heard: "phone",
        lead_source: "phone",
      });
      expect(contactEvent).not.toHaveProperty("ad_id");
      expect(contactEvent).not.toHaveProperty("utm_content");
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
      expect(openAILeadEvents).toEqual([]);
      await expect.poll(() => attributionReceipt).not.toBeNull();
      const receivedReceipt = attributionReceipt as unknown as Record<string, unknown>;
      expect(receivedReceipt).toMatchObject({
        formId: "xzdkgaeg", leadEventId: leadEventIds[0], schemaVersion: 1,
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
      expect(formspreeRequestBody).toContain('name="How did you hear about us?"');
      expect(formspreeRequestBody).toContain("Facebook or Instagram ad");
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
          __rdaTestOpenAIEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
          fbq?: (...args: unknown[]) => void;
          gtag?: (...args: unknown[]) => void;
          oaiq?: (...args: unknown[]) => void;
          va?: (...args: unknown[]) => void;
        };

        analyticsWindow.__rdaTestGtagEvents = [];
        analyticsWindow.__rdaTestMetaEvents = [];
        analyticsWindow.__rdaTestOpenAIEvents = [];
        analyticsWindow.__rdaTestVercelEvents = [];
        analyticsWindow.gtag = (...args: unknown[]) => {
          analyticsWindow.__rdaTestGtagEvents?.push(args);
        };
        analyticsWindow.fbq = (...args: unknown[]) => {
          analyticsWindow.__rdaTestMetaEvents?.push(args);
        };
        analyticsWindow.oaiq = (...args: unknown[]) => {
          analyticsWindow.__rdaTestOpenAIEvents?.push(args);
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
      await form.locator("label.rda-ad-form-consent").click();
      await expect(form.locator('input[name="Consent to contact"]')).toBeChecked();
      await form.locator(".ac-pill", { hasText: "Facebook or Instagram ad" }).click();
      await page.evaluate(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestOpenAIEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };

        analyticsWindow.__rdaTestGtagEvents = [];
        analyticsWindow.__rdaTestMetaEvents = [];
        analyticsWindow.__rdaTestOpenAIEvents = [];
        analyticsWindow.__rdaTestVercelEvents = [];
      });

      await form.getByRole("button", { name: landingPage.primaryCtaLabel }).click();
      await expect(page.locator('[data-rda-lead-form-error="true"]')).toBeVisible();

      const eventNames = await page.evaluate(() => {
        const analyticsWindow = window as Window & {
          __rdaTestGtagEvents?: unknown[][];
          __rdaTestMetaEvents?: unknown[][];
          __rdaTestOpenAIEvents?: unknown[][];
          __rdaTestVercelEvents?: unknown[][];
        };

        return {
          ga: (analyticsWindow.__rdaTestGtagEvents ?? []).map((event) => event[1]),
          meta: (analyticsWindow.__rdaTestMetaEvents ?? []).map((event) => event[1]),
          openai: (analyticsWindow.__rdaTestOpenAIEvents ?? []).map((event) => event[1]),
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
      expect(eventNames.openai).not.toContain("lead_created");
      expect(eventNames.vercel).not.toContain("lead_form_submit");
      expect(receiptRequests).toBe(0);
    });

    test("ChatGPT Ads remains blocked without explicit consent after accepted-lead notifications", async ({ page }) => {
      await page.addInitScript(() => {
        const adsWindow = window as Window & {
          __rdaTestOpenAIEvents?: unknown[][];
          oaiq?: (...args: unknown[]) => void;
        };
        adsWindow.__rdaTestOpenAIEvents = [];
        adsWindow.oaiq = (...args: unknown[]) => {
          adsWindow.__rdaTestOpenAIEvents?.push(args);
        };
      });

      await gotoSettled(page, "/lp/dental-assisting-enroll");
      await page.evaluate(() => {
        const adsWindow = window as Window & { __rdaTestOpenAIEvents?: unknown[][] };
        const detail = { leadEventId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" };
        adsWindow.__rdaTestOpenAIEvents = [];
        document.dispatchEvent(new CustomEvent("rda:lead-form-success", { detail }));
        document.dispatchEvent(new CustomEvent("rda:lead-form-success", { detail }));
      });

      const leadEvents = await page.evaluate(
        () =>
          (
            (window as Window & { __rdaTestOpenAIEvents?: unknown[][] })
              .__rdaTestOpenAIEvents ?? []
          ).filter((event) => event[0] === "measure" && event[1] === "lead_created"),
      );

      expect(leadEvents).toEqual([]);
    });

    for (const privacyCase of ["global privacy control", "denied consent cookie"] as const) {
      test(`ChatGPT Ads measurement stays blocked with ${privacyCase}`, async ({
        context,
        page,
      }) => {
        const landingPage =
          adLandingPages.find((candidate) => candidate.slug === "dental-assisting-enroll") ??
          adLandingPages[0];

        if (privacyCase === "denied consent cookie") {
          await context.addCookies([
            {
              name: "rda_analytics_consent",
              url: localOrigin,
              value: "denied",
            },
          ]);
        }

        await page.addInitScript((enableGpc) => {
          if (enableGpc) {
            Object.defineProperty(navigator, "globalPrivacyControl", {
              configurable: true,
              value: true,
            });
          }

          const adsWindow = window as Window & {
            __rdaTestOpenAIEvents?: unknown[][];
            oaiq?: (...args: unknown[]) => void;
          };
          adsWindow.__rdaTestOpenAIEvents = [];
          adsWindow.oaiq = (...args: unknown[]) => {
            adsWindow.__rdaTestOpenAIEvents?.push(args);
          };
        }, privacyCase === "global privacy control");

        await gotoSettled(page, landingPage.path);
        await page.evaluate(() => {
          document.dispatchEvent(
            new CustomEvent("rda:lead-form-success", {
              detail: { leadEventId: "11111111-2222-4333-8444-555555555555" },
            }),
          );
        });

        const events = await page.evaluate(
          () =>
            (window as Window & { __rdaTestOpenAIEvents?: unknown[][] })
              .__rdaTestOpenAIEvents ?? [],
        );

        expect(events).toEqual([]);
      });
    }

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
      await expect(enrollForm.locator('input[name="lead_source"]')).toHaveValue("website");
      await expect(enrollForm.locator('input[name="how-heard"]')).toHaveValue("website");

      await enrollForm.locator('input[name="Name"]').fill("Saturday First Touch");
      await enrollForm.locator('input[name="_replyto"]').fill("saturday-first-touch@example.com");
      await enrollForm.locator('input[name="Phone"]').fill("916-555-0112");
      await enrollForm.locator("label.rda-ad-form-consent").click();
      await expect(enrollForm.locator('input[name="Consent to contact"]')).toBeChecked();
      await enrollForm.locator(".ac-pill", { hasText: "Facebook or Instagram ad" }).click();
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
      await expect(signupForm.locator('input[name="lead_source"]')).toHaveValue("website");
      await expect(signupForm.locator('input[name="how-heard"]')).toHaveValue("website");
      await expect(signupForm.locator('input[name="landing_page"]')).toHaveValue(enrollPage.path);

      await signupForm.locator(".ac-tile").first().click();
      await signupForm.locator(".ac-pill", { hasText: "Google search" }).click();
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
      await expect(programForm.locator('input[name="course_interest"]')).toHaveCount(1);

      await gotoSettled(page, "/contact");
      const contactForm = page.locator('form[data-rda-contact-form="true"]');
      await expect(contactForm.locator('input[name="utm_content"]')).toHaveValue(utmContent);
      await expect(contactForm.locator('input[name="ad_id"]')).toHaveValue(adId);
      await expect(contactForm.locator('input[name="lead_source"]')).toHaveValue("website");
      await expect(contactForm.locator('input[name="how-heard"]')).toHaveValue("website");

      const whatsappHref = await page.locator("[data-rda-whatsapp]").first().getAttribute("href");
      const decodedWhatsAppHref = decodeURIComponent(whatsappHref ?? "");
      expect(whatsappHref).toContain(`wa.me/19165075157`);
      expect(decodedWhatsAppHref).toContain("how-heard: whatsapp");
      expect(decodedWhatsAppHref).toContain("lead_source=whatsapp");
      expect(decodedWhatsAppHref).not.toContain("saturday_academy_sep12");
      expect(decodedWhatsAppHref).not.toContain(utmContent);
      expect(decodedWhatsAppHref).not.toContain(adId);

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
            content_name: "call",
            how_heard: "phone",
            lead_source: "phone",
          }),
          expect.objectContaining({
            content_name: "whatsapp",
            how_heard: "whatsapp",
            lead_source: "whatsapp",
          }),
        ]),
      );
      expect(contactEvents.map((event) => event[2])).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ ad_id: adId }),
          expect.objectContaining({ utm_content: utmContent }),
        ]),
      );
    });

    test("every public Formspree form emits first-touch stamp fields", async ({
      page,
    }) => {
      const requiredFields = [
        "ad_id",
        "campaign_id",
        "how-heard",
        "lead_source",
        "utm_campaign",
        "utm_content",
        "utm_id",
        "utm_medium",
        "utm_source",
        "utm_source_platform",
        "utm_term",
        "fbclid",
        "gclid",
      ];
      const publicForms = [
        { open: async () => undefined, path: "/", selector: 'form[data-rda-signup-form="true"]' },
        {
          // /contact shows its message form without a toggle.
          open: async () => undefined,
          path: "/contact",
          selector: 'form[data-rda-contact-form="true"]',
        },
        {
          open: async () => undefined,
          path: "/dental-assisting-program",
          selector: 'form[data-rda-signup-form="true"]',
        },
        {
          open: async () => undefined,
          path: "/lp/dental-assisting-enroll",
          selector: 'form[data-rda-landing-form="true"]',
        },
        {
          open: async () => undefined,
          path: "/lp/coronal-sealants-renewal",
          selector: 'form[data-rda-landing-form="true"]',
        },
      ];

      for (const publicForm of publicForms) {
        await gotoSettled(page, publicForm.path);
        await publicForm.open();
        const form = page.locator(publicForm.selector).first();

        await expect(form).toBeVisible();
        await expect(form).toHaveAttribute("action", /https:\/\/formspree\.io\/f\/(xzdkgaeg|mpqgyjjg)/);

        for (const field of requiredFields) {
          await expect(form.locator(`input[name="${field}"]`)).toHaveCount(1);
        }

        await expect(form.locator('input[name="lead_source"]')).toHaveValue("website");
        await expect(form.locator('input[name="how-heard"]')).toHaveValue("website");
      }

      await gotoSettled(page, "/");
      const whatsappHref = await page.locator("[data-rda-whatsapp]").first().getAttribute("href");
      const decodedWhatsAppHref = decodeURIComponent(whatsappHref ?? "");
      expect(decodedWhatsAppHref).toContain("how-heard: whatsapp");
      expect(decodedWhatsAppHref).toContain("lead_source=whatsapp");
      expect(decodedWhatsAppHref).not.toMatch(/utm_|ad_id=/);
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
      // Interests are native checkboxes, so selections submit without JavaScript.
      const checkboxes = form.locator('input[type="checkbox"][name="Interested classes[]"]');
      const selectedPayloads = form.locator('input[name="Interested classes[]"]:checked');
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
      await expect(form.getByText("What would you like to learn?")).toBeVisible();
      await expect(form.locator('input[type="radio"][name="How did you hear about us?"]')).toHaveCount(5);
      await expect(form.getByText("Next open date: November 20, 2026")).toHaveCount(1);
      await expect(form.getByText("Next open date: September 12, 2026 (Saturday Academy)")).toHaveCount(0);
      await expect(form.getByText("Next open date: September 12, 2026", { exact: true })).toHaveCount(0);
      await expect(form.getByText("Next open date: July 18, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: August 1, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: September 5, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: October 17, 2026")).toHaveCount(1);
      await expect(form.getByText("Next open date: November 7, 2026")).toHaveCount(1);
      await expect(form.getByText("Next open date: August 8, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: October 24, 2026")).toHaveCount(0);
      await expect(form.getByText("Next open date: November 14, 2026")).toHaveCount(2);
      await expect(form.getByText("By appointment")).toBeVisible();
      await expect(form.getByText("Team can recommend a starting point")).toBeVisible();
      await expect(submit).toHaveText(/Request next steps/);
      await expect(selectedPayloads).toHaveCount(0);

      await name.fill("Test Student");
      await email.fill("student@example.com");
      await phone.fill("916-555-0123");
      await submit.click();
      await expect(form.getByText("Choose at least one class or certification.")).toBeVisible();
      await expect(form.getByText("Please tell us how you heard about us.")).toBeVisible();

      const dentalAssisting = form.getByRole("checkbox", { name: "Dental Assisting Program" });
      await expect(dentalAssisting).toBeVisible();
      await expect(form.getByRole("checkbox", { name: "BLS / CPR" })).toBeVisible();
      await expect(form.getByLabel("Front Office Program")).toHaveCount(0);
      await form.locator(".ac-tile", { hasText: "Dental Assisting Program" }).click();
      await expect(dentalAssisting).toBeChecked();
      await expect(selectedPayloads).toHaveCount(1);
      await expect(selectedPayloads.first()).toHaveValue("Dental Assisting Program");

      await gotoSettled(page, "/infection-control");
      const coursePage = page.locator('[data-rda-live-course="infection-control"]');
      await expect(coursePage.locator('[data-rda-quick-fact="true"]').first()).toContainText("$395*");
      await expect(coursePage.locator(".rda-course-policy-note")).toContainText(
        "If Roseville Dental Academy cancels, students may choose another available course date or a refund.",
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
      await expect(page.getByText("Office closed; scheduled classes only").first()).toBeVisible();
      await expect(
        page.getByText("Front-desk hours only. Monday, Friday, and Saturday are separate class schedules").first(),
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

      // The full /contact page shows the message form straight away.
      const formContainer = page.locator('[data-aid="CONTACT_FORM_CONTAINER_REND"]').first();
      const form = formContainer.locator('form[data-rda-contact-form="true"]');
      const email = form.locator('input[name="_replyto"]').first();

      await expect(page.locator('[data-rda-contact-form-toggle="true"]')).toHaveCount(0);
      await expect(formContainer).toBeVisible();
      await expect(form).toHaveAttribute("action", "https://formspree.io/f/xzdkgaeg");
      await expect(email).toHaveAttribute("type", "email");
      await expect(email).toHaveAttribute("required", "");
      await expect(form.locator('input[name="name"]')).toHaveAttribute("required", "");
      await expect(form.locator('textarea[name="message"]')).toHaveAttribute("required", "");
      await expect(form.locator('input[type="radio"][name="How did you hear about us?"]')).toHaveCount(5);

      const popupPromise = page.waitForEvent("popup", { timeout: 8_000 });
      await page.getByRole("link", { name: "Get directions" }).click();
      const popup = await popupPromise;

      await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
      expect(popup.url()).toContain("google.com/maps/dir/");
      await popup.close();

      // On the homepage the compact contact block keeps the form one tap away.
      await gotoSettled(page, "/");
      const toggle = page.locator('[data-rda-contact-form-toggle="true"]');
      const homeFormContainer = page.locator('[data-aid="CONTACT_FORM_CONTAINER_REND"]');

      await expect(homeFormContainer).toBeHidden();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(homeFormContainer).toBeVisible();
      await homeFormContainer.getByRole("button", { name: "Cancel" }).click();
      await expect(homeFormContainer).toBeHidden();
    });

    test("mobile contact map stacks without creating blank space", async ({ page }) => {
      await page.setViewportSize({ height: 844, width: 390 });
      await gotoSettled(page, "/contact");

      const mobileContactLayout = await page.locator(".rda-contact-section").evaluate((section) => {
        const grid = section.querySelector<HTMLElement>(".ac-contact-grid");
        const copy = section.querySelector<HTMLElement>(".ac-contact-info");
        const map = section.querySelector<HTMLElement>(".rda-contact-map-card");
        const next = section.querySelector<HTMLElement>(".ac-contact-form");
        const read = (element: HTMLElement | null) => {
          const rect = element?.getBoundingClientRect();

          return rect
            ? {
                bottom: Math.round(rect.bottom),
                height: Math.round(rect.height),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
              }
            : null;
        };
        const gridColumns = grid ? getComputedStyle(grid).gridTemplateColumns : "";

        return {
          blankAfterMap:
            next && map
              ? Math.round(next.getBoundingClientRect().top - map.getBoundingClientRect().bottom)
              : 999,
          columnCount: gridColumns.split(" ").filter(Boolean).length,
          copy: read(copy),
          map: read(map),
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      expect(mobileContactLayout.columnCount).toBe(1);
      expect(mobileContactLayout.copy?.width ?? 0).toBeGreaterThanOrEqual(320);
      expect(mobileContactLayout.map?.width ?? 0).toBeGreaterThanOrEqual(320);
      expect(mobileContactLayout.map?.height ?? 0).toBeGreaterThanOrEqual(260);
      expect(mobileContactLayout.map?.top ?? 0).toBeGreaterThan(mobileContactLayout.copy?.bottom ?? 0);
      expect(mobileContactLayout.blankAfterMap).toBeGreaterThanOrEqual(0);
      expect(mobileContactLayout.blankAfterMap).toBeLessThanOrEqual(72);
      expect(mobileContactLayout.overflowX).toBe(0);
    });
  });

  test.describe("Dental Assisting promo", () => {
    test("banner promotes the next upcoming DA start", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/");

      const banner = page.locator("[data-rda-promo-banner='true']");

      await expect(banner).toBeVisible();
      await expect(banner).toContainText("Next Dental Assisting class starts Friday, Nov 20.");
      await expect(banner).toContainText("Saturday class starts Dec 5.");
      await expect(banner).toHaveAttribute("href", activeSitePromo.ctaHref);
      expect(activeSitePromo.ctaHref).toBe("/lp/dental-assisting-enroll");
    });

    test("popup appears, uses the enroll CTA, and stays dismissed", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/", { allowPromo: true });

      const dialog = page.locator("[data-rda-promo-dialog='true']");

      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(dialog.getByText("Dental Assisting class", { exact: true })).toBeVisible();
      await expect(
        dialog.getByRole("heading", {
          name: "Next class starts Friday, Nov 20. Saturday class starts Dec 5.",
        }),
      ).toBeVisible();
      await expect(
        dialog.getByText("Ask admissions which schedule fits your week.", { exact: false }),
      ).toBeVisible();

      const cta = dialog.locator("[data-rda-promo-cta='true']");

      await expect(cta).toHaveAttribute("href", "/lp/dental-assisting-enroll");
      await expect(cta).toHaveText("Ask about Nov 20");

      await dialog.getByRole("button", { name: "Dismiss class announcement" }).click();
      await expect(dialog).toHaveCount(0);

      const stored = await page.evaluate(
        (key) => window.localStorage.getItem(key),
        activeSitePromo.storageKey,
      );

      expect(stored).toBe("dismissed");

      await gotoSettled(page, "/contact", { allowPromo: true });
      await expect(page.locator("[data-rda-promo-dialog='true']")).toHaveCount(0);
    });

    test("popup does not auto-open after a lead form field has focus", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await page.goto(`${localOrigin}/`, {
        timeout: 120_000,
        waitUntil: "domcontentloaded",
      });

      const nameField = page.locator('form[data-rda-signup-form="true"] input[name="Name"]').first();
      const submit = page.locator('form[data-rda-signup-form="true"] button[type="submit"]').first();

      await nameField.waitFor({ state: "visible" });
      await nameField.focus();
      await expect(nameField).toBeFocused();
      await page.waitForTimeout(2_500);

      await expect(page.locator("[data-rda-promo-dialog='true']")).toHaveCount(0);
      await expect(submit).toBeVisible();
    });

    test("popup stays closed after a lead-form field is focused then blurred before the timer", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await page.goto(`${localOrigin}/`, {
        timeout: 120_000,
        waitUntil: "domcontentloaded",
      });

      const nameField = page.locator('form[data-rda-signup-form="true"] input[name="Name"]').first();

      await nameField.waitFor({ state: "visible" });
      // Focus after hydration so the promo's focus listener is attached.
      await expect(page.locator('header [data-rda-theme-toggle="true"]').first()).not.toHaveAttribute(
        "data-theme-state",
        "unknown",
      );
      await nameField.focus();
      await expect(nameField).toBeFocused();
      await nameField.blur();
      await expect(nameField).not.toBeFocused();
      await page.waitForTimeout(2_500);

      await expect(page.locator("[data-rda-promo-dialog='true']")).toHaveCount(0);
    });

    test("popup does not open or steal focus when a lead-form field is focused early", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await page.addInitScript(() => {
        const selector = [
          'form[data-rda-signup-form] input[name="Name"]',
          'form[data-rda-contact-form] input[name="Name"]',
        ].join(",");

        const tryFocus = () => {
          const field = document.querySelector(selector);
          if (!(field instanceof HTMLElement) || document.activeElement === field) {
            return Boolean(field);
          }
          field.focus({ preventScroll: true });
          return document.activeElement === field;
        };

        const start = () => {
          if (tryFocus()) {
            return;
          }
          const observer = new MutationObserver(() => {
            if (tryFocus()) {
              observer.disconnect();
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        };

        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", start, { once: true });
        } else {
          start();
        }
      });

      await page.goto(`${localOrigin}/infection-control`, {
        timeout: 120_000,
        waitUntil: "domcontentloaded",
      });

      const nameField = page.locator('form[data-rda-signup-form="true"] input[name="Name"]').first();

      await nameField.waitFor({ state: "visible" });
      await expect(nameField).toBeFocused();
      await page.waitForTimeout(2_500);

      await expect(page.locator("[data-rda-promo-dialog='true']")).toHaveCount(0);
      await expect(nameField).toBeFocused();
    });

    test("popup is not shown on ad landing pages", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/lp/dental-assisting-enroll", { allowPromo: true });

      await expect(page.locator("[data-rda-promo-banner='true']")).toHaveCount(0);
      await expect(page.locator("[data-rda-promo-dialog='true']")).toHaveCount(0);
      await expect(page.locator('form[data-rda-landing-form="true"]')).toBeVisible();
    });

    test("DA enroll LP lists November 20 as the next start after October 12 filled", async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 1280 });
      await gotoSettled(page, "/lp/dental-assisting-enroll");

      const dates = page.locator(".rda-ad-date-list");

      await expect(page.getByText("Next start: November 20, 2026")).toBeVisible();
      await expect(dates.getByText("September 12, 2026 (Saturday Academy)")).toHaveCount(0);
      await expect(dates.getByText("October 12, 2026")).toHaveCount(0);
      await expect(dates.getByText("November 20, 2026")).toBeVisible();
      await expect(dates.getByText("December 5, 2026")).toBeVisible();
      await expect(
        page.getByText("Monday, Friday, and Saturday class schedules are separate options; students attend one, not all three."),
      ).toBeVisible();

      const startSelect = page.locator('select[name="Preferred start date"]');

      await expect(startSelect).toBeVisible();
      await expect(startSelect.locator("option", { hasText: "September 12, 2026 (Saturday Academy)" })).toHaveCount(0);
      await expect(startSelect.locator("option", { hasText: "October 12, 2026" })).toHaveCount(0);
      await expect(startSelect.locator("option", { hasText: "November 20, 2026" })).toHaveCount(1);
    });
  });

  test.describe("paid Meta landers", () => {
    for (const slug of PAID_TRAFFIC_LANDER_SLUGS) {
      test(`${slug} uses stripped chrome and a first-viewport form`, async ({ page }) => {
        await page.setViewportSize({ height: 900, width: 390 });
        await gotoSettled(page, `/lp/${slug}`);

        await expect(page.locator("[data-rda-ad-lander='true']").first()).toBeVisible();
        await expect(page.locator("[data-rda-promo-banner='true']")).toHaveCount(0);
        await expect(page.locator("[data-rda-contact-us='true']")).toHaveCount(0);
        await expect(page.locator('[aria-label="Hamburger Site Navigation Icon"]')).toHaveCount(0);
        await expect(page.locator("elevenlabs-convai")).toHaveCount(0);
        await expect(page.locator("[data-rda-whatsapp]")).toHaveCount(0);
        await expect(page.locator('img[data-rda-course-gallery-image="true"]')).toHaveCount(0);
        await expect(page.locator('form[data-rda-landing-form="true"]')).toBeVisible();
        await expect(page.locator('input[name="Consent to contact"]')).toBeVisible();
        await expect(page.locator('a[href^="tel:"]').first()).toBeVisible();

        const formInViewport = await page.locator("#ad-lead-form").evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        });
        expect(formInViewport).toBe(true);
      });
    }

    test("GA4 config keeps the query string on paid landers", async ({ page }) => {
      await gotoSettled(
        page,
        "/lp/dental-assisting-enroll?utm_content=test123&fbclid=meta_preview_click",
      );

      const analytics = await page.evaluate(() => {
        const bootstrap = document.querySelector("#rda-google-analytics");
        const gtagSrc = document.querySelector(
          'script[src^="https://www.googletagmanager.com/gtag/js?id="]',
        );
        const pixel = document.querySelector("#rda-meta-pixel");
        const dataLayer = (window as Window & { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
        const config = dataLayer.find((entry) => {
          if (!entry || typeof entry !== "object") return false;
          const command = entry as ArrayLike<unknown>;
          return command[0] === "config" && typeof command[2] === "object" && command[2] !== null;
        }) as ["config", string, { page_location?: string; page_path?: string }] | undefined;

        return {
          bootstrapInHead: bootstrap?.parentElement?.tagName === "HEAD",
          gtagSrcInHead: gtagSrc?.parentElement?.tagName === "HEAD",
          hasSearchInBootstrap: Boolean(bootstrap?.textContent?.includes("window.location.search")),
          pageLocation: config?.[2]?.page_location ?? "",
          pagePath: config?.[2]?.page_path ?? "",
          pixelInHead: pixel?.parentElement?.tagName === "HEAD",
          pixelHasPageView: Boolean(pixel?.textContent?.includes("fbq('track', 'PageView')")),
        };
      });

      expect(analytics.hasSearchInBootstrap).toBe(true);
      expect(analytics.bootstrapInHead || analytics.gtagSrcInHead).toBe(true);
      expect(analytics.pixelInHead || analytics.pixelHasPageView).toBe(true);
      expect(analytics.pageLocation).toContain("utm_content=test123");
      expect(analytics.pagePath).toContain("utm_content=test123");
      expect(analytics.pageLocation).toContain("fbclid=meta_preview_click");
    });
  });
});
