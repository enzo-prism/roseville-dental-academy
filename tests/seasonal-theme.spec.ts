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
  SEASONAL_SCOPE_ATTRIBUTE,
  SEASONAL_SCRIPT_MARKER,
  SEASONAL_THEME_ATTRIBUTE,
  activeSeasonalTheme,
  buildSeasonalThemeScript,
  getSeasonalFlybyStorageKey,
  getSeasonalLocalDate,
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
const AFTER_SEASON = "2026-11-15T10:00:00-08:00";
const GHOST_LABEL = "Release the Halloween bats";
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
      [".rda-section-heading > span:empty", "::after"],
      [".rda-promo-banner", "::after"],
      [".rda-not-found-content h1", "::before"],
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
  expect(await visibleSeasonalCount(page)).toBe(0);
  await expect(ghostButton(page)).toBeHidden();

  for (const pseudo of await seasonalPseudoElements(page)) {
    expect(pseudo.content, pseudo.selector).toBe("none");
  }

  // Let any late CSS fetches surface before asserting none happened.
  await page.waitForTimeout(250);
  expect(assetRequests).toEqual([]);
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: document.documentElement.scrollHeight }));
  await page.evaluate(
    () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
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

    if (media.has(element.tagName)) {
      inks.push({ box: rect, label: label(element) });
      continue;
    }

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
      `SEASONAL_HTML_ATTRIBUTES = ["${SEASONAL_THEME_ATTRIBUTE}", "${SEASONAL_FLYBY_ATTRIBUTE}"]`,
    );
    expect(shared).toContain(`SEASONAL_SCOPE_ATTRIBUTE = "${SEASONAL_SCOPE_ATTRIBUTE}"`);
    expect(shared).toContain("script#rda-seasonal-theme");

    for (const script of ["scripts/refresh-live-baselines.mjs", "scripts/capture-live-snapshot.mjs"]) {
      expect(readFileSync(resolve(process.cwd(), script), "utf8"), script).toContain("suppressSeasonalTheme(page)");
    }
  });
});

