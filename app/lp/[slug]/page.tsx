import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdLandingLayout } from "@/components/site/ad-landing-layout";
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
  return adLandingPages.filter((page) => page.slug !== "infection-control-office-compliance").map((page) => ({ slug: page.slug }));
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

  return <AdLandingLayout page={page} />;
}
