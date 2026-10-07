// Seasonal decoration layer (see DESIGN.md "Seasonal Layer").
//
// Pages are prerendered, so the season is decided in the browser by a tiny
// <head> script instead of at build time: decorations switch on and off on the
// academy's local calendar day without a redeploy. Decorations are purely
// additive (no copy, no layout) and only render inside public-shell routes.

export const SEASONAL_THEME_ATTRIBUTE = "data-rda-season";
export const SEASONAL_FLYBY_ATTRIBUTE = "data-rda-season-flyby";
export const SEASONAL_SCOPE_ATTRIBUTE = "data-rda-seasonal-scope";

// Setting this localStorage key to "off" keeps decorations off for a browser.
// QA isolation uses it so parity baselines never depend on the calendar.
export const SEASONAL_OPT_OUT_STORAGE_KEY = "rda-seasonal-theme";
export const SEASONAL_OPT_OUT_VALUE = "off";

export const SEASONAL_FLYBY_DURATION_MS = 8_000;
// The fly-by is only spent (once per session) on a page that shows it.
export const SEASONAL_FLYBY_TARGET = `[${SEASONAL_SCOPE_ATTRIBUTE}] .rda-promo-banner`;

export type SeasonalTheme = {
  endsOn: string;
  id: string;
  startsOn: string;
  theme: "halloween";
  timeZone: string;
};

export const halloween2026: SeasonalTheme = {
  id: "halloween-2026",
  theme: "halloween",
  startsOn: "2026-10-01",
  endsOn: "2026-10-31",
  timeZone: "America/Los_Angeles",
};

/** YYYY-MM-DD for `now` on the theme's local calendar. */
export function getSeasonalLocalDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** False once the season is over, so later builds ship no seasonal markup or script. */
export function isSeasonalThemeCurrent(theme: SeasonalTheme, now: Date) {
  return getSeasonalLocalDate(now, theme.timeZone) <= theme.endsOn;
}

// Evaluated when pages are built/rendered: the first deploy after the season
// drops the <head> script and the footer markup. Replace with next year's
// dates (and a new asset folder) to bring the layer back.
export const activeSeasonalTheme: SeasonalTheme | null = isSeasonalThemeCurrent(halloween2026, new Date())
  ? halloween2026
  : null;

export function isSeasonalThemeActive(theme: SeasonalTheme, now: Date) {
  const today = getSeasonalLocalDate(now, theme.timeZone);
  return today >= theme.startsOn && today <= theme.endsOn;
}

export function getSeasonalFlybyStorageKey(theme: SeasonalTheme) {
  return `rda-seasonal-flyby:${theme.id}`;
}

// Set on window by runSeasonalTheme so the client fallback knows the inline
// script already ran.
export const SEASONAL_SCRIPT_MARKER = "__rdaSeasonalTheme";

export type SeasonalThemeScriptConfig = {
  endsOn: string;
  flybyAttribute: string;
  flybyDurationMs: number;
  flybyKey: string;
  flybyTarget: string;
  id: string;
  marker: string;
  optOutKey: string;
  optOutValue: string;
  startsOn: string;
  theme: string;
  themeAttribute: string;
  timeZone: string;
};

export function getSeasonalThemeScriptConfig(theme: SeasonalTheme): SeasonalThemeScriptConfig {
  return {
    endsOn: theme.endsOn,
    flybyAttribute: SEASONAL_FLYBY_ATTRIBUTE,
    flybyDurationMs: SEASONAL_FLYBY_DURATION_MS,
    flybyKey: getSeasonalFlybyStorageKey(theme),
    flybyTarget: SEASONAL_FLYBY_TARGET,
    id: theme.id,
    marker: SEASONAL_SCRIPT_MARKER,
    optOutKey: SEASONAL_OPT_OUT_STORAGE_KEY,
    optOutValue: SEASONAL_OPT_OUT_VALUE,
    startsOn: theme.startsOn,
    theme: theme.theme,
    themeAttribute: SEASONAL_THEME_ATTRIBUTE,
    timeZone: theme.timeZone,
  };
}

/**
 * Applies the season to <html>. Serialized into the inline <head> script via
 * toString(), so it must stay self-contained: only its argument and browser
 * globals, no imports or module helpers. Fails closed (no attribute) on error.
 */
export function runSeasonalTheme(c: SeasonalThemeScriptConfig) {
  try {
    (window as unknown as Record<string, unknown>)[c.marker] = c.id;
    const root = document.documentElement;
    try {
      if (window.localStorage.getItem(c.optOutKey) === c.optOutValue) return;
    } catch {}
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone: c.timeZone,
      year: "numeric",
    }).formatToParts(new Date());
    let year = "";
    let month = "";
    let day = "";
    for (const part of parts) {
      if (part.type === "year") year = part.value;
      else if (part.type === "month") month = part.value;
      else if (part.type === "day") day = part.value;
    }
    const today = year + "-" + month + "-" + day;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || today < c.startsOn || today > c.endsOn) return;
    root.setAttribute(c.themeAttribute, c.theme);
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const flyby = function () {
      if (!document.querySelector(c.flybyTarget)) return;
      let seen = false;
      try {
        seen = window.sessionStorage.getItem(c.flybyKey) === "1";
        window.sessionStorage.setItem(c.flybyKey, "1");
      } catch {
        seen = true;
      }
      if (seen) return;
      root.setAttribute(c.flybyAttribute, "");
      window.setTimeout(function () {
        root.removeAttribute(c.flybyAttribute);
      }, c.flybyDurationMs);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", flyby, { once: true });
    } else {
      flyby();
    }
  } catch {}
}

/**
 * Inline script for <head>. It runs before first paint, so decorations never
 * flash in or shift layout.
 */
export function buildSeasonalThemeScript(theme: SeasonalTheme) {
  const config = JSON.stringify(getSeasonalThemeScriptConfig(theme)).replace(/</g, "\\u003c");

  return `(${runSeasonalTheme.toString()})(${config});`;
}
