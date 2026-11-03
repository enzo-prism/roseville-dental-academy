import { Leaf, type LeafTone } from "@/components/site/seasonal/thanksgiving-art";

// The once-per-session gust, then (peak day only) a second, lighter one.
const GUST: ReadonlyArray<{ kind: "maple" | "oak"; peak?: boolean; tone: LeafTone }> = [
  { kind: "maple", tone: "pumpkin" },
  { kind: "oak", tone: "gold" },
  { kind: "maple", tone: "cranberry" },
  { kind: "oak", peak: true, tone: "pumpkin" },
  { kind: "maple", peak: true, tone: "gold" },
];

/**
 * Sits behind the promo banner text. The leaves only tumble past while the
 * <head> script sets <html data-rda-season-flyby> (once per session); the
 * harvest sun and the second gust only appear on the peak day
 * (<html data-rda-season-peak>).
 */
export function SeasonalBannerSky() {
  return (
    <span aria-hidden="true" className="rda-seasonal-banner-sky" data-rda-seasonal="banner">
      <span className="rda-seasonal-sun" />
      {GUST.map((leaf, index) => (
        <span
          className={`rda-seasonal-banner-leaf rda-seasonal-banner-leaf-${index + 1}${leaf.peak ? " rda-seasonal-banner-leaf-peak" : ""}`}
          key={index}
        >
          <Leaf className="rda-seasonal-tumbling-leaf" kind={leaf.kind} tone={leaf.tone} />
        </span>
      ))}
    </span>
  );
}
