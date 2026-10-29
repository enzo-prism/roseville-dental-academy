import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveShell } from "@/components/site/live-shell";
import { LocalCityPage, localCityBreadcrumbs } from "@/components/site/local-city-page";
import {
  BreadcrumbStructuredData,
  FaqListStructuredData,
} from "@/components/site/structured-data";
import { getLocalCity, localCities, localRouteForCity } from "@/lib/local-seo-pages";
import { buildPageMetadata } from "@/lib/site-metadata";

type PageProps = {
  params: Promise<{ city: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return localCities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = getLocalCity((await params).city);

  if (!city) {
    return buildPageMetadata({
      title: "404 Not Found | Roseville Dental Academy",
      description: "The page you are looking for was not found.",
      noindex: true,
      omitCanonical: true,
    });
  }

  return buildPageMetadata({ route: localRouteForCity(city) });
}

export default async function LocalCityRoutePage({ params }: PageProps) {
  const city = getLocalCity((await params).city);

  if (!city) {
    notFound();
  }

  return (
    <LiveShell route={localRouteForCity(city)}>
      <BreadcrumbStructuredData items={localCityBreadcrumbs(city)} />
      <FaqListStructuredData faqs={city.faqs} id={`rda-ld-faq-dental-assisting-school-${city.slug}`} />
      <LocalCityPage city={city} />
    </LiveShell>
  );
}
