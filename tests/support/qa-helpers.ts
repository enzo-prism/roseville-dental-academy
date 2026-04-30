import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { BrowserContext, Page, TestInfo } from "@playwright/test";

import frozenManifest from "@/snapshot/live/manifest.json";

import fixtures from "./qa-routes.json";

export const localOrigin = process.env.LOCAL_ORIGIN ?? "http://127.0.0.1:3000";
export const localUrl = new URL(localOrigin);
export const baselineDir = resolve(
  process.cwd(),
  process.env.BASELINE_DIR ?? "tests/baselines/live",
);
export const routeMappings = fixtures.routes;
export const aliasMappings = fixtures.aliases;
export const visualMappings = fixtures.visualRoutes;
export const uxDevices = fixtures.uxDevices;
export const visualViewports = fixtures.visualViewports;
export const primaryNavLabels = fixtures.primaryNavLabels;
export const coreWarmRoutes = fixtures.coreWarmRoutes;
export const snapshotRoutes = frozenManifest.routes;
export const elevenLabsAgentId = "agent_6301kn20gh9denavkvn1bg9krf54";
export const elevenLabsScriptSrc = "https://unpkg.com/@elevenlabs/convai-widget-embed";

export type RuntimeDiagnostics = {
  blockingResourceErrors: Array<{ detail: string; kind: "request-failed" | "response"; url: string }>;
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: Array<{ errorText: string; url: string }>;
};

export type UiScan = {
  aboveFoldPlaceholderImages: Array<{ aid: string; index: number; src: string }>;
  headerOverlap: boolean;
  missingPrimaryNavLabels: string[];
  overflowIssues: Array<{ label: string; left: number; right: number; width: number }>;
  overflowX: number;
  stickyHeight: number;
  visiblePrimaryNavLabels: string[];
};

export type PageSnapshot = {
  diagnostics: RuntimeDiagnostics;
  status: number;
  title: string;
  bodyText: string;
  ui: UiScan;
  visibleAboveFoldImages: string[];
  visibleButtons: string[];
  visibleImages: string[];
  visibleInputs: string[];
  visibleLinks: Array<{ href: string; text: string }>;
};

type SnapshotRenderData = {
  bodyText: string;
  title: string;
  visibleAboveFoldImages: string[];
  visibleButtons: string[];
  visibleImages: string[];
  visibleInputs: string[];
  visibleLinks: Array<{ href: string; text: string }>;
};

export async function blockElevenLabsWidgetScript(context: BrowserContext) {
  await context.route(`${elevenLabsScriptSrc}**`, async (route) => {
    await route.fulfill({
      body: "",
      contentType: "text/javascript",
      status: 204,
    });
  });
}

function normalizeTextValue(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeParityBodyText(value: string) {
  return normalizeTextValue(value).replace(/\bMORE INFORMATION\b\s*/gi, "").trim();
}

export function normalizeVisibleText(text: string) {
  return normalizeTextValue(text);
}

export function normalizeHref(rawHref: string, baseUrl: string) {
  if (!rawHref) {
    return "";
  }

  const href = rawHref.trim();

  if (!href) {
    return "";
  }

  if (href.startsWith("#")) {
    return href;
  }

  try {
    const resolved = new URL(href, baseUrl);
    const isInternal =
      resolved.hostname === "rosevilledentalacademy.com" ||
      resolved.hostname === "www.rosevilledentalacademy.com" ||
      resolved.hostname === "localhost" ||
      resolved.hostname === localUrl.hostname ||
      resolved.hostname === "127.0.0.1";

    if (!isInternal) {
      return resolved.href;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return href;
  }
}

function normalizeAssetHref(rawHref: string, baseUrl: string) {
  if (!rawHref) {
    return "";
  }

  if (/^data:/i.test(rawHref)) {
    return rawHref;
  }

  try {
    const resolved = new URL(rawHref, baseUrl);

    if (resolved.origin === localUrl.origin) {
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    }

    return resolved.href;
  } catch {
    return rawHref;
  }
}

function normalizeManifestRouteKey(pathname: string) {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export function findSnapshotRoute(pathname: string) {
  const normalized = normalizeManifestRouteKey(pathname);

  return snapshotRoutes.find((route) => {
    const candidates = [route.route, ...route.aliases];
    return candidates.some((candidate) => normalizeManifestRouteKey(candidate) === normalized);
  });
}

export function readBaselineJson<T>(relativePath: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), "utf8")) as T;
}

export function readBaselineBinary(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath));
}

