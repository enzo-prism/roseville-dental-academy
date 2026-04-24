export const dynamic = "force-static";

const SITEMAP_INDEX =
  '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>http://rosevilledentalacademy.com/sitemap.website.xml</loc></sitemap><sitemap><loc>http://rosevilledentalacademy.com/sitemap.ola.xml</loc></sitemap></sitemapindex>';

export function GET() {
  return new Response(SITEMAP_INDEX, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
