/** Faint mist drifting along the footer's top edge, behind the footer text. */
export function SeasonalFooterFog() {
  return (
    <span aria-hidden="true" className="rda-seasonal-fog" data-rda-seasonal="fog">
      <span className="rda-seasonal-fog-wisp rda-seasonal-fog-wisp-1" />
      <span className="rda-seasonal-fog-wisp rda-seasonal-fog-wisp-2" />
      <span className="rda-seasonal-fog-wisp rda-seasonal-fog-wisp-3" />
    </span>
  );
}
