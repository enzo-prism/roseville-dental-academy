import type { Metadata } from "next";

import { getPageBySlug, siteImages } from "@/lib/site-data";

const siteUrl = "https://www.rosevilledentalacademy.com";
const fallbackTitle = "Roseville Dental Academy";
const fallbackDescription =
  "Dental training and certification in Roseville, California.";

export function buildSiteMetadata(slug = ""): Metadata {
  const page = getPageBySlug(slug);
  const title = page?.title ?? fallbackTitle;
  const description = page?.description ?? fallbackDescription;
  const pathname = slug ? `/${slug}` : "/";

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    applicationName: fallbackTitle,
    icons: {
      icon: "/assets/favicon.png",
      shortcut: "/assets/favicon.png",
      apple: "/assets/favicon.png",
    },
    openGraph: {
      type: "website",
      url: pathname,
      title,
      description,
      siteName: fallbackTitle,
      images: [
        {
          url: siteImages.logo,
          alt: "Roseville Dental Academy seal",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteImages.logo],
    },
    alternates: {
      canonical: pathname,
    },
    robots: page?.noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  };
}