export function getContentBaseline(localPath: string) {
  const route = findSnapshotRoute(localPath);

  if (!route) {
    throw new Error(`No frozen manifest route found for ${localPath}`);
  }

  return {
    route,
    snapshot: readBaselineJson<{
      aboveFoldImages: string[];
      bodyText: string;
      buttons: string[];
      images: string[];
      inputs: string[];
      links: Array<{ href: string; text: string }>;
      status: number;
      title: string;
    }>(route.contentBaselinePath),
  };
}

export function getVisualBaseline(localPath: string, viewportLabel: string) {
  const route = findSnapshotRoute(localPath);

  if (!route) {
    throw new Error(`No frozen manifest route found for ${localPath}`);
  }

  const baselinePath = route.visualBaselines[
    viewportLabel as keyof typeof route.visualBaselines
  ];

  if (!baselinePath) {
    throw new Error(`No visual baseline registered for ${localPath} on ${viewportLabel}`);
  }

  return {
    baselinePath,
    image: readBaselineBinary(baselinePath),
    route,
  };
}

export function getVisualMaskSelectors(localPath: string) {
  const route = findSnapshotRoute(localPath);

  if (!route) {
    return [];
  }

  return (route.visualMasks ?? [])
    .filter((mask) => mask.type === "selector" && Boolean(mask.value))
    .map((mask) => mask.value);
}

export function sanitizeLabel(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export function isPlaceholderImage(value: string) {
  return /^data:image\/gif;base64/i.test(value) || /transparent_placeholder/i.test(value);
}

function isRequiredLocalResource(urlString: string) {
  try {
    const url = new URL(urlString);
    const sameOrigin = url.origin === localUrl.origin;

    if (!sameOrigin) {
      return false;
    }

    return (
      url.pathname === "/sw.js" ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname.startsWith("/g/api/")
    );
  } catch {
    return false;
  }
}

function createRuntimeDiagnostics(page: Page) {
  const state: RuntimeDiagnostics = {
    blockingResourceErrors: [],
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
  };

  const onConsole = (message: { text(): string; type(): string }) => {
    if (message.type() === "error") {
      state.consoleErrors.push(message.text());
    }
  };

  const onPageError = (error: Error) => {
    state.pageErrors.push(error.message);
  };

  const onRequestFailed = (request: { failure(): { errorText: string } | null; url(): string }) => {
    const failure = request.failure();

    if (!failure) {
      return;
    }

    const item = {
      errorText: failure.errorText,
      url: request.url(),
    };

    state.requestFailures.push(item);

    if (isRequiredLocalResource(request.url())) {
      state.blockingResourceErrors.push({
        detail: failure.errorText,
        kind: "request-failed",
        url: request.url(),
      });
    }
  };

  const onResponse = (response: { status(): number; url(): string }) => {
    if (response.status() < 400 || !isRequiredLocalResource(response.url())) {
      return;
    }

    state.blockingResourceErrors.push({
      detail: `${response.status()}`,
      kind: "response",
      url: response.url(),
    });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  return {
    dispose() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);
    },
    state,
  };
}

