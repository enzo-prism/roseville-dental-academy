import type { ReactNode } from "react";

import type { LiveRoute } from "@/lib/live-route-data";

import { ElevenLabsAgentWidget } from "./elevenlabs-agent-widget";
import { HomeHeroCarouselController } from "./home-hero-carousel-controller";
import { LiveCookieBanner } from "./live-cookie-banner";
import { LiveFooter } from "./live-footer";
import { LiveHeader } from "./live-header";

type LiveShellProps = {
  children: ReactNode;
  route: LiveRoute;
};

export function LiveShell({ children, route }: LiveShellProps) {
  return (
    <div className="rda-live-shell" data-rda-shell-ready="true" data-rda-shell={route.shellVariant}>
      <LiveHeader currentRoute={route.route} />
      {children}
      <HomeHeroCarouselController enabled={route.route === "/"} />
      <LiveFooter />
      <LiveCookieBanner />
      <ElevenLabsAgentWidget />
    </div>
  );
}
