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
  thanksgiving2026,
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

// Daylight saving ends Nov 1, 2026 at 2am: the rest of the season is UTC-8.
const MID_SEASON = "2026-11-12T10:00:00-08:00";
const PEAK_DAY = "2026-11-26T10:00:00-08:00";
const DAY_BEFORE_PEAK = "2026-11-25T10:00:00-08:00";
const AFTER_SEASON = "2026-12-15T10:00:00-08:00";
const MASCOT_LABEL = "Toss the autumn leaves";
const PEEK_KEY = getSeasonalPeekStorageKey(thanksgiving2026);
const ASSETS = "/assets/seasonal/thanksgiving-2026";
// Banner sun breakpoint (globals.css "Seasonal layer", banner section).
const SUN_MIN_WIDTH = 900;
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

function mascotButton(page: Page) {
  return page.getByRole("button", { exact: true, name: MASCOT_LABEL });
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
  await expect(mascotButton(page)).toBeHidden();

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
// observer always reports once, and only the client sets data-rda-mascot to
// anything but the server's "idle" or sets the look variables.
async function waitForFooterHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const button = document.querySelector(".rda-seasonal-mascot-button");

      return Boolean(button && Object.keys(button).some((key) => key.startsWith("__reactProps")));
    },
    undefined,
    { timeout: 30_000 },
  );
  // Effects run right after the hydration commit.
  await nextFrames(page);
  await page.waitForTimeout(100);
}

