"use client";

import { useLayoutEffect } from "react";

import {
  SEASONAL_SCRIPT_MARKER,
  activeSeasonalTheme,
  getSeasonalThemeScriptConfig,
  runSeasonalTheme,
} from "@/lib/site-seasonal";

/**
 * React never executes inline scripts it inserts itself: Next's client-rendered
 * 404 error shell, and client navigation from a private route (which renders no
 * <head> script) to a public one. Apply the season after mount whenever the
 * <head> script did not run; where it did, this is a no-op.
 */
export function SeasonalThemeFallback() {
  useLayoutEffect(() => {
    if (activeSeasonalTheme && !(SEASONAL_SCRIPT_MARKER in window)) {
      runSeasonalTheme(getSeasonalThemeScriptConfig(activeSeasonalTheme));
    }
  }, []);

  return null;
}
