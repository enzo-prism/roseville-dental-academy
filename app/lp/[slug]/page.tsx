import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdLandingPage } from "@/components/site/ad-landing-page";
import { ElevenLabsAgentWidget } from "@/components/site/elevenlabs-agent-widget";
import { LiveFooter } from "@/components/site/live-footer";
import { LiveHeader } from "@/components/site/live-header";
import {
  adLandingPages,
  getAdLandingPage,
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

  return (
    <div
      className="rda-live-shell"
      data-rda-current-route={page.path}
      data-rda-shell="public"
      data-rda-shell-ready="true"
    >
      <a className="rda-skip-link" href="#rda-main-content">
        Skip to main content
      </a>
      <LiveHeader currentRoute={page.path} />
      <main className="rda-live-main" data-rda-route={page.slug} id="rda-main-content">
        <AdLandingPage page={page} />
      </main>
      <LiveFooter />
      <ElevenLabsAgentWidget compactDefault />
    </div>
  );
}
