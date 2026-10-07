import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";

import { adLandingPages, isPaidTrafficLanderSlug } from "@/lib/ad-landing-pages";
import { isPrivateSiteRoute } from "@/lib/private-site-routes";
import { resourceArticles, RESOURCES_BASE_PATH } from "@/lib/resource-articles";
import {
  SEASONAL_FLYBY_ATTRIBUTE,
  SEASONAL_FLYBY_DURATION_MS,
  SEASONAL_FLYBY_TARGET,
  SEASONAL_OPT_OUT_STORAGE_KEY,
  SEASONAL_OPT_OUT_VALUE,
  SEASONAL_PEAK_ATTRIBUTE,
  SEASONAL_SCOPE_ATTRIBUTE,
  SEASONAL_SCRIPT_MARKER,
  SEASONAL_THEME_ATTRIBUTE,
  activeSeasonalTheme,
  buildSeasonalThemeScript,
  getSeasonalFlybyStorageKey,
  getSeasonalLocalDate,
  getSeasonalPeekStorageKey,
  halloween2026,
  isSeasonalThemeActive,
  isSeasonalThemeCurrent,
  type SeasonalTheme,
} from "@/lib/site-seasonal";

import { localOrigin, suppressSeasonalTheme, suppressSitePromo } from "./support/qa-helpers";

// The seasonal layer is the one thing every other suite opts out of
// (suppressSeasonalTheme in tests/support/qa-helpers.ts). This spec pins the
// browser clock instead, so it behaves the same in any month and timezone.
// Once the season is over, builds ship no seasonal script or markup
// (activeSeasonalTheme is null), so the on-state browser checks skip while the
// pure logic and out-of-season checks keep running.

const MID_OCTOBER = "2026-10-15T10:00:00-07:00";
const PEAK_DAY = "2026-10-31T10:00:00-07:00";
const DAY_BEFORE_PEAK = "2026-10-30T10:00:00-07:00";
const AFTER_SEASON = "2026-11-15T10:00:00-08:00";
const GHOST_LABEL = "Release the Halloween bats";
const PEEK_KEY = getSeasonalPeekStorageKey(halloween2026);
// Banner moon breakpoint (globals.css "Seasonal layer", banner section).
const MOON_MIN_WIDTH = 900;
const SEASONAL_ASSET_PATH = "/assets/seasonal/";
const RETIRED = !activeSeasonalTheme;
const RETIRED_REASON = "seasonal theme retired at build";

const decoratedRoutes = ["/", "/infection-control", "/faqs-1", "/contact", "/resources", "/journey"];

const firstResource = resourceArticles[0];

if (!firstResource) {
  throw new Error("Expected at least one resource article in lib/resource-articles.ts");
}

// Every public route that renders the footer decorations.
const layoutRoutes = [
  "/",
  "/contact",
  "/faqs-1",
  "/photos",
  "/meet-the-instructors",
  "/dental-assisting-program",
  "/bls-cpr-1",
  "/infection-control",
  "/radiation-safety",
  "/coronal-polish",
  "/sealants",
  "/journey",
  RESOURCES_BASE_PATH,
  `${RESOURCES_BASE_PATH}/${firstResource.slug}`,
  "/cancellation-policy",
  "/facebook",
  "/instagram",
  "/tiktok",
];

const layoutWidths = [
  { height: 640, width: 320 },
  { height: 844, width: 390 },
  { height: 1024, width: 768 },
  { height: 900, width: 1280 },
  { height: 900, width: 1440 },
];

const nonPaidLander = adLandingPages.find((page) => !isPaidTrafficLanderSlug(page.slug));

if (!nonPaidLander) {
  throw new Error("Expected at least one non-paid ad lander in lib/ad-landing-pages.ts");
}

const excludedRoutes = [
  "/lp/dental-assisting-enroll",
  nonPaidLander.path,
  "/student-jobs",
  "/m/login",
];

// Network isolation + promo suppression, but leave the seasonal layer to the clock.
async function isolate(context: BrowserContext) {
  await suppressSitePromo(context, { seasonalTheme: "calendar" });
}

function trackSeasonalAssetRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith(SEASONAL_ASSET_PATH)) {
      requests.push(request.url());
    }
  });

  return requests;
}

async function open(page: Page, path: string) {
  const response = await page.goto(`${localOrigin}${path}`, {
    timeout: 120_000,
    waitUntil: "domcontentloaded",
  });

  await page.waitForLoadState("load").catch(() => undefined);

  return response;
}

async function openAt(page: Page, path: string, when: string) {
  await page.clock.setFixedTime(new Date(when));

  return open(page, path);
}

function seasonAttribute(page: Page) {
  return page.locator("html").getAttribute(SEASONAL_THEME_ATTRIBUTE);
}

function ghostButton(page: Page) {
  return page.getByRole("button", { exact: true, name: GHOST_LABEL });
}

async function visibleSeasonalCount(page: Page) {
  return page.locator("[data-rda-seasonal]").evaluateAll((elements) =>
    elements.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }).length,
  );
}

type PseudoReport = { content: string; pointerEvents: string; selector: string };

async function seasonalPseudoElements(page: Page): Promise<PseudoReport[]> {
  return page.evaluate(() => {
    const probes: Array<[string, "::after" | "::before"]> = [
      [".rda-home-hero-copy", "::before"],
      [".rda-home-hero-copy", "::after"],
      [".rda-section-heading > span:empty", "::after"],
      [".rda-not-found-content h1", "::before"],
      [".rda-not-found-content h1", "::after"],
    ];

    return probes.flatMap(([selector, pseudo]) =>
      Array.from(document.querySelectorAll(selector)).map((element) => {
        const style = window.getComputedStyle(element, pseudo);

        return { content: style.content, pointerEvents: style.pointerEvents, selector: `${selector}${pseudo}` };
      }),
    );
  });
}

async function assertSeasonOff(page: Page, assetRequests: string[]) {
  expect(await seasonAttribute(page)).toBeNull();
  expect(await page.locator("html").getAttribute(SEASONAL_FLYBY_ATTRIBUTE)).toBeNull();
  expect(await page.locator("html").getAttribute(SEASONAL_PEAK_ATTRIBUTE)).toBeNull();
  expect(await visibleSeasonalCount(page)).toBe(0);
  await expect(ghostButton(page)).toBeHidden();

  for (const pseudo of await seasonalPseudoElements(page)) {
    expect(pseudo.content, pseudo.selector).toBe("none");
  }

  // Let any late CSS fetches surface before asserting none happened.
  await page.waitForTimeout(250);
  expect(assetRequests).toEqual([]);
}

async function nextFrames(page: Page) {
  await page.evaluate(
    () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: document.documentElement.scrollHeight }));
  await nextFrames(page);
}

async function scrollToTop(page: Page) {
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
  await nextFrames(page);
}

/** Brings the footer decor to the middle of the viewport (footers can be taller than the screen). */
async function scrollToFooterDecor(page: Page) {
  await page.evaluate(() =>
    document.querySelector(".rda-seasonal-footer")?.scrollIntoView({ behavior: "instant", block: "center" }),
  );
  await nextFrames(page);
}

function footerDecor(page: Page) {
  return page.locator(".rda-seasonal-footer");
}

// React has hydrated the footer decor and run its effects: the visibility
// observer always reports once, and only the client sets data-rda-ghost to
// anything but the server's "idle" or sets the look variables.
async function waitForFooterHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const button = document.querySelector(".rda-seasonal-ghost-button");

      return Boolean(button && Object.keys(button).some((key) => key.startsWith("__reactProps")));
    },
    undefined,
    { timeout: 30_000 },
  );
  // Effects run right after the hydration commit.
  await nextFrames(page);
  await page.waitForTimeout(100);
}

/** Records every data-rda-ghost value from now on (starting with the current one). */
async function recordGhostPhases(page: Page) {
  await page.evaluate(() => {
    const button = document.querySelector<HTMLElement>(".rda-seasonal-ghost-button")!;
    const store = window as unknown as { __rdaGhostPhases: string[] };

    store.__rdaGhostPhases = [button.getAttribute("data-rda-ghost") ?? ""];
    new MutationObserver(() => store.__rdaGhostPhases.push(button.getAttribute("data-rda-ghost") ?? "")).observe(
      button,
      { attributeFilter: ["data-rda-ghost"] },
    );
  });

  return () => page.evaluate(() => (window as unknown as { __rdaGhostPhases: string[] }).__rdaGhostPhases);
}

/** Records every value of an attribute on the first match from now on (null = removed). */
async function recordAttribute(page: Page, selector: string, attribute: string) {
  const id = `${selector}|${attribute}`;

  await page.evaluate(
    ({ attribute, id, selector }) => {
      const element = document.querySelector(selector)!;
      const store = window as unknown as { __rdaAttributeLog?: Record<string, Array<string | null>> };

      store.__rdaAttributeLog ??= {};
      const log = (store.__rdaAttributeLog[id] = [element.getAttribute(attribute)]);
      new MutationObserver(() => log.push(element.getAttribute(attribute))).observe(element, {
        attributeFilter: [attribute],
      });
    },
    { attribute, id, selector },
  );

  return () =>
    page.evaluate(
      (key) => (window as unknown as { __rdaAttributeLog: Record<string, Array<string | null>> }).__rdaAttributeLog[key],
      id,
    );
}

function peekKeyValue(page: Page) {
  return page.evaluate((key) => window.sessionStorage.getItem(key), PEEK_KEY);
}

async function ghostLook(page: Page) {
  return page.locator(".rda-seasonal-ghost-art").evaluate((svg) => ({
    x: (svg as SVGElement).style.getPropertyValue("--rda-ghost-look-x"),
    y: (svg as SVGElement).style.getPropertyValue("--rda-ghost-look-y"),
  }));
}

/** Names of the CSS animations on an element (optionally its subtree), sorted. */
function animationNames(page: Page, selector: string, options: { running?: boolean; subtree?: boolean } = {}) {
  return page.locator(selector).first().evaluate(
    (element, { running, subtree }) =>
      element
        .getAnimations({ subtree: Boolean(subtree) })
        .filter((animation) => !running || animation.playState === "running")
        .map((animation) => (animation as CSSAnimation).animationName ?? "")
        .sort(),
    options,
  );
}

/** Running CSS animations from the seasonal layer, anywhere in the document. */
function runningSeasonalAnimations(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation): animation is CSSAnimation => "animationName" in animation)
      .filter((animation) => animation.animationName.startsWith("rda-seasonal"))
      .filter((animation) => animation.playState === "running")
      .map((animation) => ({
        infinite: animation.effect?.getComputedTiming().iterations === Infinity,
        name: animation.animationName,
        // Scroll-driven animations "run" on their timeline, not on the clock.
        scrollDriven: Boolean(animation.timeline && !(animation.timeline instanceof DocumentTimeline)),
      })),
  );
}

/**
 * Seeks each flying banner bat to the moment the flyby attribute is removed and
 * reports whether it is already out of sight (past the banner or transparent),
 * so removing the attribute never makes a visible bat blink out mid-air.
 * Leaves the animations paused at that point.
 */
function bannerBatsAtFlybyEnd(page: Page) {
  return page.locator(".rda-promo-banner").evaluate((banner, end) => {
    const bannerRect = banner.getBoundingClientRect();

    return Array.from(banner.querySelectorAll<HTMLElement>(".rda-seasonal-banner-bat"))
      .filter((bat) => bat.getAnimations().length > 0)
      .map((bat) => {
        for (const animation of bat.getAnimations()) {
          animation.pause();
          animation.currentTime = end;
        }

        const rect = bat.getBoundingClientRect();
        const opacity = Number.parseFloat(window.getComputedStyle(bat).opacity);

        return {
          gone: rect.left >= bannerRect.right || rect.right <= bannerRect.left || opacity < 0.02,
          peak: bat.classList.contains("rda-seasonal-banner-bat-peak"),
        };
      });
  }, SEASONAL_FLYBY_DURATION_MS);
}

