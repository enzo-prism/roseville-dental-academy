import { Leaf } from "@/components/site/seasonal/thanksgiving-art";

/** A few leaves drifting along the footer's top edge, behind the footer text. */
export function SeasonalFooterDrift() {
  return (
    <span aria-hidden="true" className="rda-seasonal-drift" data-rda-seasonal="drift">
      <span className="rda-seasonal-drift-leaf rda-seasonal-drift-leaf-1">
        <Leaf className="rda-seasonal-drift-art" kind="maple" tone="pumpkin" />
      </span>
      <span className="rda-seasonal-drift-leaf rda-seasonal-drift-leaf-2">
        <Leaf className="rda-seasonal-drift-art" kind="oak" tone="gold" />
      </span>
      <span className="rda-seasonal-drift-leaf rda-seasonal-drift-leaf-3">
        <Leaf className="rda-seasonal-drift-art" kind="maple" tone="cranberry" />
      </span>
    </span>
  );
}
