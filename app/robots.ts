import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://www.rosevilledentalacademy.com/sitemap.xml",
    host: "https://www.rosevilledentalacademy.com",
  };
}