/** Records every data-rda-mascot value from now on (starting with the current one). */
async function recordMascotPhases(page: Page) {
  await page.evaluate(() => {
    const button = document.querySelector<HTMLElement>(".rda-seasonal-mascot-button")!;
    const store = window as unknown as { __rdaMascotPhases: string[] };

    store.__rdaMascotPhases = [button.getAttribute("data-rda-mascot") ?? ""];
    new MutationObserver(() => store.__rdaMascotPhases.push(button.getAttribute("data-rda-mascot") ?? "")).observe(
      button,
      { attributeFilter: ["data-rda-mascot"] },
    );
  });

  return () => page.evaluate(() => (window as unknown as { __rdaMascotPhases: string[] }).__rdaMascotPhases);
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

async function mascotLook(page: Page) {
  return page.locator(".rda-seasonal-mascot-art").evaluate((svg) => ({
    x: (svg as SVGElement).style.getPropertyValue("--rda-mascot-look-x"),
    y: (svg as SVGElement).style.getPropertyValue("--rda-mascot-look-y"),
  }));
}

/** Names of the CSS animations on an element (optionally its subtree), sorted. */
function animationNames(page: Page, selector: string, options: { running?: boolean; subtree?: boolean } = {}) {
  return page.locator(selector).first().evaluate(
    (element, { running, subtree }) =>
      element
        .getAnimations({ subtree: Boolean(subtree) })
        // CSS transitions (hover lifts, fan scale) are not part of the contract.
        .filter((animation) => "animationName" in animation)
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
 * Seeks each tumbling banner leaf to the moment the flyby attribute is removed
 * and reports whether it is already out of sight (past the banner or
 * transparent), so removing the attribute never makes a visible leaf blink out
 * mid-air. Leaves the animations paused at that point.
 */
function bannerLeavesAtFlybyEnd(page: Page) {
  return page.locator(".rda-promo-banner").evaluate((banner, end) => {
    const bannerRect = banner.getBoundingClientRect();

    return Array.from(banner.querySelectorAll<HTMLElement>(".rda-seasonal-banner-leaf"))
      .filter((leaf) => leaf.getAnimations().length > 0)
      .map((leaf) => {
        for (const animation of leaf.getAnimations({ subtree: true })) {
          animation.pause();
          animation.currentTime = end;
        }

        const rect = leaf.getBoundingClientRect();
        const opacity = Number.parseFloat(window.getComputedStyle(leaf).opacity);

        return {
          gone: rect.left >= bannerRect.right || rect.right <= bannerRect.left || opacity < 0.02,
          peak: leaf.classList.contains("rda-seasonal-banner-leaf-peak"),
        };
      });
  }, SEASONAL_FLYBY_DURATION_MS);
}

type HeroArtReport = {
  animations: Array<{ iterations: number | null; name: string }>;
  backgroundImage: string;
  box: Box;
  content: string;
  opacity: string;
  pointerEvents: string;
  viewportWidth: number;
};

/**
 * The hero's corner sprig (::before) or falling leaf (::after). For the leaf,
 * the box covers its whole fall: from where it lets go, swaying up to 16px
 * left, down by --rda-leaf-fall.
 */
async function heroArt(page: Page, pseudo: "::after" | "::before"): Promise<HeroArtReport | null> {
  return page.evaluate((pseudo) => {
    const copy = document.querySelector<HTMLElement>(".rda-home-hero-copy");

    if (!copy) return null;

    const style = window.getComputedStyle(copy, pseudo);
    const rect = copy.getBoundingClientRect();
    const px = (value: string) => Number.parseFloat(value);
    const width = px(style.width);
    const height = px(style.height);
    // Absolutely positioned against the copy panel's padding box.
    const right = rect.left + copy.clientLeft + copy.clientWidth - px(style.right);
    const top = rect.top + copy.clientTop + px(style.top);
    const fall = pseudo === "::after" ? px(window.getComputedStyle(copy).getPropertyValue("--rda-leaf-fall")) || 0 : 0;
    const sway = pseudo === "::after" ? 16 : 0;

    return {
      animations: document
        .getAnimations()
        .filter((animation) => {
          const effect = animation.effect as KeyframeEffect | null;

          return effect?.target === copy && effect.pseudoElement === pseudo;
        })
        .map((animation) => ({
          iterations: animation.effect?.getComputedTiming().iterations ?? null,
          name: (animation as CSSAnimation).animationName,
        })),
      backgroundImage: style.backgroundImage,
      box: { bottom: top + height + fall, left: right - width - sway, right: right + (sway ? 4 : 0), top },
      content: style.content,
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      viewportWidth: document.documentElement.clientWidth,
    };
  }, pseudo);
}

/** Ends the falling leaf's one-off animation so its resting state can be read. */
async function finishHeroLeaf(page: Page) {
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
  // where the view timeline is inactive and the leaf simply rests.
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

function isSettledLeaf(state: DividerState) {
  return (
    state.opacity === "1" &&
    ["none", "0deg"].includes(state.rotate) &&
    ["none", "0px", "0px 0px"].includes(state.translate)
  );
}

// Hydration may lag the load event; retry the press until React answers.
async function tossLeaves(page: Page, press: () => Promise<void>) {
  const leaves = page.locator(".rda-seasonal-leaf-burst .rda-seasonal-flying-leaf");

  await expect(async () => {
    await press();
    await expect(leaves).toHaveCount(4, { timeout: 750 });
  }).toPass({ timeout: 15_000 });

  return leaves;
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

  test("the window is November 1-30 inclusive on the academy calendar", () => {
    const at = (iso: string) => isSeasonalThemeActive(thanksgiving2026, new Date(iso));

    expect(at("2026-10-31T23:59:59-07:00")).toBe(false);
    expect(at("2026-11-01T00:00:00-07:00")).toBe(true);
    expect(at("2026-11-12T12:00:00-08:00")).toBe(true);
    expect(at("2026-11-30T23:59:59-08:00")).toBe(true);
    expect(at("2026-12-01T00:00:00-08:00")).toBe(false);
    expect(at("2025-11-15T12:00:00-08:00")).toBe(false);
    expect(at("2027-11-15T12:00:00-08:00")).toBe(false);
  });

  test("the theme is current (shipped by builds) until Nov 30 ends in Los Angeles", () => {
    const current = (iso: string) => isSeasonalThemeCurrent(thanksgiving2026, new Date(iso));

    expect(current("2026-10-15T12:00:00-07:00")).toBe(true);
    expect(current("2026-11-30T23:59:00-08:00")).toBe(true);
    expect(current("2026-12-01T07:59:00Z")).toBe(true);
    expect(current("2026-12-01T00:00:00-08:00")).toBe(false);
    expect(current("2026-12-01T08:00:00Z")).toBe(false);
    expect(current("2027-11-15T12:00:00-08:00")).toBe(false);
    expect(activeSeasonalTheme === null).toBe(!isSeasonalThemeCurrent(thanksgiving2026, new Date()));
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
    const script = buildSeasonalThemeScript(thanksgiving2026);
    const flybyKey = getSeasonalFlybyStorageKey(thanksgiving2026);

    const before = runInlineScript(script, "2026-10-31T23:30:00-07:00");
    expect([...before.attributes.keys()]).toEqual([]);
    expect(before.window[SEASONAL_SCRIPT_MARKER]).toBe(thanksgiving2026.id);

    const after = runInlineScript(script, "2026-12-01T00:05:00-08:00");
    expect([...after.attributes.keys()]).toEqual([]);
    expect(after.window[SEASONAL_SCRIPT_MARKER]).toBe(thanksgiving2026.id);

    const session: Record<string, string> = {};
    const first = runInlineScript(script, MID_SEASON, { sessionStorage: session });
    expect(first.window[SEASONAL_SCRIPT_MARKER]).toBe(thanksgiving2026.id);
    expect(first.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");
    expect(first.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(true);
    expect(session[flybyKey]).toBe("1");
    expect(first.timers.map(({ delay }) => delay)).toEqual([SEASONAL_FLYBY_DURATION_MS]);
    first.timers[0].callback();
    expect(first.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
    expect(first.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");

    const second = runInlineScript(script, MID_SEASON, { sessionStorage: session });
    expect(second.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");
    expect(second.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);

    const reduced = runInlineScript(script, MID_SEASON, { readyState: "loading", reducedMotion: true });
    expect(reduced.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");
    expect(reduced.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
    expect(reduced.listeners).toEqual([]);

    const optedOut = runInlineScript(script, MID_SEASON, {
      localStorage: { [SEASONAL_OPT_OUT_STORAGE_KEY]: SEASONAL_OPT_OUT_VALUE },
    });
    expect([...optedOut.attributes.keys()]).toEqual([]);
    expect(optedOut.window[SEASONAL_SCRIPT_MARKER]).toBe(thanksgiving2026.id);

    // Unreadable session storage counts as "already seen": no flyby, theme stays.
    const blockedSession = runInlineScript(script, MID_SEASON, { sessionStorage: "throws" });
    expect(blockedSession.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");
    expect(blockedSession.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
  });

  test("the flyby is only spent on a page with a scoped banner", () => {
    const script = buildSeasonalThemeScript(thanksgiving2026);
    const session: Record<string, string> = {};

    const lander = runInlineScript(script, MID_SEASON, { banner: false, sessionStorage: session });
    expect(lander.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");
    expect(lander.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
    expect(lander.timers).toEqual([]);
    expect(session).toEqual({});

    const home = runInlineScript(script, MID_SEASON, { sessionStorage: session });
    expect(home.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(true);
    expect(session[getSeasonalFlybyStorageKey(thanksgiving2026)]).toBe("1");
  });

  test("while the document is loading the flyby waits for DOMContentLoaded", () => {
    const script = buildSeasonalThemeScript(thanksgiving2026);
    const session: Record<string, string> = {};
    const loading = runInlineScript(script, MID_SEASON, { readyState: "loading", sessionStorage: session });

    expect(loading.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");
    expect(loading.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
    expect(session).toEqual({});
    expect(loading.listeners.map(({ options, type }) => ({ options, type }))).toEqual([
      { options: { once: true }, type: "DOMContentLoaded" },
    ]);

    loading.readyState = "interactive";
    loading.listeners[0].callback();
    expect(loading.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(true);
    expect(session[getSeasonalFlybyStorageKey(thanksgiving2026)]).toBe("1");
    expect(loading.timers.map(({ delay }) => delay)).toEqual([SEASONAL_FLYBY_DURATION_MS]);

    // Deferred check still respects a missing banner.
    const noBanner = runInlineScript(script, MID_SEASON, { banner: false, readyState: "loading", sessionStorage: {} });
    noBanner.listeners[0].callback();
    expect(noBanner.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);
  });

  test("inline config escapes < so it cannot close the <script> element", () => {
    const hostile: SeasonalTheme = {
      ...thanksgiving2026,
      id: "</script><script>alert(1)</script><!--",
    };
    const script = buildSeasonalThemeScript(hostile);
    const config = script.slice(script.lastIndexOf(")(") + 2);

    expect(config).toContain("\\u003c/script>");
    expect(config).not.toContain("<");
    expect(script).not.toMatch(/<\/script|<!--/iu);

    // Still valid JS that round-trips the original value.
    const session: Record<string, string> = {};
    const result = runInlineScript(script, MID_SEASON, { sessionStorage: session });
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

  test("peakOn is Thanksgiving Day (the fourth Thursday), inside the window", () => {
    expect(thanksgiving2026.peakOn).toBe("2026-11-26");
    expect(new Date(`${thanksgiving2026.peakOn}T12:00:00Z`).getUTCDay()).toBe(4);
    expect(Number(thanksgiving2026.peakOn.slice(-2))).toBeGreaterThan(21);
    expect(thanksgiving2026.peakOn >= thanksgiving2026.startsOn).toBe(true);
    expect(thanksgiving2026.peakOn <= thanksgiving2026.endsOn).toBe(true);
  });

  test("inline <head> script marks the peak day on the academy calendar only", () => {
    const script = buildSeasonalThemeScript(thanksgiving2026);
    const peak = (now: string, env: Partial<FakeEnvironment> = {}) => {
      const state = runInlineScript(script, now, { sessionStorage: {}, ...env });

      return { peak: state.attributes.has(SEASONAL_PEAK_ATTRIBUTE), state };
    };

    // Nov 26 in Los Angeles, from just after midnight to just before the next one.
    const early = peak("2026-11-26T00:05:00-08:00");
    expect(early.peak).toBe(true);
    expect(early.state.attributes.get(SEASONAL_PEAK_ATTRIBUTE)).toBe("");
    expect(early.state.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");
    expect(early.state.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(true);
    // 23:30 Pacific is already Nov 27 in UTC.
    expect(peak("2026-11-27T07:30:00Z").peak).toBe(true);

    // Nov 25 Pacific, including when it is already Nov 26 in UTC.
    const dayBefore = peak("2026-11-25T23:59:00-08:00");
    expect(dayBefore.peak).toBe(false);
    expect(dayBefore.state.attributes.get(SEASONAL_THEME_ATTRIBUTE)).toBe("thanksgiving");
    expect(peak("2026-11-26T03:00:00Z").peak).toBe(false);
    expect(peak(MID_SEASON).peak).toBe(false);
    // The day after is still in season, just not the peak.
    expect(peak("2026-11-27T10:00:00-08:00").peak).toBe(false);

    // Over: nothing at all.
    expect([...peak("2026-12-01T00:05:00-08:00").state.attributes.keys()]).toEqual([]);

    // Reduced motion keeps the (static) peak flourish but skips the flyby.
    const reduced = peak("2026-11-26T12:00:00-08:00", { reducedMotion: true });
    expect(reduced.peak).toBe(true);
    expect(reduced.state.attributes.has(SEASONAL_FLYBY_ATTRIBUTE)).toBe(false);

    // Opted out: no gate at all, peak included.
    const optedOut = peak("2026-11-26T12:00:00-08:00", {
      localStorage: { [SEASONAL_OPT_OUT_STORAGE_KEY]: SEASONAL_OPT_OUT_VALUE },
    });
    expect([...optedOut.state.attributes.keys()]).toEqual([]);
  });
});

test.describe("seasonal theme: calendar window in the browser", () => {
  // UTC host clock: the Nov 30 23:30 Pacific case is already Dec 1 locally.
  test.use({ timezoneId: "UTC" });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const { expected, peak = false, when } of [
    { expected: false, when: "2026-10-31T23:30:00-07:00" },
    { expected: true, when: "2026-11-01T00:05:00-07:00" },
    { expected: true, when: "2026-11-25T23:30:00-08:00" },
    { expected: true, peak: true, when: "2026-11-26T00:05:00-08:00" },
    { expected: true, peak: true, when: "2026-11-26T23:30:00-08:00" },
    { expected: true, when: "2026-11-30T23:30:00-08:00" },
    { expected: false, when: "2026-12-01T00:05:00-08:00" },
  ]) {
    test(`${when} Pacific is ${expected ? "on" : "off"}${peak ? " (peak day)" : ""}`, async ({ page }) => {
      test.skip(expected && RETIRED, RETIRED_REASON);
      const assetRequests = trackSeasonalAssetRequests(page);

      await openAt(page, "/", when);

      if (!expected) {
        await assertSeasonOff(page, assetRequests);
        return;
      }

      expect(await seasonAttribute(page)).toBe("thanksgiving");
      expect(await page.locator("html").getAttribute(SEASONAL_PEAK_ATTRIBUTE)).toBe(peak ? "" : null);
      await scrollToBottom(page);
      await expect(page.locator(".rda-seasonal-footer")).toBeVisible();
      await expect(mascotButton(page)).toBeVisible();
    });
  }

  test("the served inline script works on its own, before the app bundle", async ({ page }) => {
    test.skip(RETIRED, RETIRED_REASON);
    // No React: only the prerendered <head> script can set the attribute.
    await page.route(/\/_next\/static\/chunks\/.*\.js(\?|$)/u, (route) => route.abort());
    await page.clock.install({ time: new Date(MID_SEASON) });
    await page.clock.pauseAt(new Date(MID_SEASON));
    await open(page, "/");

    await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "thanksgiving");
    await expect(page.locator("html")).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    expect(await page.evaluate((marker) => (window as unknown as Record<string, unknown>)[marker], SEASONAL_SCRIPT_MARKER)).toBe(
      thanksgiving2026.id,
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
      const response = await openAt(page, path, MID_SEASON);

      expect(response?.status()).toBe(200);
      expect(await seasonAttribute(page)).toBe("thanksgiving");
      await expect(page.locator(`[${SEASONAL_SCOPE_ATTRIBUTE}="true"]`)).toHaveCount(1);
      await scrollToBottom(page);
      await expect(page.locator(".rda-seasonal-footer")).toBeVisible();
      await expect(page.locator(".rda-seasonal-harvest-slot")).toHaveCount(3);
      await expect(mascotButton(page)).toBeVisible();

      const box = await mascotButton(page).boundingBox();
      expect(box?.width ?? 0, "mascot button has a tappable size").toBeGreaterThanOrEqual(24);
      expect(box?.height ?? 0, "mascot button has a tappable size").toBeGreaterThanOrEqual(24);
    });
  }

  test("hero sprig, falling leaf and divider leaves are drawn as non-interactive pseudo-elements", async ({ page }) => {
    const assetRequests = trackSeasonalAssetRequests(page);

    await openAt(page, "/", MID_SEASON);

    const pseudos = await seasonalPseudoElements(page);
    const sprigs = pseudos.filter(({ selector }) => selector === ".rda-home-hero-copy::before");
    const fallingLeaves = pseudos.filter(({ selector }) => selector === ".rda-home-hero-copy::after");
    const dividerLeaves = pseudos.filter(({ selector }) => selector.startsWith(".rda-section-heading"));

    expect(sprigs.length).toBeGreaterThan(0);
    expect(fallingLeaves.length).toBe(1);
    expect(dividerLeaves.length).toBeGreaterThan(0);

    for (const pseudo of [...sprigs, ...fallingLeaves, ...dividerLeaves]) {
      expect(pseudo.content, pseudo.selector).not.toBe("none");
      expect(pseudo.pointerEvents, pseudo.selector).toBe("none");
    }

    // Divider maple leaf: 20x20.
    for (const state of await dividerStates(page)) {
      expect(state.width).toBe("20px");
      expect(state.height).toBe("20px");
    }

    await expect
      .poll(() => assetRequests.map((url) => new URL(url).pathname).sort())
      .toEqual(
        expect.arrayContaining([`${ASSETS}/leaf-sprig.svg`, `${ASSETS}/maple-leaf.svg`, `${ASSETS}/oak-leaf.svg`]),
      );

    // Course pages carry the divider too.
    await open(page, "/infection-control");
    const courseLeaves = (await seasonalPseudoElements(page)).filter(({ selector }) =>
      selector.startsWith(".rda-section-heading"),
    );
    expect(courseLeaves.length).toBeGreaterThan(0);
    expect(courseLeaves.every(({ content }) => content !== "none")).toBe(true);
  });

  test("decorations are hidden from assistive tech, text-free, and the mascot is the only control", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);

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
    expect(report.focusables).toEqual([MASCOT_LABEL]);
  });

  test("mascot button is reachable with Tab, shows a focus ring, and answers Enter and Space", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    await scrollToBottom(page);

    // Focus whatever precedes the mascot in tab order, then Tab onto it.
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
    }, MASCOT_LABEL);

    expect(hasPrevious).toBe(true);
    await page.keyboard.press("Tab");
    await expect(mascotButton(page)).toBeFocused();

    const ring = await mascotButton(page).evaluate((button) => {
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

    await tossLeaves(page, () => page.keyboard.press("Enter"));
    await expect(page.locator(".rda-seasonal-flying-leaf")).toHaveCount(0, { timeout: 5_000 });

    await tossLeaves(page, () => page.keyboard.press("Space"));
  });

  test("easter egg releases four leaves that clean themselves up", async ({ page }) => {
    await openAt(page, "/contact", MID_SEASON);
    await scrollToBottom(page);

    const leaves = await tossLeaves(page, () => mascotButton(page).click());

    expect(await leaves.evaluateAll((elements) => elements.every((leaf) => leaf.closest('[aria-hidden="true"]')))).toBe(true);
    await expect(mascotButton(page)).toHaveAttribute("data-rda-bursting", /^(odd|even)$/u);

    // Repeated presses restart the burst instead of stacking more leaves.
    for (let press = 0; press < 5; press += 1) {
      await mascotButton(page).click();
      expect(await page.locator(".rda-seasonal-flying-leaf").count()).toBeLessThanOrEqual(4);
    }

    await expect(page.locator(".rda-seasonal-flying-leaf")).toHaveCount(4);
    await expect(page.locator(".rda-seasonal-leaf-burst")).toHaveCount(1);
    await expect(page.locator(".rda-seasonal-flying-leaf")).toHaveCount(0, { timeout: 5_000 });
    await expect(page.locator(".rda-seasonal-leaf-burst")).toHaveCount(0);
    await expect(mascotButton(page)).not.toHaveAttribute("data-rda-bursting", /.*/);
  });

  test("leaf burst is removed on the ~1.9s timer under a controlled clock", async ({ page }) => {
    await page.clock.install({ time: new Date(MID_SEASON) });
    await open(page, "/");
    await scrollToBottom(page);

    await tossLeaves(page, () => mascotButton(page).click());
    await page.clock.runFor(1_000);
    await expect(page.locator(".rda-seasonal-flying-leaf")).toHaveCount(4);
    await page.clock.runFor(1_000);
    await expect(page.locator(".rda-seasonal-flying-leaf")).toHaveCount(0);
  });
});

test.describe("seasonal theme: first-visit banner flyby", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("runs once per session and clears itself after ~8s", async ({ page }) => {
    await page.clock.install({ time: new Date(MID_SEASON) });
    await page.clock.pauseAt(new Date(MID_SEASON));
    const assetRequests = trackSeasonalAssetRequests(page);

    await open(page, "/");

    const html = page.locator("html");

    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    await expect(html).not.toHaveAttribute(SEASONAL_PEAK_ATTRIBUTE, /.*/);

    // Inline leaves in the banner sky, not a ::after mask.
    const sky = page.locator(`.rda-promo-banner > [data-rda-seasonal="banner"]`);
    await expect(sky).toHaveCount(1);
    await expect(sky).toHaveAttribute("aria-hidden", "true");
    expect(await sky.evaluate((element) => window.getComputedStyle(element).pointerEvents)).toBe("none");
    expect(
      await page.locator(".rda-promo-banner").evaluate((banner) => window.getComputedStyle(banner, "::after").content),
    ).toBe("none");

    const gust = ".rda-seasonal-banner-leaf:not(.rda-seasonal-banner-leaf-peak)";
    await expect.poll(() => page.locator(gust).count()).toBe(3);
    for (let index = 0; index < 3; index += 1) {
      const leaf = `${gust} >> nth=${index}`;
      await expect.poll(() => animationNames(page, leaf)).toEqual(["rda-seasonal-banner-gust"]);
      expect(await animationNames(page, `${leaf} >> .rda-seasonal-tumbling-leaf`)).toEqual(["rda-seasonal-tumble"]);
    }
    // The peak-day gust stays parked off-peak.
    expect(await animationNames(page, ".rda-seasonal-banner-leaf-peak")).toEqual([]);

    expect(await bannerLeavesAtFlybyEnd(page)).toEqual([
      { gone: true, peak: false },
      { gone: true, peak: false },
      { gone: true, peak: false },
    ]);

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
    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "thanksgiving");
    expect(await animationNames(page, ".rda-seasonal-banner-sky", { subtree: true })).toEqual([]);
    // The banner leaves are inline SVG: the flyby fetches no seasonal files.
    expect(assetRequests.filter((url) => new URL(url).pathname.includes("banner"))).toEqual([]);

    // Same tab, later pages: sessionStorage remembers the flyby.
    await open(page, "/contact");
    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "thanksgiving");
    await expect(html).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(html).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
  });

  test("a page without a scoped banner does not spend the flyby", async ({ page }) => {
    await page.clock.install({ time: new Date(MID_SEASON) });
    await page.clock.pauseAt(new Date(MID_SEASON));
    const flybyKey = getSeasonalFlybyStorageKey(thanksgiving2026);
    const html = page.locator("html");

    await open(page, "/lp/dental-assisting-enroll");
    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "thanksgiving");
    await expect(html).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), flybyKey)).toBeNull();

    await open(page, "/");
    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), flybyKey)).toBe("1");
  });

  test("never runs with prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openAt(page, "/", MID_SEASON);

    await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "thanksgiving");
    await expect(page.locator("html")).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
  });
});

test.describe("seasonal theme: peak day (Thanksgiving)", () => {
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

  function sun(page: Page) {
    return page.locator(".rda-seasonal-banner-sky .rda-seasonal-sun").evaluate((element) => {
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

  function steam(page: Page) {
    return page.locator(".rda-seasonal-harvest-pie .rda-pie-steam").evaluate((element) => ({
      animations: element
        .getAnimations({ subtree: true })
        .map((animation) => (animation as CSSAnimation).animationName)
        .sort(),
      opacity: window.getComputedStyle(element).opacity,
    }));
  }

  test(`on Thanksgiving the harvest sun glows (>=${SUN_MIN_WIDTH}px only), a second gust follows and the pie steams`, async ({ page }) => {
    await openPinned(page, PEAK_DAY, 1280);
    const html = page.locator("html");

    await expect(html).toHaveAttribute(SEASONAL_PEAK_ATTRIBUTE, "");
    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");

    const wide = await sun(page);
    expect(wide.display).toBe("block");
    expect(wide.width).toBeGreaterThan(10);
    expect(wide.height).toBeGreaterThan(10);
    expect(wide.insideBanner).toBe(true);

    await expect
      .poll(() => animationNames(page, ".rda-seasonal-banner-leaf-peak >> nth=0"))
      .toEqual(["rda-seasonal-banner-gust"]);
    expect(await animationNames(page, ".rda-seasonal-banner-leaf-peak >> nth=1")).toEqual(["rda-seasonal-banner-gust"]);
    expect(await page.locator(".rda-seasonal-banner-leaf").count()).toBe(5);

    // Steam rises from the pie on the day itself (paused while the footer is off screen).
    const peakSteam = await steam(page);
    expect(Number(peakSteam.opacity)).toBeGreaterThan(0.5);
    expect(peakSteam.animations).toEqual(["rda-seasonal-steam", "rda-seasonal-steam"]);

    // Every leaf of both gusts is out of sight by the time the flyby attribute goes.
    for (const width of [1280, 390]) {
      await page.setViewportSize({ height: 900, width });
      const leaves = await bannerLeavesAtFlybyEnd(page);
      expect(leaves, `${width}px`).toHaveLength(5);
      expect(leaves.every(({ gone }) => gone), `${width}px`).toBe(true);
      expect(leaves.filter(({ peak }) => peak), `${width}px`).toHaveLength(2);
    }

    for (const width of [SUN_MIN_WIDTH, 1440]) {
      await page.setViewportSize({ height: 900, width });
      expect((await sun(page)).display, `${width}px`).toBe("block");
    }

    for (const width of [SUN_MIN_WIDTH - 1, 768, 390, 320]) {
      await page.setViewportSize({ height: 900, width });
      expect((await sun(page)).display, `${width}px`).toBe("none");
    }
  });

  test("the day before there is no sun, no second gust and no steam", async ({ page }) => {
    await openPinned(page, DAY_BEFORE_PEAK, 1440);
    const html = page.locator("html");

    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "thanksgiving");
    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    await expect(html).not.toHaveAttribute(SEASONAL_PEAK_ATTRIBUTE, /.*/);
    expect((await sun(page)).display).toBe("none");
    await expect
      .poll(() => animationNames(page, ".rda-seasonal-banner-leaf:not(.rda-seasonal-banner-leaf-peak) >> nth=0"))
      .toEqual(["rda-seasonal-banner-gust"]);
    expect(await animationNames(page, ".rda-seasonal-banner-leaf-peak >> nth=0")).toEqual([]);
    expect(
      await page
        .locator(".rda-seasonal-banner-leaf-peak")
        .first()
        .evaluate((element) => window.getComputedStyle(element).opacity),
    ).toBe("0");
    expect(await steam(page)).toEqual({ animations: [], opacity: "0" });
  });
});

test.describe("seasonal theme: hero sprig and falling leaf", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("a sprig sits in the corner and one leaf falls once, then is gone", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/", MID_SEASON);

    const sprig = (await heroArt(page, "::before"))!;
    expect(sprig.content).toBe('""');
    expect(sprig.pointerEvents).toBe("none");
    expect(sprig.backgroundImage).toContain(`${ASSETS}/leaf-sprig.svg`);
    expect(sprig.animations).toEqual([]);

    const leaf = (await heroArt(page, "::after"))!;
    expect(leaf.content).toBe('""');
    expect(leaf.pointerEvents).toBe("none");
    expect(leaf.backgroundImage).toContain(`${ASSETS}/oak-leaf.svg`);
    expect(leaf.animations).toEqual([{ iterations: 1, name: "rda-seasonal-leaf-fall" }]);

    // After its one fall the leaf is transparent: nothing loops in the hero.
    await finishHeroLeaf(page);
    await expect.poll(async () => (await heroArt(page, "::after"))!.opacity).toBe("0");

    // Hover sways the sprig once.
    await page.locator(".rda-home-hero").first().hover();
    await expect.poll(async () => (await heroArt(page, "::before"))!.animations.map(({ name }) => name)).toEqual([
      "rda-seasonal-sway",
    ]);
  });

  for (const viewport of layoutWidths) {
    test(`sprig and falling leaf stay clear of hero text and controls at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await openAt(page, "/", MID_SEASON);
      await expect.poll(async () => (await heroArt(page, "::before"))?.content).toBe('""');

      const sprig = (await heroArt(page, "::before"))!;
      const leaf = (await heroArt(page, "::after"))!;

      for (const art of [sprig, leaf]) {
        expect(art.box.left).toBeGreaterThanOrEqual(0);
        expect(art.box.right).toBeLessThanOrEqual(art.viewportWidth);
      }

      const collisions = await page.evaluate(findInkCollisions, {
        arts: [
          { box: sprig.box, label: "hero sprig" },
          { box: leaf.box, label: "falling leaf path" },
        ],
        boxes: false,
        exclude: "",
        root: ".rda-home-hero",
        tolerance: 1,
      });

      recordCollisions(testInfo, `hero sprig @${viewport.width}`, collisions);
      expect(collisions, "hero sprig or leaf overlaps hero text or controls").toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        "horizontal overflow",
      ).toBe(true);
    });
  }
});

test.describe("seasonal theme: divider leaves", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const path of ["/", "/infection-control", "/contact"]) {
    for (const viewport of [{ height: 844, width: 390 }, { height: 900, width: 1440 }]) {
      test(`leaves drift down with the scroll and settle in the notch on ${path} at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await openAt(page, path, MID_SEASON);

        const count = (await dividerStates(page)).length;
        expect(count).toBeGreaterThan(0);

        let checkedBefore = 0;

        for (let index = 0; index < count; index += 1) {
          // Park the heading just below the fold: not drifted in yet.
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
            // Static fallback: never hidden, never caught mid-fall.
            expect(isSettledLeaf(before), `clipped divider ${index} rests: ${JSON.stringify(before)}`).toBe(true);
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
          expect(isSettledLeaf(after), `divider ${index} settled: ${JSON.stringify(after)}`).toBe(true);
        }

        expect(checkedBefore).toBeGreaterThan(0);
      });
    }
  }
});

test.describe("seasonal theme: footer mascot", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context, page }) => {
    await isolate(context);
    await page.setViewportSize({ height: 900, width: 1280 });
  });

  test("hides until the footer scrolls into view, peeks once, and not again this session", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    const mascot = mascotButton(page);

    await expect(mascot).toHaveAttribute("data-rda-mascot", "hiding");
    await expect
      .poll(() => page.locator(".rda-seasonal-mascot-stage").evaluate((stage) => window.getComputedStyle(stage).opacity))
      .toBe("0");
    expect(await peekKeyValue(page)).toBeNull();

    const phases = await recordMascotPhases(page);
    await scrollToFooterDecor(page);

    await expect.poll(phases).toContain("peek");
    expect(await peekKeyValue(page)).toBe("1");
    await expect(mascot).toHaveAttribute("data-rda-mascot", /^(idle|hint)$/u, { timeout: 5_000 });
    expect(
      await page.locator(".rda-seasonal-mascot-stage").evaluate((stage) => window.getComputedStyle(stage).opacity),
    ).toBe("1");

    // Same tab, next page: already introduced, so no hiding and no second peek.
    await open(page, "/contact");
    await waitForFooterHydration(page);
    await expect(mascot).toHaveAttribute("data-rda-mascot", "idle");
    const nextPhases = await recordMascotPhases(page);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await page.waitForTimeout(1_000);
    expect(await nextPhases()).not.toContain("peek");
    expect(await nextPhases()).not.toContain("hiding");
  });

  test("a footer already on screen at load is never hidden", async ({ context, page: measure }) => {
    await openAt(measure, "/contact", MID_SEASON);
    const height = await measure.evaluate(() => document.documentElement.scrollHeight);

    // A fresh tab (no peek spent) with a window tall enough to show the whole page.
    const page = await context.newPage();
    await page.setViewportSize({ height: Math.min(height + 200, 6_000), width: 1280 });
    await openAt(page, "/contact", MID_SEASON);
    expect(
      await footerDecor(page).evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight),
    ).toBe(true);
    await waitForFooterHydration(page);
    const phases = await recordMascotPhases(page);

    await page.waitForTimeout(500);
    expect(await phases()).toEqual(["idle"]);
    expect(await peekKeyValue(page)).toBeNull();
  });

  test("keyboard focus reveals a hiding mascot at once and counts as the session's peek", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    const mascot = mascotButton(page);

    await expect(mascot).toHaveAttribute("data-rda-mascot", "hiding");

    // Focus without scrolling, so only the focus can be what reveals it.
    await mascot.evaluate((button) => (button as HTMLElement).focus({ preventScroll: true }));
    await expect(mascot).toBeFocused();
    await expect(mascot).toHaveAttribute("data-rda-mascot", "peek");
    expect(
      await footerDecor(page).evaluate((element) => element.getBoundingClientRect().top > window.innerHeight),
      "footer still off screen",
    ).toBe(true);
    expect(await peekKeyValue(page)).toBe("1");

    await open(page, "/contact");
    await waitForFooterHydration(page);
    await expect(mascot).toHaveAttribute("data-rda-mascot", "idle");
  });

  test("an untouched mascot wiggles once as a hint; after a press it never does", async ({ browser }) => {
    async function phasesAfterPeek(press: boolean) {
      const context = await browser.newContext({ viewport: { height: 900, width: 1280 } });

      try {
        await isolate(context);
        const page = await context.newPage();

        await openAt(page, "/", MID_SEASON);
        await expect(mascotButton(page)).toHaveAttribute("data-rda-mascot", "hiding");
        const phases = await recordMascotPhases(page);

        await scrollToFooterDecor(page);
        await expect.poll(phases).toContain("peek");

        if (press) {
          await mascotButton(page).click();
          await expect(mascotButton(page)).toHaveAttribute("data-rda-mascot", "idle");
        }

        // Peek (1.4s) + hint delay (2.6s) + hint (1s), with slack.
        await page.waitForTimeout(6_000);

        return { final: await mascotButton(page).getAttribute("data-rda-mascot"), phases: await phases() };
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

  test("a press gasps, fans the feathers and tosses four leaves along curved offset-paths that clean up", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    const mascot = mascotButton(page);
    const mouths = () =>
      page.locator(".rda-seasonal-mascot-art").evaluate((svg) => ({
        gasp: window.getComputedStyle(svg.querySelector(".rda-mascot-mouth-gasp")!).opacity,
        smile: window.getComputedStyle(svg.querySelector(".rda-mascot-mouth-smile")!).opacity,
      }));

    expect(await mouths()).toEqual({ gasp: "0", smile: "1" });

    await tossLeaves(page, () => mascot.click());
    await expect(mascot).toHaveAttribute("data-rda-mood", "surprised");
    // Each press flips data-rda-bursting so the gobble squash replays.
    const firstBurst = await mascot.getAttribute("data-rda-bursting");
    expect(firstBurst).toMatch(/^(odd|even)$/u);
    await expect.poll(mouths).toEqual({ gasp: "1", smile: "0" });
    expect(await animationNames(page, ".rda-seasonal-mascot-art .rda-mascot-fan")).toEqual([
      firstBurst === "odd" ? "rda-seasonal-fan-display" : "rda-seasonal-fan-display-again",
    ]);

    const burst = await page.locator(".rda-seasonal-leaf-burst").evaluate((element) => ({
      ariaHidden: element.getAttribute("aria-hidden"),
      leaves: Array.from(element.querySelectorAll<HTMLElement>(".rda-seasonal-flying-leaf")).map((leaf) => ({
        animations: leaf.getAnimations().map((animation) => (animation as CSSAnimation).animationName).sort(),
        art: leaf.querySelectorAll("svg.rda-seasonal-flying-leaf-art").length,
        offsetPath: window.getComputedStyle(leaf).offsetPath,
      })),
      pointerEvents: window.getComputedStyle(element).pointerEvents,
    }));

    expect(burst.ariaHidden).toBe("true");
    expect(burst.pointerEvents).toBe("none");
    expect(burst.leaves).toHaveLength(4);
    expect(new Set(burst.leaves.map(({ offsetPath }) => offsetPath)).size).toBe(4);

    for (const leaf of burst.leaves) {
      expect(leaf.offsetPath).toMatch(/^path\("M ?0 0 ?C/u);
      expect(leaf.art).toBe(1);
      expect(leaf.animations).toEqual(["rda-seasonal-leaf-spin", "rda-seasonal-leaf-toss"]);
    }

    await mascot.click();
    await expect(mascot).toHaveAttribute("data-rda-bursting", firstBurst === "odd" ? "even" : "odd");
    // "odd" plays rda-seasonal-gobble, "even" rda-seasonal-gobble-again: a new name restarts the squash.
    expect(
      (await animationNames(page, ".rda-seasonal-mascot-art")).some((name) => name.startsWith("rda-seasonal-gobble")),
    ).toBe(true);
    await expect(page.locator(".rda-seasonal-leaf-burst")).toHaveCount(1);

    // The gasp is brief; the burst clears itself after ~2s.
    await expect(mascot).not.toHaveAttribute("data-rda-mood", /.*/, { timeout: 2_000 });
    await expect.poll(mouths).toEqual({ gasp: "0", smile: "1" });
    await expect(page.locator(".rda-seasonal-leaf-burst")).toHaveCount(0, { timeout: 4_000 });
  });

  test("every third press adds a spin, alternating direction", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await waitForFooterHydration(page);
    const mascot = mascotButton(page);

    await mascot.click();
    await mascot.click();
    await expect(page.locator(".rda-seasonal-leaf-burst")).toHaveCount(1);
    await expect(mascot).not.toHaveAttribute("data-rda-spin", /.*/);

    await mascot.click();
    await expect(mascot).toHaveAttribute("data-rda-spin", "odd");
    expect(await animationNames(page, ".rda-seasonal-mascot-stage")).toContain("rda-seasonal-mascot-spin-odd");

    await mascot.click();
    await mascot.click();
    await expect(mascot).toHaveAttribute("data-rda-spin", "odd");
    await mascot.click();
    await expect(mascot).toHaveAttribute("data-rda-spin", "even");
    expect(await animationNames(page, ".rda-seasonal-mascot-stage")).toContain("rda-seasonal-mascot-spin-even");
  });

  test("footer loops rest while the footer is off screen", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
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
    expect(loops).toEqual(["rda-seasonal-drift", "rda-seasonal-strut", "rda-seasonal-tumble"]);
    // Blinks are scheduled by JS (data-rda-blink), not an endless CSS loop.
    expect(loops).not.toContain("rda-seasonal-blink");
    expect(await playStates()).toEqual(["paused"]);

    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await expect.poll(playStates).toEqual(["running"]);

    await scrollToTop(page);
    await expect(footerDecor(page)).not.toHaveAttribute("data-rda-awake", /.*/);
    await expect.poll(playStates).toEqual(["paused"]);
  });

  test("the mascot blinks now and then while awake, never while off screen", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    await waitForFooterHydration(page);
    const mascot = mascotButton(page);
    const blinks = await recordAttribute(page, ".rda-seasonal-mascot-button", "data-rda-blink");

    // Off screen: no blink scheduled (longest gap is ~7s).
    await page.waitForTimeout(7_500);
    expect((await blinks()).filter((value) => value !== null)).toEqual([]);

    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await expect.poll(async () => (await blinks()).some((value) => value !== null), { timeout: 10_000 }).toBe(true);
    // Each blink ends (the attribute is removed again).
    await expect(mascot).not.toHaveAttribute("data-rda-blink", /.*/, { timeout: 2_000 });
    // The recorder reports mutations asynchronously; wait for the removal to land.
    await expect.poll(async () => (await blinks()).at(-1), { timeout: 2_000 }).toBeNull();
  });

  test("a press while the mascot is hiding also spends the session's peek", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    const mascot = mascotButton(page);

    await expect(mascot).toHaveAttribute("data-rda-mascot", "hiding");
    // A synthetic click: no focus, no hover, no scroll.
    await mascot.evaluate((button) => (button as HTMLButtonElement).click());
    await expect(page.locator(".rda-seasonal-leaf-burst")).toHaveCount(1);
    await expect(mascot).not.toHaveAttribute("data-rda-mascot", "hiding");
    expect(await peekKeyValue(page)).toBe("1");
  });

  test("the eyes glance toward a mouse pointer", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await expect(mascotButton(page)).toHaveAttribute("data-rda-mascot", /^(idle|hint)$/u, { timeout: 5_000 });

    const art = (await page.locator(".rda-seasonal-mascot-art").boundingBox())!;
    const centerX = art.x + art.width / 2;
    const centerY = art.y + art.height * 0.38;
    const px = async (axis: "x" | "y") => Number.parseFloat((await mascotLook(page))[axis]) || 0;

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
    await expect.poll(async () => (await mascotLook(page)).x).toBe("0.00px");
  });

  test("the eyes ignore touch (coarse) pointers", async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

    try {
      await isolate(context);
      const page = await context.newPage();

      await openAt(page, "/", MID_SEASON);
      expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(false);
      await scrollToFooterDecor(page);
      await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
      const art = (await page.locator(".rda-seasonal-mascot-art").boundingBox())!;

      await page.mouse.move(art.x + 200, art.y);
      await page.mouse.move(art.x - 200, art.y + 50);
      await page.waitForTimeout(400);
      expect(Number.parseFloat((await mascotLook(page)).x) || 0).toBe(0);

      // Hover flourishes are for hover-capable pointers only: once the tap's own
      // fan flare is over, a sticky touch :hover leaves the fan at rest.
      expect(await page.evaluate(() => window.matchMedia("(hover: hover)").matches)).toBe(false);
      await mascotButton(page).tap();
      await expect(page.locator(".rda-seasonal-leaf-burst")).toHaveCount(0, { timeout: 4_000 });
      await page.waitForTimeout(400);
      expect(
        await page.locator(".rda-seasonal-mascot-art .rda-mascot-fan").evaluate((fan) => window.getComputedStyle(fan).scale),
      ).toBe("none");
    } finally {
      await context.close();
    }
  });
});

