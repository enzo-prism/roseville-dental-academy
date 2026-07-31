import { chromium } from "playwright";

import {
  BASELINE_DIR,
  LIVE_ORIGIN,
  VISUAL_VIEWPORTS,
  getMaskSelectors,
  loadAssetMap,
  loadManifest,
  normalizeHrefForBaseline,
  normalizeTextValue,
  normalizeVisibleAssetUrl,
  writeBinaryFile,
  writeJson,
} from "./live-clone-shared.mjs";

const CAPTURE_ORIGIN = process.env.BASELINE_CAPTURE_ORIGIN ?? LIVE_ORIGIN;
const ELEVENLABS_SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

async function settlePage(page) {
  await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => undefined);

  await page
    .waitForFunction(
      () => (document.body?.innerText || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().length > 0,
      undefined,
      { timeout: 12_000 },
    )
    .catch(() => undefined);

  await page
    .waitForFunction(
      () => {
        const inViewportPlaceholder = Array.from(document.images).some((image) => {
          const rect = image.getBoundingClientRect();
          const src = image.currentSrc || image.getAttribute("src") || "";
          const inViewport =
            rect.bottom > window.innerHeight * -0.1 && rect.top < window.innerHeight * 1.05;
          return (
            inViewport &&
            (/^data:image\/gif;base64/i.test(src) || /transparent_placeholder/i.test(src))
          );
        });

        return !inViewportPlaceholder;
      },
      undefined,
      { timeout: 8_000 },
    )
    .catch(() => undefined);

  await page
    .waitForFunction(
      () => {
        const canvases = Array.from(
          document.querySelectorAll('canvas[data-aid="PDF_PREVIEW_RENDERED"]'),
        );

        return (
          canvases.length === 0 ||
          canvases.every((canvas) => canvas.getBoundingClientRect().width <= Math.min(window.innerWidth, 500))
        );
      },
      undefined,
      { timeout: 6_000 },
    )
    .catch(() => undefined);

  await page
    .waitForFunction(
      () => {
        const normalizeValue = (value) =>
          value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

        const reviews = document.querySelector(".widget-reviews");
        const appointments = document.querySelector(".widget-appointments");
        const contactForm = document.querySelector('[data-aid="CONTACT_FORM_CONTAINER_REND"]');
        const reviewsText = normalizeValue(reviews?.innerText || reviews?.textContent || "");
        const appointmentsText = normalizeValue(
          appointments?.innerText || appointments?.textContent || "",
        );
        const contactFormRect = contactForm?.getBoundingClientRect();

        const reviewsReady = !reviews || /Read full review/i.test(reviewsText);
        const appointmentsReady =
          !appointments || /New services are coming soon/i.test(appointmentsText);
        const contactFormReady =
          !contactForm ||
          window.getComputedStyle(contactForm).display === "none" ||
          !contactFormRect ||
          contactFormRect.width === 0 ||
          contactFormRect.height === 0;

        return reviewsReady && appointmentsReady && contactFormReady;
      },
      undefined,
      { timeout: 15_000 },
    )
    .catch(() => undefined);

  await page.waitForTimeout(3_000);
}

async function collectMaskLocators(page, selectors) {
  const locators = [];

  for (const selector of selectors) {
    const locator = page.locator(selector);

    if ((await locator.count()) > 0) {
      locators.push(locator.first());
    }
  }

  return locators;
}

async function prepareFullPageForVisual(page) {
  const viewport = page.viewportSize() ?? { height: 900, width: 1280 };
  const step = Math.max(500, Math.floor(viewport.height * 0.7));
  let previousHeight = 0;

  for (let pass = 0; pass < 2; pass += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);

    for (let y = 0; y <= height; y += step) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await page.waitForTimeout(175);
      await page
        .waitForFunction(
          () =>
            Array.from(document.images)
              .filter((image) => {
                const rect = image.getBoundingClientRect();
                const style = window.getComputedStyle(image);

                return (
                  style.display !== "none" &&
                  style.visibility !== "hidden" &&
                  rect.width > 0 &&
                  rect.height > 0 &&
                  rect.bottom > window.innerHeight * -0.1 &&
                  rect.top < window.innerHeight * 1.1
                );
              })
              .every((image) => image.complete && image.naturalWidth > 0),
          undefined,
          { timeout: 1_500 },
        )
        .catch(() => undefined);
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(350);

    const nextHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    if (Math.abs(nextHeight - previousHeight) < 20) {
      break;
    }

    previousHeight = nextHeight;
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1_000);
}

async function hideFloatingThirdPartyWidgets(page) {
  await page
    .addStyleTag({
      content: `
        .widget-appointments,
        .widget-reviews,
        .widget-trustedsite,
        .live-elevenlabs-widget,
        [data-rda-whatsapp] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `,
    })
    .catch(() => undefined);
}

function normalizeParityBodyText(value) {
  return normalizeTextValue(value)
    .replace(/\bMORE INFORMATION\b\s*/gi, "")
    // WhatsApp click-to-chat CTAs are additive UI excluded from parity.
    .replace(/\bMessage Us on WhatsApp\b\s*/gi, "")
    .trim();
}

