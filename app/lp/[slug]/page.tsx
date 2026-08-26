import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdLandingFooter, AdLandingHeader } from "@/components/site/ad-landing-chrome";
import { AdLandingPage } from "@/components/site/ad-landing-page";
import { LiveFooter } from "@/components/site/live-footer";
import { LiveHeader } from "@/components/site/live-header";
import {
  adLandingPages,
  getAdLandingPage,
  isPaidTrafficLanderSlug,
} from "@/lib/ad-landing-pages";
import { buildPageMetadata } from "@/lib/site-metadata";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return adLandingPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getAdLandingPage(slug);

  if (!page) {
    return buildPageMetadata({
      description: "The landing page you are looking for was not found.",
      noindex: true,
      omitCanonical: true,
      title: "Landing Page Not Found | Roseville Dental Academy",
    });
  }

  return buildPageMetadata({
    description: page.metaDescription,
    image: page.hero.imageSrc,
    imageAlt: page.hero.imageAlt,
    noindex: true,
    path: page.path,
    title: page.metaTitle,
  });
}

export default async function LandingPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = getAdLandingPage(slug);

  if (!page) {
    notFound();
  }

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
        <AdLandingPage page={page} />
      </main>
      {isPaidLander ? <AdLandingFooter /> : <LiveFooter />}
    </div>
  );
}