type SpiderReport = {
  animations: Array<{ iterations: number | null; name: string }>;
  backgroundImage: string;
  box: Box;
  content: string;
  drop: string;
  pointerEvents: string;
  retract: string;
  viewportWidth: number;
};

/** The hero spider pseudo-element; its box covers the thread, the spider and its bob. */
async function heroSpider(page: Page): Promise<SpiderReport | null> {
  return page.evaluate(() => {
    const copy = document.querySelector<HTMLElement>(".rda-home-hero-copy");

    if (!copy) return null;

    const style = window.getComputedStyle(copy, "::after");
    const rect = copy.getBoundingClientRect();
    const px = (value: string) => Number.parseFloat(value);
    const width = px(style.width);
    const height = px(style.height);
    // Absolutely positioned against the copy panel's padding box.
    const right = rect.left + copy.clientLeft + copy.clientWidth - px(style.right);
    const top = rect.top + copy.clientTop + px(style.top);

    return {
      animations: document
        .getAnimations()
        .filter((animation) => {
          const effect = animation.effect as KeyframeEffect | null;

          return effect?.target === copy && effect.pseudoElement === "::after";
        })
        .map((animation) => ({
          iterations: animation.effect?.getComputedTiming().iterations ?? null,
          name: (animation as CSSAnimation).animationName,
        })),
      backgroundImage: style.backgroundImage,
      box: { bottom: top + height, left: right - width, right, top },
      content: style.content,
      drop: style.getPropertyValue("--rda-spider-drop").trim(),
      pointerEvents: style.pointerEvents,
      retract: style.getPropertyValue("--rda-spider-retract").trim(),
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

/** Ends the spider's finite drop/bob so its resting geometry can be read. */
async function finishSpiderAnimations(page: Page) {
  await page.evaluate(() => {
    const copy = document.querySelector(".rda-home-hero-copy");

    for (const animation of document.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null;

      if (effect?.target === copy && effect?.pseudoElement === "::after") {
        if (effect.getComputedTiming().iterations !== Infinity) animation.finish();
      }
    }
  });
}

type DividerState = {
  // Inside an overflow-clipping box (its own, non-scrolling scroll container),
  // where the view timeline is inactive and the pumpkin simply rests.
  clipped: boolean;
  content: string;
  height: string;
  headingBottom: number;
  headingTop: number;
  opacity: string;
  rotate: string;
  scrollDriven: boolean;
  translate: string;
  width: string;
};

async function dividerStates(page: Page): Promise<DividerState[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".rda-section-heading > span:empty")).map((span) => {
      const style = window.getComputedStyle(span, "::after");
      const heading = (span.closest(".rda-section-heading") ?? span).getBoundingClientRect();
      const roll = document
        .getAnimations()
        .find((animation) => {
          const effect = animation.effect as KeyframeEffect | null;

          return effect?.target === span && effect.pseudoElement === "::after";
        });

      let clipped = false;

      for (let node = span.parentElement; node && node !== document.body; node = node.parentElement) {
        const box = window.getComputedStyle(node);

        if (/(hidden|auto|scroll)/u.test(`${box.overflowX} ${box.overflowY}`)) {
          clipped = true;
          break;
        }
      }

      return {
        clipped,
        content: style.content,
        height: style.height,
        headingBottom: heading.bottom,
        headingTop: heading.top,
        opacity: style.opacity,
        rotate: style.rotate,
        scrollDriven: Boolean(roll && roll.timeline && !(roll.timeline instanceof DocumentTimeline)),
        translate: style.translate,
        width: style.width,
      };
    }),
  );
}

function isSettledPumpkin(state: DividerState) {
  return (
    state.opacity === "1" &&
    ["none", "0deg"].includes(state.rotate) &&
    ["none", "0px", "0px 0px"].includes(state.translate)
  );
}

// Hydration may lag the load event; retry the press until React answers.
async function releaseBats(page: Page, press: () => Promise<void>) {
  const bats = page.locator(".rda-seasonal-bat-burst .rda-seasonal-bat");

  await expect(async () => {
    await press();
    await expect(bats).toHaveCount(4, { timeout: 750 });
  }).toPass({ timeout: 15_000 });

  return bats;
}

type Box = { bottom: number; left: number; right: number; top: number };
type InkCollision = { art: string; element: string; overlapX: number; overlapY: number };

/**
 * Runs in the page (self-contained). Finds visible "ink" that intersects any of
 * the given art boxes by more than `tolerance` px on both axes: own text runs,
 * media/controls, and boxes with a border, shadow or a background that differs
 * from what is behind it (full-bleed section backgrounds are ignored).
 */
function findInkCollisions(input: {
  arts: Array<{ box: Box; label: string }>;
  // false: only text runs, media/controls and links count (not painted boxes or borders).
  boxes?: boolean;
  exclude: string;
  root: string;
  tolerance: number;
}): InkCollision[] {
  const viewportWidth = document.documentElement.clientWidth;
  const root = document.querySelector(input.root);
  const collisions: InkCollision[] = [];

  if (!root) {
    return collisions;
  }

  function alpha(color: string) {
    if (!color || color === "transparent") return 0;
    const match = /rgba?\(([^)]+)\)/u.exec(color);
    if (!match) return 1;
    const parts = match[1].split(/[\s,/]+/u).filter(Boolean);
    return parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;
  }

  function backdropColor(element: Element) {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const color = window.getComputedStyle(node).backgroundColor;
      if (alpha(color) > 0) return color;
    }
    return "rgb(255, 255, 255)";
  }

  function label(element: Element) {
    const classes = Array.from(element.classList).slice(0, 3).join(".");
    const text = (element.textContent || "").replace(/\s+/gu, " ").trim().slice(0, 40);
    return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}${text ? ` "${text}"` : ""}`;
  }

  function isFullBleed(rect: DOMRect) {
    return rect.left <= 1 && rect.right >= viewportWidth - 1;
  }

  const inks: Array<{ box: Box; label: string; thin?: boolean }> = [];
  const media = new Set(["IMG", "SVG", "svg", "VIDEO", "IFRAME", "INPUT", "TEXTAREA", "BUTTON", "SELECT", "CANVAS"]);
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];

  for (const element of elements) {
    if (input.exclude && element.closest(input.exclude)) continue;
    if (element.parentElement?.closest("svg")) continue;
    const checked = element as Element & {
      checkVisibility?: (options: Record<string, boolean>) => boolean;
    };
    if (checked.checkVisibility && !checked.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;

    const rect = element.getBoundingClientRect();

    if (rect.width <= 1 || rect.height <= 1) continue;

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType !== Node.TEXT_NODE || !child.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(child);
      for (const textRect of Array.from(range.getClientRects())) {
        if (textRect.width > 0 && textRect.height > 0) {
          inks.push({ box: textRect, label: `text ${label(element)}` });
        }
      }
    }

    if (isFullBleed(rect)) continue;

    if (media.has(element.tagName) || (input.boxes === false && element.tagName === "A")) {
      inks.push({ box: rect, label: label(element) });
      continue;
    }

    if (input.boxes === false) continue;

    const style = window.getComputedStyle(element);
    const shadowed = style.boxShadow !== "none";
    const painted =
      style.backgroundImage !== "none" ||
      (alpha(style.backgroundColor) > 0 && style.backgroundColor !== backdropColor(element));

    if (shadowed || painted) {
      inks.push({ box: rect, label: `box ${label(element)}` });
      continue;
    }

    // A border is only ink along the edge it is drawn on.
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const width = Number.parseFloat(style.getPropertyValue(`border-${side}-width`));
      const lineStyle = style.getPropertyValue(`border-${side}-style`);

      if (!(width > 0) || lineStyle === "none" || lineStyle === "hidden" || alpha(style.getPropertyValue(`border-${side}-color`)) === 0) {
        continue;
      }

      const strip = {
        bottom: side === "top" ? rect.top + width : rect.bottom,
        left: side === "right" ? rect.right - width : rect.left,
        right: side === "left" ? rect.left + width : rect.right,
        top: side === "bottom" ? rect.bottom - width : rect.top,
      };

      inks.push({ box: strip, label: `border-${side} ${label(element)}`, thin: true });
    }
  }

  for (const art of input.arts) {
    for (const ink of inks) {
      const overlapX = Math.min(art.box.right, ink.box.right) - Math.max(art.box.left, ink.box.left);
      const overlapY = Math.min(art.box.bottom, ink.box.bottom) - Math.max(art.box.top, ink.box.top);

      // Hairlines (borders) collide when crossed at all; areas need more than the tolerance.
      const hit = ink.thin
        ? overlapX > 0 && overlapY > 0 && Math.max(overlapX, overlapY) > input.tolerance
        : overlapX > input.tolerance && overlapY > input.tolerance;

      if (hit) {
        collisions.push({
          art: art.label,
          element: ink.label,
          overlapX: Math.round(overlapX * 10) / 10,
          overlapY: Math.round(overlapY * 10) / 10,
        });
      }
    }
  }

  return collisions;
}

function recordCollisions(testInfo: TestInfo, title: string, collisions: InkCollision[]) {
  if (collisions.length === 0) return;

  testInfo.annotations.push({ description: JSON.stringify(collisions), type: "seasonal-collision" });

  for (const collision of collisions) {
    console.log(
      `SEASONAL-COLLISION ${title} | ${collision.art} x ${collision.element} | ${collision.overlapX}x${collision.overlapY}px`,
    );
  }
}

test.describe("seasonal theme: pure gating logic", () => {
  test("local date follows the theme timezone, not UTC or the host", () => {
    expect(getSeasonalLocalDate(new Date("2026-11-01T06:30:00Z"), "America/Los_Angeles")).toBe("2026-10-31");
    expect(getSeasonalLocalDate(new Date("2026-11-01T06:30:00Z"), "UTC")).toBe("2026-11-01");
    expect(getSeasonalLocalDate(new Date("2026-10-01T06:59:00Z"), "America/Los_Angeles")).toBe("2026-09-30");
    expect(getSeasonalLocalDate(new Date("2026-10-01T07:00:00Z"), "America/Los_Angeles")).toBe("2026-10-01");
    expect(getSeasonalLocalDate(new Date("2027-01-01T07:59:00Z"), "America/Los_Angeles")).toBe("2026-12-31");
    expect(getSeasonalLocalDate(new Date("2026-03-08T10:30:00Z"), "America/Los_Angeles")).toBe("2026-03-08");
  });

  test("the window is October 1-31 inclusive on the academy calendar", () => {
    const at = (iso: string) => isSeasonalThemeActive(halloween2026, new Date(iso));

    expect(at("2026-09-30T23:59:59-07:00")).toBe(false);
    expect(at("2026-10-01T00:00:00-07:00")).toBe(true);
    expect(at("2026-10-15T12:00:00-07:00")).toBe(true);
    expect(at("2026-10-31T23:59:59-07:00")).toBe(true);
    expect(at("2026-11-01T00:00:00-07:00")).toBe(false);
    expect(at("2025-10-15T12:00:00-07:00")).toBe(false);
    expect(at("2027-10-15T12:00:00-07:00")).toBe(false);
  });

  test("the theme is current (shipped by builds) until Oct 31 ends in Los Angeles", () => {
    const current = (iso: string) => isSeasonalThemeCurrent(halloween2026, new Date(iso));

    expect(current("2026-09-15T12:00:00-07:00")).toBe(true);
    expect(current("2026-10-31T23:59:00-07:00")).toBe(true);
    expect(current("2026-11-01T06:59:00Z")).toBe(true);
    expect(current("2026-11-01T00:00:00-07:00")).toBe(false);
    expect(current("2026-11-01T07:00:00Z")).toBe(false);
    expect(current("2027-10-15T12:00:00-07:00")).toBe(false);
    expect(activeSeasonalTheme === null).toBe(!isSeasonalThemeCurrent(halloween2026, new Date()));
  });

  type FakeEnvironment = {
    attributes: Map<string, string>;
    banner: boolean;
    listeners: Array<{ callback: () => void; options: unknown; type: string }>;
    localStorage?: Record<string, string> | "throws";
    readyState: "complete" | "interactive" | "loading";
    reducedMotion?: boolean;
    sessionStorage?: Record<string, string> | "throws";
    timers: Array<{ callback: () => void; delay: number }>;
    window: Record<string, unknown>;
  };

  function runInlineScript(script: string, now: string, env: Partial<FakeEnvironment> = {}) {
    const state: FakeEnvironment = {
      attributes: new Map(),
      banner: true,
      listeners: [],
      readyState: "complete",
      timers: [],
      window: {},
      ...env,
    };
    const RealDate = Date;
    const fixed = new RealDate(now).getTime();
    const storage = (store: FakeEnvironment["localStorage"]) => {
      if (store === "throws") {
        return {
          getItem() {
            throw new Error("SecurityError");
          },
          setItem() {
            throw new Error("SecurityError");
          },
        };
      }

      const values = store ?? {};

      return {
        getItem: (key: string) => (key in values ? values[key] : null),
        setItem: (key: string, value: string) => {
          values[key] = String(value);
        },
      };
    };
    const FakeDate = function (...args: unknown[]) {
      return args.length ? new RealDate(...(args as [string])) : new RealDate(fixed);
    } as unknown as DateConstructor;

    Object.assign(state.window, {
      localStorage: storage(state.localStorage),
      matchMedia: () => ({ matches: Boolean(state.reducedMotion) }),
      sessionStorage: storage(state.sessionStorage),
      setTimeout: (callback: () => void, delay: number) => state.timers.push({ callback, delay }),
    });

    runInNewContext(script, {
      Date: FakeDate,
      Intl,
      document: {
        addEventListener: (type: string, callback: () => void, options: unknown) =>
          state.listeners.push({ callback, options, type }),
        documentElement: {
          removeAttribute: (name: string) => state.attributes.delete(name),
          setAttribute: (name: string, value: string) => state.attributes.set(name, value),
        },
        querySelector: (selector: string) => (state.banner && selector === SEASONAL_FLYBY_TARGET ? {} : null),
        get readyState() {
          return state.readyState;
        },
      },
      window: state.window,
    });

    return state;
  }

  test("inline <head> script gates, opts out, and schedules one flyby per session", () => {
    const script = buildSeasonalThemeScript(halloween2026);
    const flybyKey = getSeasonalFlybyStorageKey(halloween2026);

    const before = runInlineScript(script, "2026-09-30T23:30:00-07:00");
    expect([...before.attributes.keys()]).toEqual([]);
    expect(before.window[SEASONAL_SCRIPT_MARKER]).toBe(halloween2026.id);

    const after = runInlineScript(script, "2026-11-01T00:05:00-07:00");
    expect([...after.attributes.keys()]).toEqual([]);
    expect(after.window[SEASONAL_SCRIPT_MARKER]).toBe(halloween2026.id);

    const session: Record<string, string> = {};
    const first = runInlineScript(script, MID_OCTOBER, { sessionStorage: session });
    expect(first.window[SEASONAL_SCRIPT_MARKER]).toBe(halloween2026.id);
    expect(first.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");
    expect(first.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(true);
    expect(session[flybyKey]).toBe("1");
    expect(first.timers.map(({ delay }) => delay)).toEqual([SEASONAL_FLYBY_DURATION_MS]);
    first.timers[0].callback();
    expect(first.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
    expect(first.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");

    const second = runInlineScript(script, MID_OCTOBER, { sessionStorage: session });
    expect(second.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");
    expect(second.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);

    const reduced = runInlineScript(script, MID_OCTOBER, { readyState: "loading", reducedMotion: true });
    expect(reduced.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");
    expect(reduced.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
    expect(reduced.listeners).toEqual([]);

    const optedOut = runInlineScript(script, MID_OCTOBER, {
      localStorage: { [SEASONAL_OPT_OUT_STORAGE_KEY]: SEASONAL_OPT_OUT_VALUE },
    });
    expect([...optedOut.attributes.keys()]).toEqual([]);
    expect(optedOut.window[SEASONAL_SCRIPT_MARKER]).toBe(halloween2026.id);

    // Unreadable session storage counts as "already seen": no flyby, theme stays.
    const blockedSession = runInlineScript(script, MID_OCTOBER, { sessionStorage: "throws" });
    expect(blockedSession.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");
    expect(blockedSession.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
  });

  test("the flyby is only spent on a page with a scoped banner", () => {
    const script = buildSeasonalThemeScript(halloween2026);
    const session: Record<string, string> = {};

    const lander = runInlineScript(script, MID_OCTOBER, { banner: false, sessionStorage: session });
    expect(lander.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");
    expect(lander.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
    expect(lander.timers).toEqual([]);
    expect(session).toEqual({});

    const home = runInlineScript(script, MID_OCTOBER, { sessionStorage: session });
    expect(home.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(true);
    expect(session[getSeasonalFlybyStorageKey(halloween2026)]).toBe("1");
  });

  test("while the document is loading the flyby waits for DOMContentLoaded", () => {
    const script = buildSeasonalThemeScript(halloween2026);
    const session: Record<string, string> = {};
    const loading = runInlineScript(script, MID_OCTOBER, { readyState: "loading", sessionStorage: session });

    expect(loading.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");
    expect(loading.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
    expect(session).toEqual({});
    expect(loading.listeners.map(({ options, type }) => ({ options, type }))).toEqual([
      { options: { once: true }, type: "DOMContentLoaded" },
    ]);

    loading.readyState = "interactive";
    loading.listeners[0].callback();
    expect(loading.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(true);
    expect(session[getSeasonalFlybyStorageKey(halloween2026)]).toBe("1");
    expect(loading.timers.map(({ delay }) => delay)).toEqual([SEASONAL_FLYBY_DURATION_MS]);

    // Deferred check still respects a missing banner.
    const noBanner = runInlineScript(script, MID_OCTOBER, { banner: false, readyState: "loading", sessionStorage: {} });
    noBanner.listeners[0].callback();
    expect(noBanner.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
  });

  test("inline config escapes < so it cannot close the <script> element", () => {
    const hostile: SeasonalTheme = {
      ...halloween2026,
      id: "</script><script>alert(1)</script><!--",
    };
    const script = buildSeasonalThemeScript(hostile);
    const config = script.slice(script.lastIndexOf(")(") + 2);

    expect(config).toContain("\\u003c/script>");
    expect(config).not.toContain("<");
    expect(script).not.toMatch(/<\/script|<!--/iu);

    // Still valid JS that round-trips the original value.
    const session: Record<string, string> = {};
    const result = runInlineScript(script, MID_OCTOBER, { sessionStorage: session });
    expect(result.window[SEASONAL_SCRIPT_MARKER]).toBe(hostile.id);
    expect(Object.keys(session)).toEqual([getSeasonalFlybyStorageKey(hostile)]);
  });

  test("live capture scripts mirror the opt-out key and seasonal attributes", () => {
    const shared = readFileSync(resolve(process.cwd(), "scripts/live-clone-shared.mjs"), "utf8");

    expect(shared).toContain(`SEASONAL_OPT_OUT_STORAGE_KEY = "${SEASONAL_OPT_OUT_STORAGE_KEY}"`);
    expect(shared).toContain(`SEASONAL_OPT_OUT_VALUE = "${SEASONAL_OPT_OUT_VALUE}"`);
    expect(shared).toContain(
      `SEASONAL_HTML_ATTRIBUTES = ["${SEASONAL_THEME_ATTRIBUTE}", "${SEASONAL_FLYBY_ATTRIBUTE}", "${SEASONAL_PEAK_ATTRIBUTE}"]`,
    );
    expect(shared).toContain(`SEASONAL_SCOPE_ATTRIBUTE = "${SEASONAL_SCOPE_ATTRIBUTE}"`);
    expect(shared).toContain("script#rda-seasonal-theme");

    for (const script of ["scripts/refresh-live-baselines.mjs", "scripts/capture-live-snapshot.mjs"]) {
      expect(readFileSync(resolve(process.cwd(), script), "utf8"), script).toContain("suppressSeasonalTheme(page)");
    }

    // The visual-capture fallback (hideFloatingThirdPartyWidgets) drops all three gates too.
    const helpers = readFileSync(resolve(process.cwd(), "tests/support/qa-helpers.ts"), "utf8");
    expect(helpers).toContain("[SEASONAL_THEME_ATTRIBUTE, SEASONAL_FLYBY_ATTRIBUTE, SEASONAL_PEAK_ATTRIBUTE]");
    expect(readFileSync(resolve(process.cwd(), "scripts/refresh-live-baselines.mjs"), "utf8")).toContain(
      "}, SEASONAL_HTML_ATTRIBUTES)",
    );
  });

  test("peakOn is Halloween itself, inside the window", () => {
    expect(halloween2026.peakOn).toBe("2026-10-31");
    expect(halloween2026.peakOn >= halloween2026.startsOn).toBe(true);
    expect(halloween2026.peakOn <= halloween2026.endsOn).toBe(true);
  });

  test("inline <head> script marks the peak day on the academy calendar only", () => {
    const script = buildSeasonalThemeScript(halloween2026);
    const peak = (now: string, env: Partial<FakeEnvironment> = {}) => {
      const state = runInlineScript(script, now, { sessionStorage: {}, ...env });

      return { peak: state.attributes.has(SEASONAL_PEAK_ATTRIBUTE), state };
    };

    // Oct 31 in Los Angeles, from just after midnight to just before the next one.
    const early = peak("2026-10-31T00:05:00-07:00");
    expect(early.peak).toBe(true);
    expect(early.state.attributes.get(SEASONAL_PEAK_ATTRIBUTE)).toBe("");
    expect(early.state.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");
    expect(early.state.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(true);
    // 23:30 Pacific is already Nov 1 in UTC.
    expect(peak("2026-11-01T06:30:00Z").peak).toBe(true);

    // Oct 30 Pacific, including when it is already Oct 31 in UTC.
    const dayBefore = peak("2026-10-30T23:59:00-07:00");
    expect(dayBefore.peak).toBe(false);
    expect(dayBefore.state.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("halloween");
    expect(peak("2026-10-31T03:00:00Z").peak).toBe(false);
    expect(peak(MID_OCTOBER).peak).toBe(false);

    // Over: nothing at all.
    expect([...peak("2026-11-01T00:05:00-07:00").state.attributes.keys()]).toEqual([]);

    // Reduced motion keeps the (static) peak flourish but skips the flyby.
    const reduced = peak("2026-10-31T12:00:00-07:00", { reducedMotion: true });
    expect(reduced.peak).toBe(true);
    expect(reduced.state.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);

    // Opted out: no gate at all, peak included.
    const optedOut = peak("2026-10-31T12:00:00-07:00", {
      localStorage: { [SEASONAL_OPT_OUT_STORAGE_KEY]: SEASONAL_OPT_OUT_VALUE },
    });
    expect([...optedOut.state.attributes.keys()]).toEqual([]);
  });
});

test.describe("seasonal theme: calendar window in the browser", () => {
  // UTC host clock: the Oct 31 23:30 Pacific case is already Nov 1 locally.
  test.use({ timezoneId: "UTC" });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const { expected, peak = false, when } of [
    { expected: false, when: "2026-09-30T23:30:00-07:00" },
    { expected: true, when: "2026-10-01T00:05:00-07:00" },
    { expected: true, when: "2026-10-30T23:30:00-07:00" },
    { expected: true, peak: true, when: "2026-10-31T00:05:00-07:00" },
    { expected: true, peak: true, when: "2026-10-31T23:30:00-07:00" },
    { expected: false, when: "2026-11-01T00:05:00-07:00" },
  ]) {
    test(`${when} Pacific is ${expected ? "on" : "off"}${peak ? " (peak day)" : ""}`, async ({ page }) => {
      test.skip(expected && RETIRED, RETIRED_REASON);
      const assetRequests = trackSeasonalAssetRequests(page);

      await openAt(page, "/", when);

      if (!expected) {
        await assertSeasonOff(page, assetRequests);
        return;
      }

      expect(await seasonAttribute(page)).toBe("halloween");
      expect(await page.locator("html").getAttribute(SEASONAL_PEAK_ATTRIBUTE)).toBe(peak ? "" : null);
      await scrollToBottom(page);
      await expect(page.locator(".rda-seasonal-footer")).toBeVisible();
      await expect(ghostButton(page)).toBeVisible();
    });
  }

  test("the served inline script works on its own, before the app bundle", async ({ page }) => {
    test.skip(RETIRED, RETIRED_REASON);
    // No React: only the prerendered <head> script can set the attribute.
    await page.route(/\/_next\/static\/chunks\/.*\.js(\?|$)/u, (route) => route.abort());
    await page.clock.install({ time: new Date(MID_OCTOBER) });
    await page.clock.pauseAt(new Date(MID_OCTOBER));
    await open(page, "/");

    await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
    await expect(page.locator("html")).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    expect(await page.evaluate((marker) => (window as unknown as Record<string, unknown>)[marker], SEASONAL_SCRIPT_MARKER)).toBe(
      halloween2026.id,
    );
  });
});

test.describe("seasonal theme: decorations while on", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const path of decoratedRoutes) {
    test(`footer decorations render on ${path}`, async ({ page }) => {
      const response = await openAt(page, path, MID_OCTOBER);

      expect(response?.status()).toBe(200);
      expect(await seasonAttribute(page)).toBe("halloween");
      await expect(page.locator(`[${SEASONAL_SCOPE_ATTRIBUTE}="true"]`)).toHaveCount(1);
      await scrollToBottom(page);
      await expect(page.locator(".rda-seasonal-footer")).toBeVisible();
      await expect(page.locator(".rda-seasonal-footer-pumpkin")).toHaveCount(3);
      await expect(ghostButton(page)).toBeVisible();

      const box = await ghostButton(page).boundingBox();
      expect(box?.width ?? 0, "ghost button has a tappable size").toBeGreaterThanOrEqual(24);
      expect(box?.height ?? 0, "ghost button has a tappable size").toBeGreaterThanOrEqual(24);
    });
  }

  test("hero cobweb, hero spider and divider pumpkins are drawn as non-interactive pseudo-elements", async ({ page }) => {
    const assetRequests = trackSeasonalAssetRequests(page);

    await openAt(page, "/", MID_OCTOBER);

    const pseudos = await seasonalPseudoElements(page);
    const cobwebs = pseudos.filter(({ selector }) => selector === ".rda-home-hero-copy::before");
    const spiders = pseudos.filter(({ selector }) => selector === ".rda-home-hero-copy::after");
    const pumpkins = pseudos.filter(({ selector }) => selector.startsWith(".rda-section-heading"));

    expect(cobwebs.length).toBeGreaterThan(0);
    expect(spiders.length).toBe(1);
    expect(pumpkins.length).toBeGreaterThan(0);

    for (const pseudo of [...cobwebs, ...spiders, ...pumpkins]) {
      expect(pseudo.content, pseudo.selector).not.toBe("none");
      expect(pseudo.pointerEvents, pseudo.selector).toBe("none");
    }

    // v2 pumpkin: 22.5x20.
    for (const state of await dividerStates(page)) {
      expect(state.width).toBe("22.5px");
      expect(state.height).toBe("20px");
    }

    await expect
      .poll(() => assetRequests.map((url) => new URL(url).pathname).sort())
      .toEqual(
        expect.arrayContaining([
          "/assets/seasonal/halloween-2026/cobweb.svg",
          "/assets/seasonal/halloween-2026/pumpkin.svg",
          "/assets/seasonal/halloween-2026/spider.svg",
        ]),
      );

    // Course pages carry the divider too.
    await open(page, "/infection-control");
    const coursePumpkins = (await seasonalPseudoElements(page)).filter(({ selector }) =>
      selector.startsWith(".rda-section-heading"),
    );
    expect(coursePumpkins.length).toBeGreaterThan(0);
    expect(coursePumpkins.every(({ content }) => content !== "none")).toBe(true);
  });

  test("decorations are hidden from assistive tech, text-free, and the ghost is the only control", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);

    const report = await page.evaluate(() => {
      const seasonal = Array.from(document.querySelectorAll<HTMLElement>("[data-rda-seasonal]"));
      const focusableSelector =
        'a[href], button, input, select, textarea, iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"]), svg[focusable="true"]';
      const focusables = seasonal.flatMap((root) => [
        ...(root.matches(focusableSelector) ? [root] : []),
        ...Array.from(root.querySelectorAll<HTMLElement | SVGElement>(focusableSelector)),
      ]);
      const svgs = seasonal.flatMap((root) => Array.from(root.querySelectorAll("svg")));

      return {
        focusables: focusables.map((element) => element.getAttribute("aria-label") || element.tagName),
        innerText: seasonal.map((root) => root.innerText.trim()).filter(Boolean),
        svgCount: svgs.length,
        svgsExposed: svgs.filter((svg) => !svg.closest('[aria-hidden="true"]')).length,
        svgsFocusable: svgs.filter((svg) => svg.getAttribute("focusable") !== "false").length,
        textContent: seasonal.map((root) => (root.textContent ?? "").trim()).filter(Boolean),
      };
    });

    expect(report.svgCount).toBeGreaterThan(0);
    expect(report.svgsExposed).toBe(0);
    expect(report.svgsFocusable).toBe(0);
    expect(report.innerText).toEqual([]);
    expect(report.textContent).toEqual([]);
    expect(report.focusables).toEqual([GHOST_LABEL]);
  });

  test("ghost button is reachable with Tab, shows a focus ring, and answers Enter and Space", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    await scrollToBottom(page);

    // Focus whatever precedes the ghost in tab order, then Tab onto it.
    const hasPrevious = await page.evaluate((label) => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && element.tabIndex >= 0;
      });
      const index = candidates.findIndex((element) => element.getAttribute("aria-label") === label);
      const previous = index > 0 ? candidates[index - 1] : null;

      previous?.focus();

      return Boolean(previous) && document.activeElement === previous;
    }, GHOST_LABEL);

    expect(hasPrevious).toBe(true);
    await page.keyboard.press("Tab");
    await expect(ghostButton(page)).toBeFocused();

    const ring = await ghostButton(page).evaluate((button) => {
      const style = window.getComputedStyle(button);

      return {
        boxShadow: style.boxShadow,
        focusVisible: button.matches(":focus-visible"),
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
      };
    });

    expect(ring.focusVisible).toBe(true);
    expect(ring.outlineStyle).not.toBe("none");
    expect(ring.outlineWidth).toBeGreaterThan(0);
    expect(ring.outlineColor).not.toMatch(/^(transparent|rgba\([^)]*,\s*0\))$/u);
    expect(ring.boxShadow).not.toBe("none");
    expect(ring.boxShadow).not.toMatch(/^rgba\([^)]*,\s*0\)/u);

    await releaseBats(page, () => page.keyboard.press("Enter"));
    await expect(page.locator(".rda-seasonal-bat")).toHaveCount(0, { timeout: 5_000 });

    await releaseBats(page, () => page.keyboard.press("Space"));
  });

  test("easter egg releases four bats that clean themselves up", async ({ page }) => {
    await openAt(page, "/contact", MID_OCTOBER);
    await scrollToBottom(page);

    const bats = await releaseBats(page, () => ghostButton(page).click());

    expect(await bats.evaluateAll((elements) => elements.every((bat) => bat.closest('[aria-hidden="true"]')))).toBe(true);
    await expect(ghostButton(page)).toHaveAttribute("data-rda-bursting", /^(odd|even)$/u);

    // Repeated presses restart the burst instead of stacking more bats.
    for (let press = 0; press < 5; press += 1) {
      await ghostButton(page).click();
      expect(await page.locator(".rda-seasonal-bat").count()).toBeLessThanOrEqual(4);
    }

    await expect(page.locator(".rda-seasonal-bat")).toHaveCount(4);
    await expect(page.locator(".rda-seasonal-bat-burst")).toHaveCount(1);
    await expect(page.locator(".rda-seasonal-bat")).toHaveCount(0, { timeout: 5_000 });
    await expect(page.locator(".rda-seasonal-bat-burst")).toHaveCount(0);
    await expect(ghostButton(page)).not.toHaveAttribute("data-rda-bursting", /.*/);
  });

  test("bat burst is removed on the ~1.9s timer under a controlled clock", async ({ page }) => {
    await page.clock.install({ time: new Date(MID_OCTOBER) });
    await open(page, "/");
    await scrollToBottom(page);

    await releaseBats(page, () => ghostButton(page).click());
    await page.clock.runFor(1_000);
    await expect(page.locator(".rda-seasonal-bat")).toHaveCount(4);
    await page.clock.runFor(1_000);
    await expect(page.locator(".rda-seasonal-bat")).toHaveCount(0);
  });
});

test.describe("seasonal theme: first-visit banner flyby", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("runs once per session and clears itself after ~8s", async ({ page }) => {
    await page.clock.install({ time: new Date(MID_OCTOBER) });
    await page.clock.pauseAt(new Date(MID_OCTOBER));
    const assetRequests = trackSeasonalAssetRequests(page);

    await open(page, "/");

    const html = page.locator("html");

    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    await expect(html).not.toHaveAttribute(SEASONAL_PEAK_ATTRIBUTE, /.*/);

    // v2: an inline flapping bat in the banner sky, not a ::after mask.
    const sky = page.locator(`.rda-promo-banner > [data-rda-seasonal="banner"]`);
    await expect(sky).toHaveCount(1);
    await expect(sky).toHaveAttribute("aria-hidden", "true");
    expect(await sky.evaluate((element) => window.getComputedStyle(element).pointerEvents)).toBe("none");
    expect(
      await page.locator(".rda-promo-banner").evaluate((banner) => window.getComputedStyle(banner, "::after").content),
    ).toBe("none");

    const bat = ".rda-seasonal-banner-bat:not(.rda-seasonal-banner-bat-peak)";
    await expect.poll(() => animationNames(page, bat)).toEqual(["rda-seasonal-banner-bank", "rda-seasonal-banner-swoop"]);
    expect(await animationNames(page, `${bat} .rda-seasonal-flapping-bat`, { subtree: true })).toEqual([
      "rda-seasonal-wing-left",
      "rda-seasonal-wing-right",
    ]);
    // The peak-day bat stays parked off-peak.
    expect(await animationNames(page, ".rda-seasonal-banner-bat-peak")).toEqual([]);

    expect(await bannerBatsAtFlybyEnd(page)).toEqual([{ gone: true, peak: false }]);

    // The banner text is stacked above the sky (the sky is pointer-events: none,
    // so hit-testing cannot tell; compare the stacking instead).
    const stacking = await page.locator(".rda-promo-banner").evaluate((banner) => {
      const sky = banner.querySelector<HTMLElement>(":scope > [data-rda-seasonal]")!;
      const content = Array.from(banner.querySelectorAll<HTMLElement>(":scope > :not([data-rda-seasonal])"));

      return {
        content: content.map((element) => {
          const style = window.getComputedStyle(element);
          return `${style.position}/${style.zIndex}`;
        }),
        sky: window.getComputedStyle(sky).zIndex,
      };
    });
    expect(stacking.sky).toBe("0");
    expect(stacking.content.length).toBeGreaterThan(0);
    expect(new Set(stacking.content)).toEqual(new Set(["relative/1"]));

    await page.clock.runFor(SEASONAL_FLYBY_DURATION_MS - 500);
    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    await page.clock.runFor(1_000);
    await expect(html).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
    expect(await animationNames(page, ".rda-seasonal-banner-sky", { subtree: true })).toEqual([]);
    expect(assetRequests.filter((url) => url.endsWith("/bat.svg"))).toEqual([]);

    // Same tab, later pages: sessionStorage remembers the flyby.
    await open(page, "/contact");
    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
    await expect(html).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(html).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
  });

  test("a page without a scoped banner does not spend the flyby", async ({ page }) => {
    await page.clock.install({ time: new Date(MID_OCTOBER) });
    await page.clock.pauseAt(new Date(MID_OCTOBER));
    const flybyKey = getSeasonalFlybyStorageKey(halloween2026);
    const html = page.locator("html");

    await open(page, "/lp/dental-assisting-enroll");
    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
    await expect(html).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), flybyKey)).toBeNull();

    await open(page, "/");
    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), flybyKey)).toBe("1");
  });

  test("never runs with prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openAt(page, "/", MID_OCTOBER);

    await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
    await expect(page.locator("html")).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
  });
});

test.describe("seasonal theme: peak day (Halloween)", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  async function openPinned(page: Page, when: string, width: number) {
    await page.setViewportSize({ height: 900, width });
    // Paused timers keep the flyby attribute up for the whole check.
    await page.clock.install({ time: new Date(when) });
    await page.clock.pauseAt(new Date(when));
    await open(page, "/");
  }

  function moon(page: Page) {
    return page.locator(".rda-seasonal-banner-sky .rda-seasonal-moon").evaluate((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const banner = element.closest(".rda-promo-banner")!.getBoundingClientRect();

      return {
        display: style.display,
        insideBanner:
          rect.left >= banner.left && rect.right <= banner.right && rect.top >= banner.top && rect.bottom <= banner.bottom,
        height: rect.height,
        width: rect.width,
      };
    });
  }

  function glowScale(page: Page) {
    return page.locator(".rda-seasonal-pumpkin-slot").evaluateAll((slots) =>
      slots
        .map((slot) => slot.querySelector<HTMLElement>(".rda-seasonal-lantern-glow"))
        .filter((glow): glow is HTMLElement => Boolean(glow))
        .map(
          (glow) =>
            Math.round(
              (Number.parseFloat(window.getComputedStyle(glow).width) / glow.parentElement!.getBoundingClientRect().width) *
                100,
            ) / 100,
        ),
    );
  }

  test(`on Oct 31 the moon rises (>=${MOON_MIN_WIDTH}px only) and a second bat follows`, async ({ page }) => {
    await openPinned(page, PEAK_DAY, 1280);
    const html = page.locator("html");

    await expect(html).toHaveAttribute(SEASONAL_PEAK_ATTRIBUTE, "");
    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");

    const wide = await moon(page);
    expect(wide.display).toBe("block");
    expect(wide.width).toBeGreaterThan(10);
    expect(wide.height).toBeGreaterThan(10);
    expect(wide.insideBanner).toBe(true);

    await expect
      .poll(() => animationNames(page, ".rda-seasonal-banner-bat-peak"))
      .toEqual(["rda-seasonal-banner-bank", "rda-seasonal-banner-glide"]);
    expect(await animationNames(page, ".rda-seasonal-banner-bat:not(.rda-seasonal-banner-bat-peak)")).toEqual([
      "rda-seasonal-banner-bank",
      "rda-seasonal-banner-swoop",
    ]);
    expect(await page.locator(".rda-seasonal-banner-bat").count()).toBe(2);

    // The lanterns burn brighter (bigger halo) on the night itself.
    expect(new Set(await glowScale(page))).toEqual(new Set([1.9]));

    // Both flights are out of sight by the time the flyby attribute goes.
    for (const width of [1280, 390]) {
      await page.setViewportSize({ height: 900, width });
      expect(await bannerBatsAtFlybyEnd(page), `${width}px`).toEqual([
        { gone: true, peak: false },
        { gone: true, peak: true },
      ]);
    }

    for (const width of [MOON_MIN_WIDTH, 1440]) {
      await page.setViewportSize({ height: 900, width });
      expect((await moon(page)).display, `${width}px`).toBe("block");
    }

    for (const width of [MOON_MIN_WIDTH - 1, 768, 390, 320]) {
      await page.setViewportSize({ height: 900, width });
      expect((await moon(page)).display, `${width}px`).toBe("none");
    }
  });

  test("on Oct 30 there is no moon, no second bat and the regular lantern glow", async ({ page }) => {
    await openPinned(page, DAY_BEFORE_PEAK, 1440);
    const html = page.locator("html");

    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    await expect(html).not.toHaveAttribute(SEASONAL_PEAK_ATTRIBUTE, /.*/);
    expect((await moon(page)).display).toBe("none");
    await expect
      .poll(() => animationNames(page, ".rda-seasonal-banner-bat:not(.rda-seasonal-banner-bat-peak)"))
      .toEqual(["rda-seasonal-banner-bank", "rda-seasonal-banner-swoop"]);
    expect(await animationNames(page, ".rda-seasonal-banner-bat-peak")).toEqual([]);
    expect(
      await page
        .locator(".rda-seasonal-banner-bat-peak")
        .evaluate((element) => window.getComputedStyle(element).opacity),
    ).toBe("0");
    expect(new Set(await glowScale(page))).toEqual(new Set([1.5]));
  });
});

test.describe("seasonal theme: hero spider", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("drops in on its thread, settles, and climbs back up while the pointer is over the panel", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/", MID_OCTOBER);

    const spider = await heroSpider(page);
    expect(spider).not.toBeNull();
    expect(spider!.content).toBe('""');
    expect(spider!.pointerEvents).toBe("none");
    expect(spider!.backgroundImage).toContain("/assets/seasonal/halloween-2026/spider.svg");
    expect(spider!.animations.map(({ name }) => name).sort()).toEqual([
      "rda-seasonal-spider-bob",
      "rda-seasonal-spider-drop",
    ]);
    // Drop once, bob a few times: nothing on the spider loops forever.
    expect(spider!.animations.every(({ iterations }) => iterations !== Infinity)).toBe(true);

    await finishSpiderAnimations(page);
    await expect.poll(async () => (await heroSpider(page))!.drop).toBe("1");
    expect((await heroSpider(page))!.retract).toBe("0");

    // Hover retracts it (registered property transition), leaving brings it back.
    await page.locator(".rda-home-hero-copy").hover();
    await expect.poll(async () => Number((await heroSpider(page))!.retract)).toBeGreaterThan(0.95);
    await page.mouse.move(2, 2);
    await expect.poll(async () => Number((await heroSpider(page))!.retract)).toBeLessThan(0.05);
  });

  for (const viewport of layoutWidths) {
    test(`spider and thread stay clear of hero text and controls at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await openAt(page, "/", MID_OCTOBER);
      await expect.poll(async () => (await heroSpider(page))?.content).toBe('""');
      await finishSpiderAnimations(page);

      const spider = (await heroSpider(page))!;

      expect(spider.box.left).toBeGreaterThanOrEqual(0);
      expect(spider.box.right).toBeLessThanOrEqual(spider.viewportWidth);

      const collisions = await page.evaluate(findInkCollisions, {
        arts: [{ box: spider.box, label: "hero spider" }],
        boxes: false,
        exclude: "",
        root: ".rda-home-hero",
        tolerance: 1,
      });

      recordCollisions(testInfo, `hero spider @${viewport.width}`, collisions);
      expect(collisions, "hero spider overlaps hero text or controls").toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        "horizontal overflow",
      ).toBe(true);
    });
  }
});