async function captureContentSnapshot(page, url, assetMap) {
  const response = await page.goto(url, {
    timeout: 120_000,
    waitUntil: "domcontentloaded",
  });

  await settlePage(page);

  const raw = await page.evaluate(() => {
    const additiveParitySelectors = ["[data-rda-course-reviews]"];

    function isVisible(element) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function isAdditiveParityElement(element) {
      return additiveParitySelectors.some((selector) => element.closest(selector));
    }

    function getParityBodyText() {
      const removedElements = [];

      for (const selector of additiveParitySelectors) {
        for (const element of Array.from(document.body.querySelectorAll(selector))) {
          if (!element.parentNode) {
            continue;
          }

          const marker = document.createComment("rda-parity-excluded");
          const parent = element.parentNode;

          parent.replaceChild(marker, element);
          removedElements.push({ element, marker, parent });
        }
      }

      const bodyText = document.body?.innerText || "";

      for (const { element, marker, parent } of removedElements.reverse()) {
        parent.replaceChild(element, marker);
      }

      return bodyText;
    }

    const inputs = Array.from(
      document.querySelectorAll('input:not([type="hidden"]), textarea'),
    )
      .filter((field) => isVisible(field))
      .filter((field) => !isAdditiveParityElement(field))
      .map((field) => field.getAttribute("placeholder") || field.getAttribute("aria-label") || "")
      .filter(Boolean);

    const buttons = Array.from(
      document.querySelectorAll('button, input[type="submit"], input[type="button"]'),
    )
      .filter((button) => isVisible(button))
      .filter((button) => !isAdditiveParityElement(button))
      .map((button) => {
        if (button instanceof HTMLInputElement && typeof button.value === "string" && button.value) {
          return button.value;
        }

        return button.innerText || button.textContent || "";
      })
      .filter(Boolean);

    const links = Array.from(document.querySelectorAll("a[href]"))
      .filter((anchor) => isVisible(anchor))
      .filter((anchor) => !isAdditiveParityElement(anchor))
      .map((anchor) => ({
        href: anchor.getAttribute("href") || "",
        text: anchor.textContent || "",
      }))
      .filter(({ href, text }) => href || text);

    const images = Array.from(document.images)
      .filter((image) => !isAdditiveParityElement(image))
      .map((image) => image.currentSrc || image.src)
      .filter(Boolean);

    const aboveFoldImages = Array.from(document.images)
      .filter((image) => isVisible(image))
      .filter((image) => !isAdditiveParityElement(image))
      .map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          inViewport:
            rect.bottom > window.innerHeight * -0.1 && rect.top < window.innerHeight * 1.05,
          src: image.currentSrc || image.src,
        };
      })
      .filter((entry) => entry.inViewport)
      .map((entry) => entry.src)
      .filter(Boolean);

    return {
      aboveFoldImages,
      bodyText: getParityBodyText(),
      buttons,
      images,
      inputs,
      links,
      title: document.title,
    };
  });

  return {
    aboveFoldImages: raw.aboveFoldImages
      .map((value) => normalizeVisibleAssetUrl(value, url, assetMap))
      .filter(Boolean),
    bodyText: normalizeParityBodyText(raw.bodyText),
    buttons: raw.buttons.map((value) => normalizeTextValue(value)).filter(Boolean),
    images: raw.images
      .map((value) => normalizeVisibleAssetUrl(value, url, assetMap))
      .filter(Boolean),
    inputs: raw.inputs.map((value) => normalizeTextValue(value)).filter(Boolean),
    links: raw.links
      .map(({ href, text }) => ({
        href: normalizeHrefForBaseline(href, url, assetMap),
        text: normalizeTextValue(text),
      }))
      .filter(({ href, text }) => !(href === "#" && /^more information$/i.test(text)))
      // WhatsApp click-to-chat links are additive contact UI excluded from parity.
      .filter(({ href }) => !/wa\.me/i.test(href)),
    status: response?.status() ?? 0,
    title: normalizeTextValue(raw.title),
  };
}

// Mirror of waitForFontsReady in tests/support/qa-helpers.ts. A baseline
// captured before the self-hosted next/font faces apply bakes in fallback
// metrics, which then read as a large diff against any correctly-fonted run.
// Keep both barriers in place or baselines and comparisons drift apart again.
async function waitForFontsReady(page) {
  await page
    .waitForFunction(() => document.fonts.status === "loaded", undefined, {
      timeout: 15_000,
    })
    .catch(() => undefined);
}

async function captureVisualBaseline(page, url, maskSelectors, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(url, {
    timeout: 120_000,
    waitUntil: "domcontentloaded",
  });
  await settlePage(page);
  await waitForFontsReady(page);
  await prepareFullPageForVisual(page);
  await hideFloatingThirdPartyWidgets(page);

  return page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    mask: await collectMaskLocators(page, maskSelectors),
  });
}

async function main() {
  const manifest = await loadManifest();
  const assetMap = await loadAssetMap();
  const browser = await chromium.launch({ headless: true });
  const summary = [];

  try {
    for (const route of manifest.routes) {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      });

      try {
        await page.route(`${ELEVENLABS_SCRIPT_SRC}**`, async (requestRoute) => {
          await requestRoute.fulfill({
            body: "",
            contentType: "text/javascript",
            status: 204,
          });
        });

        const url = `${CAPTURE_ORIGIN}${route.sourcePath}`;
        const content = await captureContentSnapshot(page, url, assetMap);
        await writeJson(route.contentBaselinePath, content);

        for (const [viewportLabel, viewport] of Object.entries(route.visualBaselines ?? {})) {
          const targetPath = route.visualBaselines[viewportLabel];

          if (!targetPath) {
            continue;
          }

          const screenshot = await captureVisualBaseline(
            page,
            url,
            getMaskSelectors(route),
            VISUAL_VIEWPORTS[viewportLabel],
          );

          await writeBinaryFile(targetPath, screenshot);
        }

        summary.push({
          id: route.id,
          status: "updated",
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  await writeJson(`${BASELINE_DIR}/refresh-summary.json`, {
    captureOrigin: CAPTURE_ORIGIN,
    generatedAt: new Date().toISOString(),
    liveOrigin: LIVE_ORIGIN,
    results: summary,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
