import type { ReactNode } from "react";

import type { LiveRoute } from "@/lib/live-route-data";

import { ElevenLabsAgentWidget } from "./elevenlabs-agent-widget";
import { HomeHeroCarouselController } from "./home-hero-carousel-controller";
import { LiveFooter } from "./live-footer";
import { LiveHeader } from "./live-header";
import { SitePromoDialog } from "./site-promo-dialog";

type LiveShellProps = {
  children: ReactNode;
  route: LiveRoute;
};

const compactWidgetRoutes = new Set([
  "/bls%2Fcpr-1",
  "/bls-cpr-1",
  "/coronal-polish",
  "/dental-assisting-program",
  "/infection-control",
  "/journey",
  "/radiation-safety",
  "/sealants",
]);

export function LiveShell({ children, route }: LiveShellProps) {
  return (
    <div
      className="rda-live-shell"
      data-rda-current-route={route.route}
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
      <LiveFooter />
      <ElevenLabsAgentWidget compactDefault={compactWidgetRoutes.has(route.route)} />
    </div>
  );
}