export async function settleMirrorPage(page: Page) {
  await page.waitForLoadState("load").catch(() => undefined);

  await page
    .waitForFunction(
      () => {
        function normalizeValue(value: string) {
          return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        }

        return normalizeValue(document.body?.innerText ?? "").length > 0;
      },
      undefined,
      {
        timeout: 12_000,
      },
    )
    .catch(() => undefined);

  await page
    .waitForFunction(
      ({ labels }) => {
        function normalizeValue(value: string) {
          return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        }

        function isPlaceholderValue(value: string) {
          return /^data:image\/gif;base64/i.test(value) || /transparent_placeholder/i.test(value);
        }

        function isVisible(element: HTMLElement) {
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

        const headerControls = Array.from(
          document.querySelectorAll<HTMLElement>("header a, header button, header [role='button']"),
        );

        const visibleHeaderLabels = headerControls
          .filter((element) => isVisible(element))
          .map((element) => normalizeValue(element.innerText || element.textContent || ""))
          .filter(Boolean);

        const hasHeader = headerControls.length > 0;
        const navReady =
          !hasHeader ||
          labels.every((label) =>
            visibleHeaderLabels.some((visibleLabel) => visibleLabel.toLowerCase() === label.toLowerCase()),
          );

        const placeholderAboveFold = Array.from(document.images)
          .map((image) => {
            const rect = image.getBoundingClientRect();
            const src = image.currentSrc || image.getAttribute("src") || "";
            return {
              inViewport: rect.bottom > window.innerHeight * -0.1 && rect.top < window.innerHeight * 1.05,
              src,
            };
          })
          .some((entry) => entry.inViewport && isPlaceholderValue(entry.src));

        return navReady && !placeholderAboveFold;
      },
      { labels: primaryNavLabels },
      { timeout: 8_000 },
    )
    .catch(() => undefined);

  await page
    .waitForFunction(
      () => {
        const canvases = Array.from(
          document.querySelectorAll<HTMLCanvasElement>('canvas[data-aid="PDF_PREVIEW_RENDERED"]'),
        );

        return (
          canvases.length === 0 ||
          canvases.every((canvas) => canvas.getBoundingClientRect().width <= Math.min(window.innerWidth, 500))
        );
      },
      undefined,
      {
        timeout: 6_000,
      },
    )
    .catch(() => undefined);

  await page
    .waitForFunction(
      () => {
        function normalizeValue(value: string) {
          return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        }

        const reviews = document.querySelector<HTMLElement>(".widget-reviews");
        const appointments = document.querySelector<HTMLElement>(".widget-appointments");
        const contactForm = document.querySelector<HTMLElement>(
          '[data-aid="CONTACT_FORM_CONTAINER_REND"]',
        );
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
      {
        timeout: 15_000,
      },
    )
    .catch(() => undefined);

  await page.waitForTimeout(3_000);
}

async function prepareFullPageForVisual(page: Page) {
  const viewport = page.viewportSize() ?? { height: 900, width: 1280 };
  const step = Math.max(500, Math.floor(viewport.height * 0.7));
  let previousHeight = 0;

  for (let pass = 0; pass < 2; pass += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);

    for (let y = 0; y <= height; y += step) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await page.waitForTimeout(175);
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

export async function scanUi(page: Page): Promise<UiScan> {
  return page.evaluate((labels) => {
    function normalizeValue(value: string) {
      return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }

    function isVisible(element: HTMLElement) {
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

    function isClippedByOverflowAncestor(element: HTMLElement) {
      const rect = element.getBoundingClientRect();
      let parent = element.parentElement;

      while (parent) {
        const style = window.getComputedStyle(parent);
        const parentRect = parent.getBoundingClientRect();
        const overflowClips =
          /(hidden|clip|auto|scroll)/i.test(style.overflowX) ||
          /(hidden|clip|auto|scroll)/i.test(style.overflow);

        if (
          overflowClips &&
          (rect.right <= parentRect.left + 1 || rect.left >= parentRect.right - 1)
        ) {
          return true;
        }

        parent = parent.parentElement;
      }

      return false;
    }

    const viewportWidth = window.innerWidth;
    const headerControls = Array.from(
      document.querySelectorAll<HTMLElement>("header a, header button, header [role='button'], nav a, nav button"),
    );

    const visibleHeaderLabels = headerControls
      .filter((element) => isVisible(element))
      .map((element) => normalizeValue(element.innerText || element.textContent || ""))
      .filter(Boolean);
    const visiblePrimaryNavLabels = visibleHeaderLabels.filter((visibleLabel) =>
      labels.some((label) => visibleLabel.toLowerCase() === label.toLowerCase()),
    );

    const headerPresent = headerControls.length > 0;
    const missingPrimaryNavLabels = headerPresent
      ? labels.filter(
          (label) =>
            !visiblePrimaryNavLabels.some(
              (visibleLabel) => visibleLabel.toLowerCase() === label.toLowerCase(),
            ),
        )
      : [];

    const aboveFoldPlaceholderImages = Array.from(document.images)
      .map((image, index) => {
        const rect = image.getBoundingClientRect();
        const src = image.currentSrc || image.getAttribute("src") || "";
        return {
          aid: image.getAttribute("data-aid") || image.alt || `image-${index}`,
          index,
          inViewport: rect.bottom > window.innerHeight * -0.1 && rect.top < window.innerHeight * 1.05,
          src,
        };
      })
      .filter(
        (entry) =>
          entry.inViewport &&
          (/^data:image\/gif;base64/i.test(entry.src) || /transparent_placeholder/i.test(entry.src)),
      )
      .map(({ aid, index, src }) => ({ aid, index, src }));

    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          "a",
          "button",
          "input",
          "textarea",
          "select",
          "[role='button']",
          "[role='link']",
          "[role='combobox']",
          "form",
          "fieldset",
        ].join(","),
      ),
    );

    const overflowIssues = candidates
      .filter((element) => isVisible(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const label =
          normalizeValue(element.innerText || element.getAttribute("aria-label") || element.tagName) || "element";

        return {
          label,
          left: Math.round(rect.left),
          position: style.position,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          clippedByAncestor: isClippedByOverflowAncestor(element),
        };
      })
      .filter((entry) => {
        if (entry.clippedByAncestor) {
          return false;
        }

        if (entry.position === "fixed" && entry.width >= viewportWidth - 2) {
          return false;
        }

        return entry.left < -1 || entry.right > viewportWidth + 1;
      })
      .map(({ label, left, right, width }) => ({ label, left, right, width }));

    const sticky = Array.from(document.querySelectorAll<HTMLElement>("*")).find(
      (node) => window.getComputedStyle(node).position === "sticky",
    );
    const firstHeading = document.querySelector<HTMLElement>("h1, main h1, main h2");
    const stickyRect = sticky?.getBoundingClientRect();
    const headingRect = firstHeading?.getBoundingClientRect();

    return {
      aboveFoldPlaceholderImages,
      headerOverlap:
        stickyRect && headingRect ? headingRect.top < stickyRect.bottom - 12 : false,
      missingPrimaryNavLabels,
      overflowIssues,
      overflowX: document.documentElement.scrollWidth - viewportWidth,
      stickyHeight: stickyRect ? Math.round(stickyRect.height) : 0,
      visiblePrimaryNavLabels,
    };
  }, primaryNavLabels);
}

export async function captureSnapshot(
  page: Page,
  url: string,
  options?: {
    settle?: boolean;
    viewport?: { height: number; width: number };
  },
): Promise<PageSnapshot> {
  if (options?.viewport) {
    await page.setViewportSize(options.viewport);
  }

  const runtime = createRuntimeDiagnostics(page);
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });

  if (options?.settle !== false) {
    await settleMirrorPage(page);
  }

  const ui = await scanUi(page);
  const data = await captureSnapshotRenderData(page, url);

  runtime.dispose();

  return {
    bodyText: normalizeParityBodyText(data.bodyText),
    diagnostics: runtime.state,
    status: response?.status() ?? 0,
    title: data.title,
    ui,
    visibleAboveFoldImages: data.visibleAboveFoldImages.map((value) =>
      normalizeAssetHref(value, url),
    ),
    visibleButtons: data.visibleButtons,
    visibleImages: data.visibleImages.map((value) => normalizeAssetHref(value, url)),
    visibleInputs: data.visibleInputs,
    visibleLinks: data.visibleLinks
      .map(({ href, text }) => ({
        href: normalizeHref(href, url),
        text,
      }))
      .filter(({ href, text }) => !(href === "#" && /^more information$/i.test(text))),
  };
}

