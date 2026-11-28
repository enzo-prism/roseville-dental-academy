import { Snowflake } from "@/components/site/seasonal/christmas-art";

/** A few snowflakes drifting along the footer's top edge, behind the footer text. */
export function SeasonalFooterDrift() {
  return (
    <span aria-hidden="true" className="rda-seasonal-drift" data-rda-seasonal="drift">
      <span className="rda-seasonal-drift-flake rda-seasonal-drift-flake-1">
        <Snowflake className="rda-seasonal-drift-art" tone="snow" />
      </span>
      <span className="rda-seasonal-drift-flake rda-seasonal-drift-flake-2">
        <Snowflake className="rda-seasonal-drift-art" tone="ice" />
      </span>
      <span className="rda-seasonal-drift-flake rda-seasonal-drift-flake-3">
        <Snowflake className="rda-seasonal-drift-art" tone="snow" />
      </span>
    </span>
  );
}