test.describe("seasonal theme: divider pumpkins", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const path of ["/", "/infection-control", "/contact"]) {
    for (const viewport of [{ height: 844, width: 390 }, { height: 900, width: 1440 }]) {
      test(`pumpkins roll in with the scroll and settle in the notch on ${path} at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await openAt(page, path, MID_OCTOBER);

        const count = (await dividerStates(page)).length;
        expect(count).toBeGreaterThan(0);

        let checkedBefore = 0;

        for (let index = 0; index < count; index += 1) {
          // Park the heading just below the fold: not rolled in yet.
          const parked = await page.evaluate((i) => {
            const heading = document.querySelectorAll(".rda-section-heading > span:empty")[i]!.closest(".rda-section-heading")!;
            const rect = heading.getBoundingClientRect();
            const target = window.scrollY + rect.top - window.innerHeight - 24;
            if (rect.height === 0 || target < 0) return false;
            window.scrollTo({ behavior: "instant", top: target });
            return true;
          }, index);
          await nextFrames(page);

          const before = (await dividerStates(page))[index];
          expect(before.scrollDriven, `divider ${index} is scroll-driven`).toBe(true);
          if (parked && before.clipped) {
            // Static fallback: never hidden, never caught mid-roll.
            expect(isSettledPumpkin(before), `clipped divider ${index} rests: ${JSON.stringify(before)}`).toBe(true);
          } else if (parked) {
            expect(before.opacity, `divider ${index} hidden before it enters`).toBe("0");
            checkedBefore += 1;
          }

          // Bring it to ~40% down the viewport (or as far as the page scrolls).
          await page.evaluate((i) => {
            const heading = document.querySelectorAll(".rda-section-heading > span:empty")[i]!.closest(".rda-section-heading")!;
            const rect = heading.getBoundingClientRect();
            window.scrollTo({ behavior: "instant", top: Math.max(0, window.scrollY + rect.top - window.innerHeight * 0.4) });
          }, index);
          await nextFrames(page);

          const after = (await dividerStates(page))[index];
          expect(isSettledPumpkin(after), `divider ${index} settled: ${JSON.stringify(after)}`).toBe(true);
        }

        expect(checkedBefore).toBeGreaterThan(0);
      });
    }
  }
});

test.describe("seasonal theme: footer ghost", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context, page }) => {
    await isolate(context);
    await page.setViewportSize({ height: 900, width: 1280 });
  });

  test("hides until the footer scrolls into view, peeks once, and not again this session", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    const ghost = ghostButton(page);

    await expect(ghost).toHaveAttribute("data-rda-ghost", "hiding");
    await expect
      .poll(() => page.locator(".rda-seasonal-ghost-stage").evaluate((stage) => window.getComputedStyle(stage).opacity))
      .toBe("0");
    expect(await peekKeyValue(page)).toBeNull();

    const phases = await recordGhostPhases(page);
    await scrollToFooterDecor(page);

    await expect.poll(phases).toContain("peek");
    expect(await peekKeyValue(page)).toBe("1");
    await expect(ghost).toHaveAttribute("data-rda-ghost", /^(idle|hint)$/u, { timeout: 5_000 });
    expect(
      await page.locator(".rda-seasonal-ghost-stage").evaluate((stage) => window.getComputedStyle(stage).opacity),
    ).toBe("1");

    // Same tab, next page: already introduced, so no hiding and no second peek.
    await open(page, "/contact");
    await waitForFooterHydration(page);
    await expect(ghost).toHaveAttribute("data-rda-ghost", "idle");
    const nextPhases = await recordGhostPhases(page);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await page.waitForTimeout(1_000);
    expect(await nextPhases()).not.toContain("peek");
    expect(await nextPhases()).not.toContain("hiding");
  });

  test("a footer already on screen at load is never hidden", async ({ context, page: measure }) => {
    await openAt(measure, "/contact", MID_OCTOBER);
    const height = await measure.evaluate(() => document.documentElement.scrollHeight);

    // A fresh tab (no peek spent) with a window tall enough to show the whole page.
    const page = await context.newPage();
    await page.setViewportSize({ height: Math.min(height + 200, 6_000), width: 1280 });
    await openAt(page, "/contact", MID_OCTOBER);
    expect(
      await footerDecor(page).evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight),
    ).toBe(true);
    await waitForFooterHydration(page);
    const phases = await recordGhostPhases(page);

    await page.waitForTimeout(500);
    expect(await phases()).toEqual(["idle"]);
    expect(await peekKeyValue(page)).toBeNull();
  });

  test("keyboard focus reveals a hiding ghost at once and counts as the session's peek", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    const ghost = ghostButton(page);

    await expect(ghost).toHaveAttribute("data-rda-ghost", "hiding");

    // Focus without scrolling, so only the focus can be what reveals it.
    await ghost.evaluate((button) => (button as HTMLElement).focus({ preventScroll: true }));
    await expect(ghost).toBeFocused();
    await expect(ghost).toHaveAttribute("data-rda-ghost", "peek");
    expect(
      await footerDecor(page).evaluate((element) => element.getBoundingClientRect().top > window.innerHeight),
      "footer still off screen",
    ).toBe(true);
    expect(await peekKeyValue(page)).toBe("1");

    await open(page, "/contact");
    await waitForFooterHydration(page);
    await expect(ghost).toHaveAttribute("data-rda-ghost", "idle");
  });

  test("an untouched ghost wiggles once as a hint; after a press it never does", async ({ browser }) => {
    async function phasesAfterPeek(press: boolean) {
      const context = await browser.newContext({ viewport: { height: 900, width: 1280 } });

      try {
        await isolate(context);
        const page = await context.newPage();

        await openAt(page, "/", MID_OCTOBER);
        await expect(ghostButton(page)).toHaveAttribute("data-rda-ghost", "hiding");
        const phases = await recordGhostPhases(page);

        await scrollToFooterDecor(page);
        await expect.poll(phases).toContain("peek");

        if (press) {
          await ghostButton(page).click();
          await expect(ghostButton(page)).toHaveAttribute("data-rda-ghost", "idle");
        }

        // Peek (1.4s) + hint delay (2.6s) + hint (1s), with slack.
        await page.waitForTimeout(6_000);

        return { final: await ghostButton(page).getAttribute("data-rda-ghost"), phases: await phases() };
      } finally {
        await context.close();
      }
    }

    const untouched = await phasesAfterPeek(false);
    expect(untouched.phases).toEqual(["hiding", "peek", "idle", "hint", "idle"]);
    expect(untouched.final).toBe("idle");

    const pressed = await phasesAfterPeek(true);
    expect(pressed.phases).not.toContain("hint");
    expect(pressed.final).toBe("idle");
  });

  test("a press gasps, puffs mist and sends four bats along curved offset-paths that clean up", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    const ghost = ghostButton(page);
    const mouths = () =>
      page.locator(".rda-seasonal-ghost-art").evaluate((svg) => ({
        gasp: window.getComputedStyle(svg.querySelector(".rda-ghost-mouth-gasp")!).opacity,
        smile: window.getComputedStyle(svg.querySelector(".rda-ghost-mouth-smile")!).opacity,
      }));

    expect(await mouths()).toEqual({ gasp: "0", smile: "1" });

    await releaseBats(page, () => ghost.click());
    await expect(ghost).toHaveAttribute("data-rda-mood", "surprised");
    // Each press flips data-rda-bursting so the boo squash replays.
    const firstBurst = await ghost.getAttribute("data-rda-bursting");
    expect(firstBurst).toMatch(/^(odd|even)$/u);
    await expect.poll(mouths).toEqual({ gasp: "1", smile: "0" });

    const burst = await page.locator(".rda-seasonal-bat-burst").evaluate((element) => ({
      ariaHidden: element.getAttribute("aria-hidden"),
      bats: Array.from(element.querySelectorAll<HTMLElement>(".rda-seasonal-bat")).map((bat) => ({
        animations: bat.getAnimations().map((animation) => (animation as CSSAnimation).animationName).sort(),
        offsetPath: window.getComputedStyle(bat).offsetPath,
        wings: bat.querySelectorAll(".rda-seasonal-flapping-bat .rda-bat-wing").length,
      })),
      mist: element.querySelectorAll(".rda-seasonal-mist-puff").length,
      pointerEvents: window.getComputedStyle(element).pointerEvents,
    }));

    expect(burst.ariaHidden).toBe("true");
    expect(burst.pointerEvents).toBe("none");
    expect(burst.mist).toBe(3);
    expect(burst.bats).toHaveLength(4);
    expect(new Set(burst.bats.map(({ offsetPath }) => offsetPath)).size).toBe(4);

    for (const bat of burst.bats) {
      expect(bat.offsetPath).toMatch(/^path\("M ?0 0 ?C/u);
      expect(bat.wings).toBe(2);
      expect(bat.animations).toEqual(["rda-seasonal-bat-bank", "rda-seasonal-bat-swoop"]);
    }

    await ghost.click();
    await expect(ghost).toHaveAttribute("data-rda-bursting", firstBurst === "odd" ? "even" : "odd");
    // "odd" plays rda-seasonal-boo, "even" rda-seasonal-boo-again: a new name restarts the squash.
    expect((await animationNames(page, ".rda-seasonal-ghost-art")).some((name) => name.startsWith("rda-seasonal-boo"))).toBe(
      true,
    );
    await expect(page.locator(".rda-seasonal-bat-burst")).toHaveCount(1);

    // The gasp is brief; the burst clears itself after ~2s.
    await expect(ghost).not.toHaveAttribute("data-rda-mood", /.*/, { timeout: 2_000 });
    await expect.poll(mouths).toEqual({ gasp: "0", smile: "1" });
    await expect(page.locator(".rda-seasonal-bat-burst")).toHaveCount(0, { timeout: 4_000 });
    await expect(page.locator(".rda-seasonal-mist-puff")).toHaveCount(0);
  });

  test("every third press adds a spin, alternating direction", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await waitForFooterHydration(page);
    const ghost = ghostButton(page);

    await ghost.click();
    await ghost.click();
    await expect(page.locator(".rda-seasonal-bat-burst")).toHaveCount(1);
    await expect(ghost).not.toHaveAttribute("data-rda-spin", /.*/);

    await ghost.click();
    await expect(ghost).toHaveAttribute("data-rda-spin", "odd");
    expect(await animationNames(page, ".rda-seasonal-ghost-stage")).toContain("rda-seasonal-ghost-spin-odd");

    await ghost.click();
    await ghost.click();
    await expect(ghost).toHaveAttribute("data-rda-spin", "odd");
    await ghost.click();
    await expect(ghost).toHaveAttribute("data-rda-spin", "even");
    expect(await animationNames(page, ".rda-seasonal-ghost-stage")).toContain("rda-seasonal-ghost-spin-even");
  });

  test("footer loops rest while the footer is off screen", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    await waitForFooterHydration(page);
    const playStates = () =>
      page.evaluate(() =>
        Array.from(
          new Set(
            document
              .querySelector(".rda-live-footer")!
              .getAnimations({ subtree: true })
              .filter((animation) => (animation as CSSAnimation).animationName?.startsWith("rda-seasonal"))
              .filter((animation) => animation.effect?.getComputedTiming().iterations === Infinity)
              .map((animation) => animation.playState),
          ),
        ),
      );
    const loopNames = () =>
      page.evaluate(() =>
        Array.from(
          new Set(
            document
              .querySelector(".rda-live-footer")!
              .getAnimations({ subtree: true })
              .filter((animation) => animation.effect?.getComputedTiming().iterations === Infinity)
              .map((animation) => (animation as CSSAnimation).animationName),
          ),
        ).sort(),
      );

    await expect(footerDecor(page)).not.toHaveAttribute("data-rda-awake", /.*/);
    const loops = await loopNames();
    expect(loops).toEqual(
      expect.arrayContaining(["rda-seasonal-bob", "rda-seasonal-candle-glow", "rda-seasonal-fog-drift"]),
    );
    // Blinks are scheduled by JS (data-rda-blink); the carved faces no longer flicker.
    expect(loops).not.toContain("rda-seasonal-blink");
    expect(loops).not.toContain("rda-seasonal-candle");
    expect(await playStates()).toEqual(["paused"]);

    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await expect.poll(playStates).toEqual(["running"]);

    await scrollToTop(page);
    await expect(footerDecor(page)).not.toHaveAttribute("data-rda-awake", /.*/);
    await expect.poll(playStates).toEqual(["paused"]);
  });

  test("the ghost blinks now and then while awake, never while off screen", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    await waitForFooterHydration(page);
    const ghost = ghostButton(page);
    const blinks = await recordAttribute(page, ".rda-seasonal-ghost-button", "data-rda-blink");

    // Off screen: no blink scheduled (longest gap is ~7s).
    await page.waitForTimeout(7_500);
    expect((await blinks()).filter((value) => value !== null)).toEqual([]);

    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await expect.poll(async () => (await blinks()).some((value) => value !== null), { timeout: 10_000 }).toBe(true);
    // Each blink ends (the attribute is removed again).
    await expect(ghost).not.toHaveAttribute("data-rda-blink", /.*/, { timeout: 2_000 });
    expect((await blinks()).at(-1)).toBeNull();
  });

  test("a press while the ghost is hiding also spends the session's peek", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    const ghost = ghostButton(page);

    await expect(ghost).toHaveAttribute("data-rda-ghost", "hiding");
    // A synthetic click: no focus, no hover, no scroll.
    await ghost.evaluate((button) => (button as HTMLButtonElement).click());
    await expect(page.locator(".rda-seasonal-bat-burst")).toHaveCount(1);
    await expect(ghost).not.toHaveAttribute("data-rda-ghost", "hiding");
    expect(await peekKeyValue(page)).toBe("1");
  });

  test("the eyes glance toward a mouse pointer", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await expect(ghostButton(page)).toHaveAttribute("data-rda-ghost", /^(idle|hint)$/u, { timeout: 5_000 });

    const art = (await page.locator(".rda-seasonal-ghost-art").boundingBox())!;
    const centerX = art.x + art.width / 2;
    const centerY = art.y + art.height * 0.38;
    const px = async (axis: "x" | "y") => Number.parseFloat((await ghostLook(page))[axis]) || 0;

    // Far right: full glance (2.2 units at most).
    await page.mouse.move(Math.min(1270, centerX + 400), centerY);
    await expect.poll(() => px("x")).toBeGreaterThan(1.5);
    expect(await px("x")).toBeLessThanOrEqual(2.2);
    expect(Math.abs(await px("y"))).toBeLessThan(0.5);

    await page.mouse.move(Math.max(2, centerX - 400), centerY);
    await expect.poll(() => px("x")).toBeLessThan(-1);

    // Up and down follow the pointer too (1.6 units at most).
    await page.mouse.move(centerX, Math.max(2, centerY - 300));
    await expect.poll(() => px("y")).toBeLessThan(0);
    await page.mouse.move(centerX, Math.min(890, centerY + 300));
    await expect.poll(() => px("y")).toBeGreaterThan(1);
    expect(await px("y")).toBeLessThanOrEqual(1.6);
    expect(Math.abs(await px("x"))).toBeLessThan(0.5);

    // Leaving the window recentres the eyes.
    await page.evaluate(() => document.documentElement.dispatchEvent(new PointerEvent("pointerleave")));
    await expect.poll(async () => (await ghostLook(page)).x).toBe("0.00px");
  });

  test("the eyes ignore touch (coarse) pointers", async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

    try {
      await isolate(context);
      const page = await context.newPage();

      await openAt(page, "/", MID_OCTOBER);
      expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(false);
      await scrollToFooterDecor(page);
      await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
      const art = (await page.locator(".rda-seasonal-ghost-art").boundingBox())!;

      await page.mouse.move(art.x + 200, art.y);
      await page.mouse.move(art.x - 200, art.y + 50);
      await page.waitForTimeout(400);
      expect(Number.parseFloat((await ghostLook(page)).x) || 0).toBe(0);

      // Hover effects are for hover-capable pointers only: a tap leaves the spider down.
      expect(await page.evaluate(() => window.matchMedia("(hover: hover)").matches)).toBe(false);
      await scrollToTop(page);
      await page.locator(".rda-home-hero-copy").tap({ position: { x: 4, y: 4 } });
      await page.waitForTimeout(1_300);
      expect((await heroSpider(page))!.retract).toBe("0");
    } finally {
      await context.close();
    }
  });
});

test.describe("seasonal theme: footer fog", () => {
  test.skip(RETIRED, RETIRED_REASON);
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const path of ["/", "/contact", "/faqs-1", `${RESOURCES_BASE_PATH}/${firstResource.slug}`]) {
    for (const viewport of layoutWidths) {
      test(`fog stays in the footer's top padding on ${path} at ${viewport.width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await openAt(page, path, MID_OCTOBER);
        await scrollToBottom(page);

        const fog = await page.locator('.rda-live-footer > [data-rda-seasonal="fog"]').evaluate((element) => {
          const footer = element.parentElement!;
          const footerRect = footer.getBoundingClientRect();
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);

          return {
            ariaHidden: element.getAttribute("aria-hidden"),
            box: { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top },
            footer: {
              bottom: footerRect.bottom,
              left: footerRect.left,
              paddingTop: Number.parseFloat(window.getComputedStyle(footer).paddingTop),
              right: footerRect.right,
              top: footerRect.top,
            },
            overflow: style.overflow,
            pointerEvents: style.pointerEvents,
            text: (element.textContent ?? "").trim(),
            zIndex: style.zIndex,
          };
        });

        expect(fog.ariaHidden).toBe("true");
        expect(fog.text).toBe("");
        expect(fog.pointerEvents).toBe("none");
        expect(fog.overflow).toBe("hidden");
        expect(fog.zIndex).toBe("-1");
        expect(fog.box.top).toBeGreaterThanOrEqual(fog.footer.top - 0.5);
        expect(fog.box.left).toBeGreaterThanOrEqual(fog.footer.left - 0.5);
        expect(fog.box.right).toBeLessThanOrEqual(fog.footer.right + 0.5);
        expect(fog.box.bottom - fog.footer.top).toBeLessThanOrEqual(fog.footer.paddingTop);

        const collisions = await page.evaluate(findInkCollisions, {
          arts: [{ box: fog.box, label: "fog" }],
          exclude: "[data-rda-seasonal], .rda-whatsapp-fab, [data-rda-whatsapp]",
          root: ".rda-live-footer",
          tolerance: 0,
        });

        recordCollisions(testInfo, `fog ${path} @${viewport.width}`, collisions);
        expect(collisions, "fog overlaps footer text or controls").toEqual([]);
      });
    }
  }
});