async function captureSnapshotRenderData(page: Page, currentUrl: string): Promise<SnapshotRenderData> {
  return page.evaluate((urlValue) => {
    function normalizeValue(value: string) {
      return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }

    function isVisible(element: HTMLElement) {
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

    const visibleInputs = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]), textarea',
      ),
    )
      .filter((field) => isVisible(field))
      .map((field) => field.getAttribute("placeholder") || field.getAttribute("aria-label") || "")
      .filter(Boolean);

    const visibleButtons = Array.from(
      document.querySelectorAll<HTMLElement>('button, input[type="submit"], input[type="button"]'),
    )
      .filter((button) => isVisible(button))
      .map((button) => {
        if ("value" in button && typeof button.value === "string" && button.value) {
          return normalizeValue(button.value);
        }

        return normalizeValue(button.innerText || button.textContent || "");
      })
      .filter(Boolean);

    const visibleLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .filter((anchor) => isVisible(anchor))
      .map((anchor) => ({
        href: anchor.getAttribute("href") || "",
        text: normalizeValue(anchor.textContent || ""),
      }))
      .filter(({ href, text }) => href || text);

    const visibleImages = Array.from(document.images)
      .map((image) => image.currentSrc || image.src)
      .filter(Boolean);

    const visibleAboveFoldImages = Array.from(document.images)
      .filter((image) => isVisible(image))
      .map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          inViewport: rect.bottom > window.innerHeight * -0.1 && rect.top < window.innerHeight * 1.05,
          src: image.currentSrc || image.src,
        };
      })
      .filter((entry) => entry.inViewport)
      .map((entry) => entry.src)
      .filter(Boolean);

    return {
      bodyText: normalizeValue(document.body.innerText),
      title: document.title,
      url: urlValue,
      visibleAboveFoldImages,
      visibleButtons,
      visibleImages,
      visibleInputs,
      visibleLinks,
    };
  }, currentUrl);
}

