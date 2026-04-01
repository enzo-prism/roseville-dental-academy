import type { MetadataRoute } from "next";

import { publicSitemapSlugs } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.rosevilledentalacademy.com";

  return publicSitemapSlugs.map((slug) => ({
    url: slug ? `${baseUrl}/${slug}` : baseUrl,
    lastModified: "2026-04-01",
  }));
}