test.describe("seasonal theme: reduced motion", () => {
  test.skip(RETIRED, RETIRED_REASON);
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("only the bat fade animates; decorations stay static", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await page.locator(".rda-home-hero").first().hover().catch(() => undefined);
    await releaseBats(page, () => ghostButton(page).click());
    // Three presses would earn a spin with motion; reduced motion skips it.
    await ghostButton(page).click();
    await ghostButton(page).click();
    await expect(page.locator(".rda-seasonal-bat-burst")).toHaveCount(1);
    expect(await ghostButton(page).getAttribute("data-rda-spin")).toBeNull();

    const animations = await runningSeasonalAnimations(page);

    expect(animations.length).toBeGreaterThan(0);
    expect(animations.filter(({ infinite }) => infinite)).toEqual([]);
    expect([...new Set(animations.map(({ name }) => name))]).toEqual(["rda-seasonal-bat-fade"]);
    // No mist puffs either.
    expect(
      await page
        .locator(".rda-seasonal-mist-puff")
        .evaluateAll((puffs) => puffs.filter((puff) => window.getComputedStyle(puff).display !== "none").length),
    ).toBe(0);
  });

  test("the ghost never hides or peeks, and the eyes do not track the pointer", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/", MID_OCTOBER);
    await waitForFooterHydration(page);
    await page.waitForTimeout(300);

    const phases = await recordGhostPhases(page);

    expect(await phases()).toEqual(["idle"]);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");

    const blinks = await recordAttribute(page, ".rda-seasonal-ghost-button", "data-rda-blink");
    const art = (await page.locator(".rda-seasonal-ghost-art").boundingBox())!;
    await page.mouse.move(art.x + art.width / 2 + 400, art.y + 20);
    await page.mouse.move(art.x + art.width / 2 - 400, art.y + 20);
    // Longer than the longest blink gap (~7s).
    await page.waitForTimeout(7_500);

    expect((await blinks()).filter((value) => value !== null)).toEqual([]);

    expect(await phases()).toEqual(["idle"]);
    expect(await peekKeyValue(page)).toBeNull();
    expect(Number.parseFloat((await ghostLook(page)).x) || 0).toBe(0);
    expect(Number.parseFloat((await ghostLook(page)).y) || 0).toBe(0);
    expect(
      await page.locator(".rda-seasonal-ghost-stage").evaluate((stage) => window.getComputedStyle(stage).opacity),
    ).toBe("1");
  });

  test("no seasonal loop runs anywhere: spider hangs still, pumpkins sit in their notches", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/", MID_OCTOBER);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await page.waitForTimeout(300);

    expect(await runningSeasonalAnimations(page)).toEqual([]);

    await scrollToTop(page);
    const spider = (await heroSpider(page))!;
    expect(spider.content).toBe('""');
    expect(spider.animations).toEqual([]);
    expect(spider.drop).toBe("1");

    for (const state of await dividerStates(page)) {
      expect(state.scrollDriven).toBe(false);
      expect(isSettledPumpkin(state), JSON.stringify(state)).toBe(true);
    }

    expect(await runningSeasonalAnimations(page)).toEqual([]);
  });
});