export async function captureVisual(
  page: Page,
  url: string,
  viewport: { height: number; width: number },
  maskSelectors: string[] = [],
) {
  await page.setViewportSize(viewport);
  const runtime = createRuntimeDiagnostics(page);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await settleMirrorPage(page);
  await prepareFullPageForVisual(page);
  const ui = await scanUi(page);
  const mask = [];

  for (const selector of maskSelectors) {
    const locator = page.locator(selector);

    if ((await locator.count()) > 0) {
      mask.push(locator.first());
    }
  }

  const screenshot = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    mask,
  });
  runtime.dispose();

  return {
    diagnostics: runtime.state,
    screenshot,
    ui,
  };
}

export function countDifferingPixels(live: Buffer, local: Buffer) {
  const tempDir = mkdtempSync(join(tmpdir(), "roseville-parity-"));
  const livePath = join(tempDir, "live.png");
  const localPath = join(tempDir, "local.png");

  writeFileSync(livePath, live);
  writeFileSync(localPath, local);

  try {
    const output = execFileSync(
      "python3",
      [
        "-c",
        `
from PIL import Image, ImageChops
import sys

left = Image.open(sys.argv[1]).convert("RGBA")
right = Image.open(sys.argv[2]).convert("RGBA")

if left.size != right.size:
    width = max(left.width, right.width)
    height = max(left.height, right.height)
    padded_left = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    padded_right = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    padded_left.paste(left, (0, 0))
    padded_right.paste(right, (0, 0))
    left = padded_left
    right = padded_right

background = Image.new("RGBA", left.size, (255, 255, 255, 255))
left = Image.alpha_composite(background, left).convert("RGB")
right = Image.alpha_composite(background, right).convert("RGB")

scale = 0.25
comparison_size = (
    max(1, int(left.width * scale)),
    max(1, int(left.height * scale)),
)
left = left.resize(comparison_size, Image.Resampling.LANCZOS)
right = right.resize(comparison_size, Image.Resampling.LANCZOS)

diff = ImageChops.difference(left, right)
def is_masked(pixel):
    red, green, blue = pixel
    return red >= 200 and blue >= 200 and green <= 80

count = 0

for left_pixel, right_pixel, diff_pixel in zip(left.getdata(), right.getdata(), diff.getdata()):
    if is_masked(left_pixel) or is_masked(right_pixel):
        continue

    if max(diff_pixel) > 40:
        count += 1

print(count)
        `.trim(),
        livePath,
        localPath,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();

    const numericMetric = Number.parseInt(output, 10);

    if (Number.isFinite(numericMetric)) {
      return numericMetric;
    }

    throw new Error(`Unable to parse pixel diff output: ${output}`);
  } catch (error) {
    const diffError = error as {
      stderr?: Buffer | string;
      stdout?: Buffer | string;
    };
    const rawMetric = `${diffError.stderr ?? diffError.stdout ?? ""}`.trim();
    const numericMetric = Number.parseInt(rawMetric, 10);

    if (Number.isFinite(numericMetric)) {
      return numericMetric;
    }

    throw error;
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

export function buildTextDiff(liveText: string, localText: string) {
  if (liveText === localText) {
    return "No text diff.";
  }

  let index = 0;

  while (index < liveText.length && index < localText.length && liveText[index] === localText[index]) {
    index += 1;
  }

  return [
    `First difference at index ${index}`,
    "",
    `Live:  ${liveText.slice(Math.max(0, index - 160), index + 160)}`,
    `Local: ${localText.slice(Math.max(0, index - 160), index + 160)}`,
  ].join("\n");
}

export function writeJsonArtifact(testInfo: TestInfo, filename: string, payload: unknown) {
  const artifactPath = testInfo.outputPath(filename);
  writeFileSync(artifactPath, JSON.stringify(payload, null, 2));
  return artifactPath;
}

export function writeTextArtifact(testInfo: TestInfo, filename: string, contents: string) {
  const artifactPath = testInfo.outputPath(filename);
  writeFileSync(artifactPath, contents);
  return artifactPath;
}

export function writeBinaryArtifact(testInfo: TestInfo, filename: string, contents: Buffer) {
  const artifactPath = testInfo.outputPath(filename);
  writeFileSync(artifactPath, contents);
  return artifactPath;
}

export function writeSuiteSummary(filename: string, payload: unknown) {
  const outputDir = resolve(process.cwd(), "test-results", "qa");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, filename), JSON.stringify(payload, null, 2));
}
