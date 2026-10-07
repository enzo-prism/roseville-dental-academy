import { FlappingBat } from "@/components/site/seasonal/halloween-art";

/**
 * Sits behind the promo banner text. The bat only flies while the <head>
 * script sets <html data-rda-season-flyby> (once per session); the moon and a
 * second bat only appear on the peak day (<html data-rda-season-peak>).
 */
export function SeasonalBannerSky() {
  return (
    <span aria-hidden="true" className="rda-seasonal-banner-sky" data-rda-seasonal="banner">
      <span className="rda-seasonal-moon" />
      <span className="rda-seasonal-banner-bat">
        <FlappingBat className="rda-seasonal-flapping-bat" />
      </span>
      <span className="rda-seasonal-banner-bat rda-seasonal-banner-bat-peak">
        <FlappingBat className="rda-seasonal-flapping-bat" />
      </span>
    </span>
  );
}