test.describe("seasonal theme: scope exclusions", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const path of excludedRoutes) {
    test(`no decorations on ${path}`, async ({ page }) => {
      const assetRequests = trackSeasonalAssetRequests(page);

      // Peak day: the most there is to leak.
      await openAt(page, path, PEAK_DAY);

      // Private tools never receive the <head> script; elsewhere the theme is
      // on and only the route's scope keeps decorations out.
      expect(await seasonAttribute(page)).toBe(isPrivateSiteRoute(path) ? null : "halloween");
      await expect(page.locator("script#rda-seasonal-theme")).toHaveCount(isPrivateSiteRoute(path) ? 0 : 1);
      await expect(page.locator(`[${SEASONAL_SCOPE_ATTRIBUTE}]`)).toHaveCount(0);
      // Not just hidden: the banner sky, fog and footer decor are never rendered here.
      await expect(page.locator("[data-rda-seasonal]")).toHaveCount(0);
      await expect(page.locator(".rda-seasonal-banner-sky, .rda-seasonal-fog, .rda-seasonal-footer")).toHaveCount(0);
      await scrollToBottom(page);
      expect(await visibleSeasonalCount(page)).toBe(0);
      await expect(ghostButton(page)).toHaveCount(0);
      expect(await peekKeyValue(page)).toBeNull();

      for (const pseudo of await seasonalPseudoElements(page)) {
        expect(pseudo.content, pseudo.selector).toBe("none");
      }

      await page.waitForTimeout(250);
      expect(assetRequests).toEqual([]);
    });
  }
});