test.describe("seasonal theme: calendar window in the browser", () => {
  // UTC host clock: the Oct 31 23:30 Pacific case is already Nov 1 locally.
  test.use({ timezoneId: "UTC" });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const { expected, when } of [
    { expected: false, when: "2026-09-30T23:30:00-07:00" },
    { expected: true, when: "2026-10-01T00:05:00-07:00" },
    { expected: true, when: "2026-10-31T23:30:00-07:00" },
    { expected: false, when: "2026-11-01T00:05:00-07:00" },
  ]) {
    test(`${when} Pacific is ${expected ? "on" : "off"}`, async ({ page }) => {
      test.skip(expected && RETIRED, RETIRED_REASON);
      const assetRequests = trackSeasonalAssetRequests(page);

      await openAt(page, "/", when);

      if (!expected) {
        await assertSeasonOff(page, assetRequests);
        return;
      }

      expect(await seasonAttribute(page)).toBe("halloween");
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

  test("hero cobweb and divider pumpkins are drawn as non-interactive pseudo-elements", async ({ page }) => {
    const assetRequests = trackSeasonalAssetRequests(page);

    await openAt(page, "/", MID_OCTOBER);

    const pseudos = await seasonalPseudoElements(page);
    const cobwebs = pseudos.filter(({ selector }) => selector.startsWith(".rda-home-hero-copy"));
    const pumpkins = pseudos.filter(({ selector }) => selector.startsWith(".rda-section-heading"));

    expect(cobwebs.length).toBeGreaterThan(0);
    expect(pumpkins.length).toBeGreaterThan(0);

    for (const pseudo of [...cobwebs, ...pumpkins]) {
      expect(pseudo.content, pseudo.selector).not.toBe("none");
      expect(pseudo.pointerEvents, pseudo.selector).toBe("none");
    }

    await expect
      .poll(() => assetRequests.map((url) => new URL(url).pathname).sort())
      .toEqual(
        expect.arrayContaining([
          "/assets/seasonal/halloween-2026/cobweb.svg",
          "/assets/seasonal/halloween-2026/pumpkin.svg",
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
    await expect(ghostButton(page)).toHaveAttribute("data-rda-bursting", "true");

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
    expect(
      (await seasonalPseudoElements(page)).filter(({ selector }) => selector.startsWith(".rda-promo-banner")),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ content: '""', pointerEvents: "none" })]));
    await expect
      .poll(() => assetRequests.some((url) => url.endsWith("/assets/seasonal/halloween-2026/bat.svg")))
      .toBe(true);

    await page.clock.runFor(SEASONAL_FLYBY_DURATION_MS - 500);
    await expect(html).toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, "");
    await page.clock.runFor(1_000);
    await expect(html).not.toHaveAttribute(SEASONAL_FLYBY_ATTRIBUTE, /.*/);
    await expect(html).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");

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

test.describe("seasonal theme: reduced motion", () => {
  test.skip(RETIRED, RETIRED_REASON);
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("only the bat fade animates; decorations stay static", async ({ page }) => {
    await openAt(page, "/", MID_OCTOBER);
    await scrollToBottom(page);
    await page.locator(".rda-home-hero").first().hover().catch(() => undefined);
    await releaseBats(page, () => ghostButton(page).click());

    const animations = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation): animation is CSSAnimation => "animationName" in animation)
        .filter((animation) => animation.animationName.startsWith("rda-seasonal"))
        .filter((animation) => animation.playState === "running")
        .map((animation) => animation.animationName),
    );

    expect(animations.length).toBeGreaterThan(0);
    expect([...new Set(animations)]).toEqual(["rda-seasonal-bat-fade"]);
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

      await openAt(page, path, MID_OCTOBER);

      // Private tools never receive the <head> script; elsewhere the theme is
      // on and only the route's scope keeps decorations out.
      expect(await seasonAttribute(page)).toBe(isPrivateSiteRoute(path) ? null : "halloween");
      await expect(page.locator("script#rda-seasonal-theme")).toHaveCount(isPrivateSiteRoute(path) ? 0 : 1);
      await expect(page.locator(`[${SEASONAL_SCOPE_ATTRIBUTE}]`)).toHaveCount(0);
      await scrollToBottom(page);
      expect(await visibleSeasonalCount(page)).toBe(0);
      await expect(ghostButton(page)).toHaveCount(0);

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
    const rect = h1.getBoundingClientRect();
    const px = (value: string) => Number.parseFloat(value);
    const width = px(style.width);
    const height = Number.isFinite(px(style.height)) ? px(style.height) : (width * 72) / 64;
    // Absolutely positioned against the h1's padding box.
    const left = rect.left + h1.clientLeft + px(style.left);
    const bottom = rect.top + h1.clientTop + h1.clientHeight - px(style.bottom);

    return {
      backgroundImage: style.backgroundImage,
      box: { bottom, left, right: left + width, top: bottom - height },
      content: style.content,
      pointerEvents: style.pointerEvents,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

test.describe("seasonal theme: 404 ghost", () => {
  test.skip(RETIRED, RETIRED_REASON);
  // No bob: geometry is read from the resting position.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  for (const { label, path } of notFoundPaths) {
    for (const width of [320, 390, 1280]) {
      test(`ghost floats above the heading at ${label}, ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ height: width < 768 ? 760 : 900, width });
        const response = await openAt(page, path, MID_OCTOBER);

        expect(response?.status()).toBe(404);
        await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
        // Next serves 404s as a client-rendered shell: the fallback applies the season.
        await expect(page.locator("html")).toHaveAttribute(SEASONAL_THEME_ATTRIBUTE, "halloween");
        await expect.poll(async () => (await notFoundGhost(page))?.content).not.toBe("none");

        const ghost = await notFoundGhost(page);

        expect(ghost).not.toBeNull();
        expect(ghost!.pointerEvents).toBe("none");
        expect(ghost!.backgroundImage).toContain("/assets/seasonal/halloween-2026/ghost.svg");
        expect(ghost!.box.left).toBeGreaterThanOrEqual(0);
        expect(ghost!.box.right).toBeLessThanOrEqual(ghost!.viewportWidth);
        expect(ghost!.box.top).toBeGreaterThanOrEqual(0);

        const collisions = await page.evaluate(findInkCollisions, {
          arts: [{ box: ghost!.box, label: "404 ghost" }],
          exclude: "",
          root: ".rda-not-found-page",
          tolerance: 1,
        });

        recordCollisions(testInfo, `404 ${label} @${width}`, collisions);
        expect(collisions, "404 ghost overlaps the heading, icon or copy").toEqual([]);
        await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
      });
    }
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
    expect((await notFoundGhost(page))?.content).toBe("none");
  });

  test("no ghost when opted out mid-October", async ({ context, page }) => {
    await suppressSeasonalTheme(context);
    await openAt(page, "/registration", MID_OCTOBER);

    await expect(page.getByText("File not found", { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await seasonAttribute(page)).toBeNull();
    expect((await notFoundGhost(page))?.content).toBe("none");
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

  for (const viewport of layoutWidths) {
    for (const path of layoutRoutes) {
      test(`footer decor clears page ink on ${path} at ${viewport.width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        const response = await openAt(page, path, MID_OCTOBER);

        expect(response?.status()).toBe(200);
        await scrollToBottom(page);
        await scrollToBottom(page);
        await ghostButton(page).scrollIntoViewIfNeeded();
        await expect(ghostButton(page)).toBeVisible();

        const arts = await page.evaluate(() =>
          Array.from(
            document.querySelectorAll<SVGElement>(".rda-seasonal-footer-pumpkin, .rda-seasonal-ghost-art"),
          ).map((svg, index) => {
            const rect = svg.getBoundingClientRect();

            return {
              box: { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top },
              label: svg.classList.contains("rda-seasonal-ghost-art")
                ? "ghost"
                : `pumpkin-${index + 1}`,
            };
          }),
        );

        expect(arts.length).toBe(4);

        const collisions = await page.evaluate(findInkCollisions, {
          arts,
          exclude: "[data-rda-seasonal], .rda-whatsapp-fab, [data-rda-whatsapp]",
          root: "body",
          tolerance: 1,
        });

        recordCollisions(testInfo, `${path} @${viewport.width}`, collisions);

        const report = await page.evaluate((artBoxes) => {
          const decor = document.querySelector<HTMLElement>(".rda-seasonal-footer");
          const fab = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
          const fabRect = fab && window.getComputedStyle(fab).display !== "none" ? fab.getBoundingClientRect() : null;
          const overlaps = (a: { bottom: number; left: number; right: number; top: number }, b: DOMRect) =>
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          const pumpkin = document.querySelector<SVGElement>(".rda-seasonal-footer-pumpkin-large");
          const pumpkinRect = pumpkin?.getBoundingClientRect();
          const hit = pumpkinRect
            ? document.elementFromPoint(pumpkinRect.left + pumpkinRect.width / 2, pumpkinRect.top + pumpkinRect.height / 2)
            : null;

          return {
            artOutsideViewport: artBoxes.some(
              ({ box }) => box.left < 0 || box.right > document.documentElement.clientWidth,
            ),
            decorPointerEvents: decor ? window.getComputedStyle(decor).pointerEvents : "missing",
            fabCollision: Boolean(fabRect && artBoxes.some(({ box }) => overlaps(box, fabRect))),
            innerWidth: window.innerWidth,
            pumpkinHitIsDecoration: Boolean(hit?.closest("[data-rda-seasonal]")),
            scrollWidth: document.documentElement.scrollWidth,
          };
        }, arts);

        expect.soft(report.scrollWidth, "horizontal overflow").toBeLessThanOrEqual(report.innerWidth);
        expect.soft(report.artOutsideViewport, "decor art leaves the viewport").toBe(false);
        expect.soft(report.decorPointerEvents).toBe("none");
        expect.soft(report.pumpkinHitIsDecoration, "pumpkins must not intercept clicks").toBe(false);
        expect.soft(report.fabCollision, "footer decor overlaps the WhatsApp button").toBe(false);
        expect.soft(collisions, "footer decor overlaps page ink").toEqual([]);
      });
    }
  }
});

test.describe("seasonal theme: runtime health", () => {
  test.skip(RETIRED, RETIRED_REASON);

  test.beforeEach(async ({ context }) => {
    await isolate(context);
  });

  test("homepage logs no errors or hydration warnings while on", async ({ page }) => {
    const problems: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" || /hydrat/i.test(message.text())) {
        problems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

    await openAt(page, "/", MID_OCTOBER);
    expect(await seasonAttribute(page)).toBe("halloween");
    await scrollToBottom(page);
    await releaseBats(page, () => ghostButton(page).click());
    await page.waitForTimeout(2_500);

    expect(problems).toEqual([]);
  });
});
