import { SITE_URL } from "@/lib/site-config";

export const dynamic = "force-static";

export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE_URL}/sitemap.website.xml</loc></sitemap></sitemapindex>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