const notFoundPaths = [
  { label: "/registration", path: "/registration" },
  { label: "a random path", path: `/seasonal-qa-missing-${Math.random().toString(36).slice(2, 10)}` },
];

async function notFoundGhost(page: Page) {
  return page.evaluate(() => {
    const h1 = document.querySelector<HTMLElement>(".rda-not-found-content h1");

    if (!h1) return null;

    const style = window.getComputedStyle(h1, "::before");
    const beam = window.getComputedStyle(h1, "::after");
    const icon = document.querySelector<SVGElement>(".rda-not-found-content svg:has(+ h1)");
    const rect = h1.getBoundingClientRect();
    const px = (value: string) => Number.parseFloat(value);
    const width = px(style.width);
    // Lantern art is 76x72.
    const height = Number.isFinite(px(style.height)) ? px(style.height) : (width * 72) / 76;
    // Absolutely positioned against the h1's padding box.
    const left = rect.left + h1.clientLeft + px(style.left);
    const bottom = rect.top + h1.clientTop + h1.clientHeight - px(style.bottom);

    return {
      backgroundImage: style.backgroundImage,
      beam: {
        content: beam.content,
        mixBlendMode: beam.mixBlendMode,
        pointerEvents: beam.pointerEvents,
      },
      box: { bottom, left, right: left + width, top: bottom - height },
      content: style.content,
      icon: icon
        ? { height: icon.getBoundingClientRect().height, visibility: window.getComputedStyle(icon).visibility }
        : null,
      pointerEvents: style.pointerEvents,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

async function assertNotFoundGhost(page: Page, testInfo: TestInfo, title: string, still: boolean) {
  await expect.poll(async () => (await notFoundGhost(page))?.content).not.toBe("none");

  const ghost = (await notFoundGhost(page))!;
  const lantern = still ? "ghost-lantern-still.svg" : "ghost-lantern.svg";

  expect(ghost.pointerEvents).toBe("none");
  expect(ghost.backgroundImage).toContain(`/assets/seasonal/halloween-2026/${lantern}`);
  expect(ghost.box.left).toBeGreaterThanOrEqual(0);
  expect(ghost.box.right).toBeLessThanOrEqual(ghost.viewportWidth);
  expect(ghost.box.top).toBeGreaterThanOrEqual(0);
  // The beam: decorative, multiplied over the heading.
  expect(ghost.beam).toEqual({ content: '""', mixBlendMode: "multiply", pointerEvents: "none" });
  // The warning icon steps aside without reflow while the ghost is there.
  expect(ghost.icon).not.toBeNull();
  expect(ghost.icon!.visibility).toBe("hidden");
  expect(ghost.icon!.height).toBeGreaterThan(0);
  expect(ghost.scrollWidth, "horizontal overflow").toBeLessThanOrEqual(ghost.viewportWidth);

  const collisions = await page.evaluate(findInkCollisions, {
    arts: [{ box: ghost.box, label: "404 ghost" }],
    exclude: "",
    root: ".rda-not-found-page",
    tolerance: 1,
  });

  recordCollisions(testInfo, title, collisions);
  expect(collisions, "404 ghost overlaps the heading, icon or copy").toEqual([]);
}

async function assertNoNotFoundGhost(page: Page) {
  const ghost = (await notFoundGhost(page))!;

  expect(ghost.content).toBe("none");
  expect(ghost.beam.content).toBe("none");
  expect(ghost.icon).not.toBeNull();
  expect(ghost.icon!.visibility).toBe("visible");
}

test.describe("seasonal theme: 404 ghost", () => {
  test.skip(RETIRED, RETIRED_REASON);
  // No bob or beam sweep: geometry is read from the resting position.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const { label, path } of notFoundPaths) {
    for (const width of [320, 390, 1280]) {
      test(`ghost with lantern floats above the heading at ${label}, ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ height: width < 768 ? 760 : 900, width });
        const response = await openAt(page, path, MID_OCTOBER);

        expect(response?.status()).toBe(404);
        await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
        // Next serves 404s as a client-rendered shell: the fallback applies the season.
        await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
        await assertNotFoundGhost(page, testInfo, `404 ${label} @${width}`, true);
        expect(await runningSeasonalAnimations(page)).toEqual([]);
        await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
      });
    }
  }
});

test.describe("seasonal theme: 404 ghost with motion", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const width of [320, 390, 1280]) {
    test(`animated lantern and sweeping beam never overflow at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: width < 768 ? 760 : 900, width });
      const response = await openAt(page, "/registration", MID_OCTOBER);

      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
      await expect.poll(async () => (await notFoundGhost(page))?.content).not.toBe("none");

      const names = (await runningSeasonalAnimations(page)).map(({ name }) => name).sort();
      expect(names).toEqual(["rda-seasonal-beam", "rda-seasonal-bob"]);

      // Pin the bob at rest, then check the beam at both ends of its sweep.
      const extremes = await page.evaluate(() => {
        const results: Array<{ rotate: string; scrollWidth: number; viewportWidth: number }> = [];
        const h1 = document.querySelector(".rda-not-found-content h1")!;
        const animations = document.getAnimations() as CSSAnimation[];
        const bob = animations.find((animation) => animation.animationName === "rda-seasonal-bob");
        const beam = animations.find((animation) => animation.animationName === "rda-seasonal-beam")!;

        bob?.pause();
        if (bob) bob.currentTime = 0;
        beam.pause();

        for (const time of [0, Number(beam.effect!.getComputedTiming().duration)]) {
          beam.currentTime = time;
          results.push({
            rotate: window.getComputedStyle(h1, "::after").rotate,
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
          });
        }

        return results;
      });

      expect(extremes.map(({ rotate }) => rotate)).toEqual(["30deg", "-26deg"]);

      for (const extreme of extremes) {
        expect(extreme.scrollWidth, `overflow at ${extreme.rotate}`).toBeLessThanOrEqual(extreme.viewportWidth);
      }

      await assertNotFoundGhost(page, testInfo, `404 motion @${width}`, false);
    });
  }
});

test.describe("seasonal theme: 404 out of season", () => {
  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("no ghost after the season", async ({ page }) => {
    await openAt(page, "/registration", AFTER_SEASON);

    await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
    // Give the client fallback a chance to (wrongly) switch the season on.
    await page.waitForTimeout(500);
    expect(await seasonAttribute(page)).toBeNull();
    await assertNoNotFoundGhost(page);
  });

  test("no ghost when opted out mid-October", async ({ context, page }) => {
    await suppressSeasonalTheme(context);
    await openAt(page, "/registration", MID_OCTOBER);

    await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await seasonAttribute(page)).toBeNull();
    await assertNoNotFoundGhost(page);
  });
});

