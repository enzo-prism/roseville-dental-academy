import { Snowflake, type FlakeTone } from "@/components/site/seasonal/christmas-art";

// The once-per-session flurry, then (peak day only) a second, lighter one.
const FLURRY: ReadonlyArray<{ peak?: boolean; tone: FlakeTone }> = [
  { tone: "snow" },
  { tone: "gold" },
  { tone: "snow" },
  { peak: true, tone: "snow" },
  { peak: true, tone: "gold" },
];

/**
 * Sits behind the promo banner text. A string of fairy lights hangs along the
 * top edge all season; the snowflakes only blow past while the <head> script
 * sets <html data-rda-season-flyby> (once per session); the gold star and the
 * second flurry only appear on the peak day (<html data-rda-season-peak>).
 */
export function SeasonalBannerSky() {
  return (
    <span aria-hidden="true" className="rda-seasonal-banner-sky" data-rda-seasonal="banner">
      <span className="rda-seasonal-lights" />
      <span className="rda-seasonal-star" />
      {FLURRY.map((flake, index) => (
        <span
          className={`rda-seasonal-banner-flake rda-seasonal-banner-flake-${index + 1}${flake.peak ? " rda-seasonal-banner-flake-peak" : ""}`}
          key={index}
        >
          <Snowflake className="rda-seasonal-tumbling-flake" tone={flake.tone} />
        </span>
      ))}
    </span>
  );
}