test.describe("seasonal theme: footer drifting leaves", () => {
  test.skip(RETIRED, RETIRED_REASON);
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const path of ["/", "/contact", "/faqs-1", `${RESOURCES_BASE_PATH}/${firstResource.slug}`]) {
    for (const viewport of layoutWidths) {
      test(`drifting leaves stay in the footer's top padding on ${path} at ${viewport.width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await openAt(page, path, MID_SEASON);
        await scrollToBottom(page);

        const drift = await page.locator('.rda-live-footer > [data-rda-seasonal="drift"]').evaluate((element) => {
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

        expect(drift.ariaHidden).toBe("true");
        expect(drift.text).toBe("");
        expect(drift.pointerEvents).toBe("none");
        expect(drift.overflow).toBe("hidden");
        expect(drift.zIndex).toBe("-1");
        expect(drift.box.top).toBeGreaterThanOrEqual(drift.footer.top - 0.5);
        expect(drift.box.left).toBeGreaterThanOrEqual(drift.footer.left - 0.5);
        expect(drift.box.right).toBeLessThanOrEqual(drift.footer.right + 0.5);
        expect(drift.box.bottom - drift.footer.top).toBeLessThanOrEqual(drift.footer.paddingTop);

        const collisions = await page.evaluate(findInkCollisions, {
          arts: [{ box: drift.box, label: "drifting leaves" }],
          exclude: "[data-rda-seasonal], .rda-whatsapp-fab, [data-rda-whatsapp]",
          root: ".rda-live-footer",
          tolerance: 0,
        });

        recordCollisions(testInfo, `drift ${path} @${viewport.width}`, collisions);
        expect(collisions, "drifting leaves overlap footer text or controls").toEqual([]);
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

  test("only the leaf fade animates; decorations stay static", async ({ page }) => {
    await openAt(page, "/", MID_SEASON);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await page.locator(".rda-home-hero").first().hover().catch(() => undefined);
    await tossLeaves(page, () => mascotButton(page).click());
    // Three presses would earn a spin with motion; reduced motion skips it.
    await mascotButton(page).click();
    await mascotButton(page).click();
    await expect(page.locator(".rda-seasonal-leaf-burst")).toHaveCount(1);
    expect(await mascotButton(page).getAttribute("data-rda-spin")).toBeNull();

    const animations = await runningSeasonalAnimations(page);

    expect(animations.length).toBeGreaterThan(0);
    expect(animations.filter(({ infinite }) => infinite)).toEqual([]);
    expect([...new Set(animations.map(({ name }) => name))]).toEqual(["rda-seasonal-leaf-fade"]);
  });

  test("the mascot never hides or peeks, and the eyes do not track the pointer", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/", MID_SEASON);
    await waitForFooterHydration(page);
    await page.waitForTimeout(300);

    const phases = await recordMascotPhases(page);

    expect(await phases()).toEqual(["idle"]);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");

    const blinks = await recordAttribute(page, ".rda-seasonal-mascot-button", "data-rda-blink");
    const art = (await page.locator(".rda-seasonal-mascot-art").boundingBox())!;
    await page.mouse.move(art.x + art.width / 2 + 400, art.y + 20);
    await page.mouse.move(art.x + art.width / 2 - 400, art.y + 20);
    // Longer than the longest blink gap (~7s).
    await page.waitForTimeout(7_500);

    expect((await blinks()).filter((value) => value !== null)).toEqual([]);

    expect(await phases()).toEqual(["idle"]);
    expect(await peekKeyValue(page)).toBeNull();
    expect(Number.parseFloat((await mascotLook(page)).x) || 0).toBe(0);
    expect(Number.parseFloat((await mascotLook(page)).y) || 0).toBe(0);
    expect(
      await page.locator(".rda-seasonal-mascot-stage").evaluate((stage) => window.getComputedStyle(stage).opacity),
    ).toBe("1");
  });

  test("no seasonal loop runs anywhere: no falling leaf, divider leaves sit in their notches", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/", MID_SEASON);
    await scrollToFooterDecor(page);
    await expect(footerDecor(page)).toHaveAttribute("data-rda-awake", "true");
    await page.waitForTimeout(300);

    expect(await runningSeasonalAnimations(page)).toEqual([]);

    await scrollToTop(page);
    const sprig = (await heroArt(page, "::before"))!;
    expect(sprig.content).toBe('""');
    expect(sprig.animations).toEqual([]);
    // The falling leaf never lets go: it stays transparent.
    const leaf = (await heroArt(page, "::after"))!;
    expect(leaf.animations).toEqual([]);
    expect(leaf.opacity).toBe("0");

    for (const state of await dividerStates(page)) {
      expect(state.scrollDriven).toBe(false);
      expect(isSettledLeaf(state), JSON.stringify(state)).toBe(true);
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
      expect(await seasonAttribute(page)).toBe(isPrivateSiteRoute(path) ? null : "thanksgiving");
      await expect(page.locator("script#rda-seasonal-theme")).toHaveCount(isPrivateSiteRoute(path) ? 0 : 1);
      await expect(page.locator(`[${SEASONAL_SCOPE_ATTRIBUTE}]`)).toHaveCount(0);
      // Not just hidden: the banner sky, drifting leaves and footer decor are never rendered here.
      await expect(page.locator("[data-rda-seasonal]")).toHaveCount(0);
      await expect(page.locator(".rda-seasonal-banner-sky, .rda-seasonal-drift, .rda-seasonal-footer")).toHaveCount(0);
      await scrollToBottom(page);
      expect(await visibleSeasonalCount(page)).toBe(0);
      await expect(mascotButton(page)).toHaveCount(0);
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

async function notFoundMascot(page: Page) {
  return page.evaluate(() => {
    const h1 = document.querySelector<HTMLElement>(".rda-not-found-content h1");

    if (!h1) return null;

    const style = window.getComputedStyle(h1, "::before");
    const after = window.getComputedStyle(h1, "::after");
    const icon = document.querySelector<SVGElement>(".rda-not-found-content svg:has(+ h1)");
    const rect = h1.getBoundingClientRect();
    const px = (value: string) => Number.parseFloat(value);
    const width = px(style.width);
    // Turkey-tooth art is 108x82.
    const height = Number.isFinite(px(style.height)) ? px(style.height) : (width * 82) / 108;
    // Absolutely positioned against the h1's padding box.
    const left = rect.left + h1.clientLeft + px(style.left);
    const bottom = rect.top + h1.clientTop + h1.clientHeight - px(style.bottom);

    return {
      after: after.content,
      backgroundImage: style.backgroundImage,
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

async function assertNotFoundMascot(page: Page, testInfo: TestInfo, title: string, still: boolean) {
  await expect.poll(async () => (await notFoundMascot(page))?.content).not.toBe("none");

  const mascot = (await notFoundMascot(page))!;
  const art = still ? "turkey-tooth-still.svg" : "turkey-tooth-search.svg";

  expect(mascot.pointerEvents).toBe("none");
  expect(mascot.backgroundImage).toContain(`${ASSETS}/${art}`);
  expect(mascot.box.left).toBeGreaterThanOrEqual(0);
  expect(mascot.box.right).toBeLessThanOrEqual(mascot.viewportWidth);
  expect(mascot.box.top).toBeGreaterThanOrEqual(0);
  // One piece of art only: the heading's ::after stays unused.
  expect(mascot.after).toBe("none");
  // The warning icon steps aside without reflow while the mascot is there.
  expect(mascot.icon).not.toBeNull();
  expect(mascot.icon!.visibility).toBe("hidden");
  expect(mascot.icon!.height).toBeGreaterThan(0);
  expect(mascot.scrollWidth, "horizontal overflow").toBeLessThanOrEqual(mascot.viewportWidth);

  const collisions = await page.evaluate(findInkCollisions, {
    arts: [{ box: mascot.box, label: "404 mascot" }],
    exclude: "",
    root: ".rda-not-found-page",
    tolerance: 1,
  });

  recordCollisions(testInfo, title, collisions);
  expect(collisions, "404 mascot overlaps the heading, icon or copy").toEqual([]);
}

async function assertNoNotFoundMascot(page: Page) {
  const mascot = (await notFoundMascot(page))!;

  expect(mascot.content).toBe("none");
  expect(mascot.after).toBe("none");
  expect(mascot.icon).not.toBeNull();
  expect(mascot.icon!.visibility).toBe("visible");
}

test.describe("seasonal theme: 404 mascot", () => {
  test.skip(RETIRED, RETIRED_REASON);
  // No strut: geometry is read from the resting position.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const { label, path } of notFoundPaths) {
    for (const width of [320, 390, 1280]) {
      test(`turkey-tooth stands above the heading at ${label}, ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ height: width < 768 ? 760 : 900, width });
        const response = await openAt(page, path, MID_SEASON);

        expect(response?.status()).toBe(404);
        await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
        // Next serves 404s as a client-rendered shell: the fallback applies the season.
        await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "thanksgiving");
        await assertNotFoundMascot(page, testInfo, `404 ${label} @${width}`, true);
        expect(await runningSeasonalAnimations(page)).toEqual([]);
        await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
      });
    }
  }
});