test.describe("seasonal theme: opt-out and parity", () => {
  test("localStorage opt-out keeps decorations off mid-October", async ({ context, page }) => {
    await isolate(context);
    await suppressSeasonalTheme(context);
    const assetRequests = trackSeasonalAssetRequests(page);

    await openAt(page, "/", MID_OCTOBER);
    await assertSeasonOff(page, assetRequests);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SEASONAL_OPT_OUT_STORAGE_KEY)).toBe(
      SEASONAL_OPT_OUT_VALUE,
    );
  });

  test("default QA isolation keeps every v2 piece out of other suites, even on the peak day", async ({ context, page }) => {
    // What every other suite gets: suppressSitePromo without the "calendar" option.
    await suppressSitePromo(context);
    const assetRequests = trackSeasonalAssetRequests(page);

    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/", PEAK_DAY);
    await assertSeasonOff(page, assetRequests);
    await scrollToBottom(page);
    await page.waitForTimeout(500);

    // The markup is there (prerendered) but inert: display none, no peek spent, no loops.
    for (const kind of ["banner", "fog", "footer"]) {
      await expect(page.locator(`[data-rda-seasonal="${kind}"]`)).toBeHidden();
    }
    expect(await page.locator(".rda-seasonal-moon").evaluate((element) => window.getComputedStyle(element).display)).toBe(
      "none",
    );
    expect(await peekKeyValue(page)).toBeNull();
    expect(await runningSeasonalAnimations(page)).toEqual([]);
    expect(
      await page.locator(".rda-promo-banner").evaluate((banner) => window.getComputedStyle(banner).overflow),
    ).not.toBe("clip");

    await openAt(page, "/registration", PEAK_DAY);
    await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await seasonAttribute(page)).toBeNull();
    await assertNoNotFoundGhost(page);
  });

  test("decorations add no text to the homepage", async ({ browser }) => {
    test.skip(RETIRED, RETIRED_REASON);

    async function bodyText(seasonal: boolean) {
      // Reduced motion pins the hero carousel to slide 1 in both captures.
      const context = await browser.newContext({ reducedMotion: "reduce", viewport: { height: 900, width: 1280 } });

      try {
        await isolate(context);

        if (!seasonal) {
          await suppressSeasonalTheme(context);
        }

        const page = await context.newPage();

        await openAt(page, "/", MID_OCTOBER);
        expect(await seasonAttribute(page)).toBe(seasonal ? "halloween" : null);
        await scrollToBottom(page);

        return page.evaluate(() => document.body.innerText.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim());
      } finally {
        await context.close();
      }
    }

    const on = await bodyText(true);
    const off = await bodyText(false);

    expect(on.length).toBeGreaterThan(500);
    expect(on).toBe(off);
  });
});

