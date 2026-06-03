import {
  getPublicSitemapRoutes,
  type LiveRoute,
} from "@/lib/live-route-data";
import { journeyRoute } from "@/lib/journey-roadmap-data";
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

function canonicalPathFor(route: LiveRoute): string {
  // Prefer a clean alias (e.g. /bls-cpr-1) over the encoded original (/bls%2Fcpr-1).
  if (route.route.includes("%2F") && route.aliases.length > 0) {
    return route.aliases[0];
  }
  return route.route;
}

function priorityFor(path: string): string {
  if (path === "/") return "1.0";
  if (path === "/contact" || path === "/dental-assisting-program") return "0.8";
  if (path === "/journey") return "0.8";
  if (path === "/registration") return "0.7";
  return "0.6";
}

export function GET() {
  const updatedAt = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const entries: { path: string; priority: string }[] = [];

  for (const route of getPublicSitemapRoutes()) {
    const path = canonicalPathFor(route);
    if (seen.has(path)) continue;
    seen.add(path);
    entries.push({ path, priority: priorityFor(path) });
  }

  for (const route of [journeyRoute]) {
    const path = canonicalPathFor(route);
    if (seen.has(path)) continue;
    seen.add(path);
    entries.push({ path, priority: priorityFor(path) });
  }

  for (const page of socialChannelPages) {
    if (seen.has(page.path)) continue;
    seen.add(page.path);
    entries.push({ path: page.path, priority: "0.4" });
  }

  const urls = entries
    .map(({ path, priority }) => {
      const loc = `${SITE_URL}${path === "/" ? "" : path}`;
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
