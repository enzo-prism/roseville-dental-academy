import type { ReactNode } from "react";

import type { LiveRoute } from "@/lib/live-route-data";
import { activeSeasonalTheme } from "@/lib/site-seasonal";

import { HomeHeroCarouselController } from "./home-hero-carousel-controller";
import { LiveFooter } from "./live-footer";
import { LiveHeader } from "./live-header";
import { SitePromoDialog } from "./site-promo-dialog";

type LiveShellProps = {
  children: ReactNode;
  route: LiveRoute;
};

export function LiveShell({ children, route }: LiveShellProps) {
  // Seasonal decorations are opt-in per shell: public pages only, never the
  // utility/auth screens or private academy tools.
  const seasonal = route.shellVariant === "public" && activeSeasonalTheme !== null;

  return (
    <div
      className="rda-live-shell"
      data-rda-current-route={route.route}
      data-rda-seasonal-scope={seasonal ? "true" : undefined}
      data-rda-shell-ready="true"
      data-rda-shell={route.shellVariant}
    >
      <a className="rda-skip-link" href="#rda-main-content">
        Skip to main content
      </a>
      <LiveHeader currentRoute={route.route} />
      {route.shellVariant === "public" ? <SitePromoDialog /> : null}
      {children}
      <HomeHeroCarouselController enabled={route.route === "/"} />
      <LiveFooter seasonal={seasonal} />
    </div>
  );
}