test.describe("seasonal theme: layout safety", () => {
  test.skip(RETIRED, RETIRED_REASON);
  // Reduced motion stops the ghost's bob and the pumpkin pop, so boxes are stable.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("the collision check itself catches text, controls and hairlines under the art", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/contact", MID_OCTOBER);
    await scrollToBottom(page);

    const ghost = (await page.locator(".rda-seasonal-ghost-art").boundingBox())!;
    const box = { bottom: ghost.y + ghost.height, left: ghost.x, right: ghost.x + ghost.width, top: ghost.y };
    const probe = async (html: string, style: string) => {
      await page.evaluate(
        ({ html, rect, style }) => {
          const element = document.createElement("div");
          element.id = "seasonal-qa-probe";
          element.innerHTML = html;
          element.setAttribute(
            "style",
            `position:absolute;left:${rect.left + 4 + window.scrollX}px;top:${rect.top + 4 + window.scrollY}px;width:${rect.right - rect.left - 8}px;${style}`,
          );
          document.body.append(element);
        },
        { html, rect: box, style },
      );
      const hits = await page.evaluate(findInkCollisions, {
        arts: [{ box, label: "ghost" }],
        exclude: "[data-rda-seasonal]",
        root: "#seasonal-qa-probe",
        tolerance: 1,
      });
      await page.evaluate(() => document.getElementById("seasonal-qa-probe")?.remove());

      return hits.length;
    };
    const caught = {
      border: await probe("", "height:20px;border-top:1px solid rgb(0,0,0)"),
      button: await probe("<button type='button' style='width:30px;height:20px'></button>", "height:20px"),
      empty: await probe("", "height:20px"),
      text: await probe("ink", "height:20px;font-size:14px"),
    };

    expect(caught.empty).toBe(0);
    expect(caught.text).toBeGreaterThan(0);
    expect(caught.button).toBeGreaterThan(0);
    expect(caught.border).toBeGreaterThan(0);
  });

  const matrix = [
    ...layoutWidths.flatMap((viewport) => layoutRoutes.map((path) => ({ path, peak: false, viewport }))),
    // The peak day's bigger lantern halo, on the busiest footers.
    ...layoutWidths.flatMap((viewport) => ["/", "/contact", "/faqs-1"].map((path) => ({ path, peak: true, viewport }))),
  ];

  for (const { path, peak, viewport } of matrix) {
    test(`footer decor clears page ink on ${path} at ${viewport.width}px${peak ? " (peak day)" : ""}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const response = await openAt(page, path, peak ? PEAK_DAY : MID_OCTOBER);

      expect(response?.status()).toBe(200);
      await scrollToBottom(page);
      await scrollToBottom(page);
      await ghostButton(page).scrollIntoViewIfNeeded();
      await expect(ghostButton(page)).toBeVisible();

      expect(await page.locator("html").getAttribute(SEASONAL_PEAK_ATTRIBUTE)).toBe(peak ? "" : null);

      const arts = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<Element>(
            ".rda-seasonal-footer-pumpkin, .rda-seasonal-ghost-art, .rda-seasonal-lantern-glow",
          ),
        ).map((element, index) => {
          const rect = element.getBoundingClientRect();
          const kind = element.classList.contains("rda-seasonal-ghost-art")
            ? "ghost"
            : element.classList.contains("rda-seasonal-lantern-glow")
              ? "glow"
              : "pumpkin";
          // The halo is a closest-side radial gradient: its visible light is
          // the inscribed ellipse, so test the box that ellipse fills
          // (inset by (1 - 1/sqrt 2) / 2 of each side), not the corners.
          const inset = kind === "glow" ? (1 - Math.SQRT1_2) / 2 : 0;

          return {
            box: {
              bottom: rect.bottom - rect.height * inset,
              left: rect.left + rect.width * inset,
              right: rect.right - rect.width * inset,
              top: rect.top + rect.height * inset,
            },
            label: `${kind}-${index + 1}`,
          };
        }),
      );

      expect(arts.filter(({ label }) => label.startsWith("pumpkin")).length).toBe(3);
      expect(arts.filter(({ label }) => label.startsWith("ghost")).length).toBe(1);
      expect(arts.filter(({ label }) => label.startsWith("glow")).length).toBe(2);

      const collisions = await page.evaluate(findInkCollisions, {
        arts,
        exclude: "[data-rda-seasonal], .rda-whatsapp-fab, [data-rda-whatsapp]",
        root: "body",
        tolerance: 1,
      });

      recordCollisions(testInfo, `${path} @${viewport.width}${peak ? " peak" : ""}`, collisions);

      const report = await page.evaluate((artBoxes) => {
        const decor = document.querySelector<HTMLElement>(".rda-seasonal-footer");
        const fab = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
        const fabRect = fab && window.getComputedStyle(fab).display !== "none" ? fab.getBoundingClientRect() : null;
        const overlaps = (a: { bottom: number; left: number; right: number; top: number }, b: DOMRect) =>
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        // Pumpkins take the pointer (hover wobble), so nothing interactive may sit under them.
        const interactive = 'a[href], button, input, select, textarea, label, summary, [role="button"], [tabindex]';
        const pumpkinsCoverControls = Array.from(document.querySelectorAll(".rda-seasonal-pumpkin-slot")).some((slot) => {
          const rect = slot.getBoundingClientRect();
          const points = [
            [rect.left + rect.width / 2, rect.top + rect.height / 2],
            [rect.left + 2, rect.bottom - 2],
            [rect.right - 2, rect.bottom - 2],
            [rect.left + rect.width / 2, rect.top + 2],
          ];

          return points.some(([x, y]) =>
            document
              .elementsFromPoint(x, y)
              .some((element) => !element.closest("[data-rda-seasonal]") && Boolean(element.closest(interactive))),
          );
        });

        return {
          artOutsideViewport: artBoxes.some(
            ({ box }) => box.left < 0 || box.right > document.documentElement.clientWidth,
          ),
          decorPointerEvents: decor ? window.getComputedStyle(decor).pointerEvents : "missing",
          fabCollision: Boolean(fabRect && artBoxes.some(({ box }) => overlaps(box, fabRect))),
          innerWidth: window.innerWidth,
          pumpkinsCoverControls,
          scrollWidth: document.documentElement.scrollWidth,
        };
      }, arts);

      expect.soft(report.scrollWidth, "horizontal overflow").toBeLessThanOrEqual(report.innerWidth);
      expect.soft(report.artOutsideViewport, "decor art leaves the viewport").toBe(false);
      expect.soft(report.decorPointerEvents).toBe("none");
      expect.soft(report.pumpkinsCoverControls, "pumpkins must not cover links or controls").toBe(false);
      expect.soft(report.fabCollision, "footer decor overlaps the WhatsApp button").toBe(false);
      expect.soft(collisions, "footer decor overlaps page ink").toEqual([]);
    });
  }
});

test.describe("seasonal theme: runtime health", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  function collectProblems(page: Page) {
    const problems: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" || /hydrat/i.test(message.text())) {
        problems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

    return problems;
  }

  for (const { label, when } of [
    { label: "mid-October", when: MID_OCTOBER },
    { label: "the peak day", when: PEAK_DAY },
  ]) {
    test(`homepage logs no errors or hydration warnings on ${label}`, async ({ page }) => {
      const problems = collectProblems(page);

      await page.setViewportSize({ height: 900, width: 1280 });
      await openAt(page, "/", when);
      expect(await seasonAttribute(page)).toBe("halloween");
      await page.locator(".rda-home-hero-copy").hover();
      await scrollToFooterDecor(page);
      await expect.poll(() => page.locator(".rda-seasonal-ghost-button").getAttribute("data-rda-ghost")).not.toBe(
        "hiding",
      );
      const art = (await page.locator(".rda-seasonal-ghost-art").boundingBox())!;
      await page.mouse.move(art.x + 200, art.y);
      await releaseBats(page, () => ghostButton(page).click());
      await ghostButton(page).click();
      await ghostButton(page).click();
      await page.waitForTimeout(2_500);
      // And another decorated page in the same session.
      await open(page, "/contact");
      await scrollToBottom(page);
      await page.waitForTimeout(500);

      expect(problems).toEqual([]);
    });
  }

  test("the 404 page logs no errors or hydration warnings while on", async ({ page }) => {
    const problems = collectProblems(page);

    await openAt(page, "/registration", PEAK_DAY);
    await expect.poll(async () => (await notFoundGhost(page))?.content).not.toBe("none");
    await page.waitForTimeout(1_000);

    // The 404 status itself is logged as a failed resource load; nothing else may be.
    expect(problems.filter((problem) => !/status of 404/u.test(problem))).toEqual([]);
  });
});
