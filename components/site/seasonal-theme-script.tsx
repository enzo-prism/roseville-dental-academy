import { SeasonalThemeFallback } from "@/components/site/seasonal-theme-fallback";
import { activeSeasonalTheme, buildSeasonalThemeScript } from "@/lib/site-seasonal";

/** Sets <html data-rda-season> before first paint while a seasonal theme is in range. */
export function SeasonalThemeScript() {
  if (!activeSeasonalTheme) {
    return null;
  }

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: buildSeasonalThemeScript(activeSeasonalTheme) }}
        id="rda-seasonal-theme"
      />
      <SeasonalThemeFallback />
    </>
  );
}
