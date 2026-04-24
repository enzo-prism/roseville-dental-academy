import type { Metadata } from "next";

import { getLiveRouteForSlug } from "@/lib/live-route-data";
import { getSiteUrl } from "@/lib/site-config";

const fallbackTitle = "404 Not Found";

function stringifySlug(slug: string | string[]) {
  return Array.isArray(slug) ? slug.join("/") : slug;
}

export function buildSiteMetadata(slug: string | string[] = ""): Metadata {
  const page = getLiveRouteForSlug(slug);
  const title = page?.title ?? fallbackTitle;
  const routePath = page?.route ?? (stringifySlug(slug) ? `/${stringifySlug(slug)}` : "/");
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title,
    description: title,
    applicationName: "Roseville Dental Academy",
    alternates: {
      canonical: routePath,
    },
    robots: {
      follow: true,
      index: true,
    },
  };
}