test.describe("seasonal theme: 404 mascot with motion", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const width of [320, 390, 1280]) {
    test(`the animated turkey-tooth struts without overflow at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: width < 768 ? 760 : 900, width });
      const response = await openAt(page, "/registration", MID_SEASON);

      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "thanksgiving");
      await expect.poll(async () => (await notFoundMascot(page))?.content).not.toBe("none");

      const names = (await runningSeasonalAnimations(page)).map(({ name }) => name).sort();
      expect(names).toEqual(["rda-seasonal-strut"]);

      // Pin the strut at rest before measuring.
      await page.evaluate(() => {
        for (const animation of document.getAnimations() as CSSAnimation[]) {
          if (animation.animationName === "rda-seasonal-strut") {
            animation.pause();
            animation.currentTime = 0;
          }
        }
      });

      await assertNotFoundMascot(page, testInfo, `404 motion @${width}`, false);
    });
  }
});

test.describe("seasonal theme: 404 out of season", () => {
  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("no mascot after the season", async ({ page }) => {
    await openAt(page, "/registration", AFTER_SEASON);

    await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
    // Give the client fallback a chance to (wrongly) switch the season on.
    await page.waitForTimeout(500);
    expect(await seasonAttribute(page)).toBeNull();
    await assertNoNotFoundMascot(page);
  });

  test("no mascot when opted out mid-season", async ({ context, page }) => {
    await suppressSeasonalTheme(context);
    await openAt(page, "/registration", MID_SEASON);

    await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await seasonAttribute(page)).toBeNull();
    await assertNoNotFoundMascot(page);
  });
});

test.describe("seasonal theme: opt-out and parity", () => {
  test("localStorage opt-out keeps decorations off mid-season", async ({ context, page }) => {
    await isolate(context);
    await suppressSeasonalTheme(context);
    const assetRequests = trackSeasonalAssetRequests(page);

    await openAt(page, "/", MID_SEASON);
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
    for (const kind of ["banner", "drift", "footer"]) {
      await expect(page.locator(`[data-rda-seasonal="${kind}"]`)).toBeHidden();
    }
    expect(await page.locator(".rda-seasonal-sun").evaluate((element) => window.getComputedStyle(element).display)).toBe(
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
    await assertNoNotFoundMascot(page);
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

        await openAt(page, "/", MID_SEASON);
        expect(await seasonAttribute(page)).toBe(seasonal ? "thanksgiving" : null);
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
  // Reduced motion stops the mascot's strut and the divider leaves, so boxes are stable.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("the collision check itself catches text, controls and hairlines under the art", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await openAt(page, "/contact", MID_SEASON);
    await scrollToBottom(page);

    const art = (await page.locator(".rda-seasonal-mascot-art").boundingBox())!;
    const box = { bottom: art.y + art.height, left: art.x, right: art.x + art.width, top: art.y };
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
        arts: [{ box, label: "mascot" }],
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
    // The peak day's pie steam, on the busiest footers.
    ...layoutWidths.flatMap((viewport) => ["/", "/contact", "/faqs-1"].map((path) => ({ path, peak: true, viewport }))),
  ];

  for (const { path, peak, viewport } of matrix) {
    test(`footer decor clears page ink on ${path} at ${viewport.width}px${peak ? " (peak day)" : ""}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const response = await openAt(page, path, peak ? PEAK_DAY : MID_SEASON);

      expect(response?.status()).toBe(200);
      await scrollToBottom(page);
      await scrollToBottom(page);
      await mascotButton(page).scrollIntoViewIfNeeded();
      await expect(mascotButton(page)).toBeVisible();

      expect(await page.locator("html").getAttribute(SEASONAL_PEAK_ATTRIBUTE)).toBe(peak ? "" : null);

      const arts = await page.evaluate(() =>
        Array.from(document.querySelectorAll<Element>(".rda-seasonal-harvest-art, .rda-seasonal-mascot-art")).map(
          (element, index) => {
            const rect = element.getBoundingClientRect();
            const kind = element.classList.contains("rda-seasonal-mascot-art") ? "mascot" : "harvest";

            return {
              box: { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top },
              label: `${kind}-${index + 1}`,
            };
          },
        ),
      );

      expect(arts.filter(({ label }) => label.startsWith("harvest")).length).toBe(3);
      expect(arts.filter(({ label }) => label.startsWith("mascot")).length).toBe(1);

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
        // The harvest takes the pointer (hover wobble), so nothing interactive may sit under it.
        const interactive = 'a[href], button, input, select, textarea, label, summary, [role="button"], [tabindex]';
        const harvestCoversControls = Array.from(document.querySelectorAll(".rda-seasonal-harvest-slot")).some((slot) => {
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
          harvestCoversControls,
          scrollWidth: document.documentElement.scrollWidth,
        };
      }, arts);

      expect.soft(report.scrollWidth, "horizontal overflow").toBeLessThanOrEqual(report.innerWidth);
      expect.soft(report.artOutsideViewport, "decor art leaves the viewport").toBe(false);
      expect.soft(report.decorPointerEvents).toBe("none");
      expect.soft(report.harvestCoversControls, "the harvest must not cover links or controls").toBe(false);
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
    { label: "mid-season", when: MID_SEASON },
    { label: "the peak day", when: PEAK_DAY },
  ]) {
    test(`homepage logs no errors or hydration warnings on ${label}`, async ({ page }) => {
      const problems = collectProblems(page);

      await page.setViewportSize({ height: 900, width: 1280 });
      await openAt(page, "/", when);
      expect(await seasonAttribute(page)).toBe("thanksgiving");
      await page.locator(".rda-home-hero-copy").hover();
      await scrollToFooterDecor(page);
      await expect.poll(() => page.locator(".rda-seasonal-mascot-button").getAttribute("data-rda-mascot")).not.toBe(
        "hiding",
      );
      const art = (await page.locator(".rda-seasonal-mascot-art").boundingBox())!;
      await page.mouse.move(art.x + 200, art.y);
      await tossLeaves(page, () => mascotButton(page).click());
      await mascotButton(page).click();
      await mascotButton(page).click();
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
    await expect.poll(async () => (await notFoundMascot(page))?.content).not.toBe("none");
    await page.waitForTimeout(1_000);

    // The 404 status itself is logged as a failed resource load; nothing else may be.
    expect(problems.filter((problem) => !/status of 404/u.test(problem))).toEqual([]);
  });
});
