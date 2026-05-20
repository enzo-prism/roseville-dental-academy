import { getPublicSitemapRoutes } from "@/lib/live-route-data";
import { SITE_URL } from "@/lib/site-config";
import { socialChannelPages } from "@/lib/social-channel-data";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const updatedAt = new Date("2026-04-30T00:00:00.000Z").toISOString().slice(0, 10);
  const routes = [
    ...getPublicSitemapRoutes().map((route) => route.route),
    ...socialChannelPages.map((page) => page.path),
  ];
  const urls = routes
    .map((route) => {
      const loc = `${SITE_URL}${route === "/" ? "" : route}`;
      const priority = route === "/" ? "1" : route === "/contact" ? "0.7" : "0.5";

      return `<url><loc>${escapeXml(loc)}</loc><lastmod>${updatedAt}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
}
