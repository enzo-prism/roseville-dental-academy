import { AdLandingFooter, AdLandingHeader } from "@/components/site/ad-landing-chrome";
import { AdLandingPage } from "@/components/site/ad-landing-page";
import { LiveFooter } from "@/components/site/live-footer";
import { LiveHeader } from "@/components/site/live-header";
import { isPaidTrafficLanderSlug, type AdLandingPage as LandingData } from "@/lib/ad-landing-pages";
import type { OfficeOffer } from "@/components/site/ad-landing-page";

export function AdLandingLayout({ page, officeOffer }: { page: LandingData; officeOffer?: OfficeOffer }) {
  const isPaidLander = isPaidTrafficLanderSlug(page.slug);

  return (
    <div
      className="rda-live-shell"
      data-rda-ad-lander={isPaidLander ? "true" : undefined}
      data-rda-current-route={page.path}
      data-rda-shell={isPaidLander ? "ad-lander" : "public"}
      data-rda-shell-ready="true"
    >
      <a className="rda-skip-link" href="#rda-main-content">
        Skip to main content
      </a>
      {isPaidLander ? <AdLandingHeader /> : <LiveHeader currentRoute={page.path} />}
      <main className="rda-live-main" data-rda-route={page.slug} id="rda-main-content">
        <AdLandingPage page={page} officeOffer={officeOffer} />
      </main>
      {isPaidLander ? <AdLandingFooter /> : <LiveFooter />}
    </div>
  );
}
