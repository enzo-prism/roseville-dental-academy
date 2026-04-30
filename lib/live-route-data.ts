import { readFile } from "node:fs/promises";
import { join } from "node:path";

import manifestData from "@/snapshot/live/manifest.json";
import { LIVE_SOURCE_ORIGIN } from "@/lib/site-config";

export const LIVE_SITE_ORIGIN = LIVE_SOURCE_ORIGIN;
export const LIVE_BODY_CLASS = "x x-fonts-adamina x-fonts-fjalla-one";

export type SnapshotVisualMask = {
  type: "selector";
  value: string;
};

type ManifestRoute = (typeof manifestData.routes)[number];

export type LiveRouteKind = "mirror" | "plain404";
export type LiveShellVariant = "public" | "utility" | "plain404";
export type LiveWidgetSlot = "contact" | "home" | "newsletter" | "photos" | "reviews";

export type LiveRoute = ManifestRoute & {
  description: string;
  kind: LiveRouteKind;
  noindex: boolean;
  shellVariant: LiveShellVariant;
  sitemap: boolean;
  widgetSlots: LiveWidgetSlot[];
};

export type LiveMirrorDocument = {
  bodyClass: string;
  bodyHtml: string;
  bodyScripts: string[];
  description: string;
  headScripts: string[];
  headStylesHtml: string;
  title: string;
};

type FrozenManifest = {
  assetRoot: string;
  generatedAt: string;
  routes: LiveRoute[];
};

const FALLBACK_DESCRIPTION =
  "Roseville Dental Academy offers dental assisting and dental certification training in Roseville, California.";

const EXCLUDED_WIDGET_CLASS_PREFIXES = [
  "widget-header",
  "widget-footer",
  "widget-messaging",
  "widget-trustedsite",
  "widget-cookie-banner",
  "widget-popup",
  "widget-socialfeed",
  "widget-reviews",
  "widget-gallery",
  "widget-subscribe",
  "widget-social",
  "widget-appointments",
  "widget-contact-contact-5",
];

const DIRECT_TRUSTEDSITE_BADGE_REGEX =
  /<div\b(?=[^>]*(?:\bid=(["'])trustedsite-tm-image\1|\btitle=(["'])TrustedSite Certified\2))[^>]*>/gi;

function routeDescription(route: ManifestRoute) {
  if (route.route === "/") {
    return "Roseville Dental Academy training for dental assisting, x-ray, CPR, infection control, coronal polish, sealants, and front office skills.";
  }

  if (route.route === "/contact") {
    return "Contact Roseville Dental Academy for hours, address, phone number, email, directions, and questions about programs.";
  }

  if (route.route.startsWith("/m/") || route.route.includes("resume-portal")) {
    return "Roseville Dental Academy student account access.";
  }

  if (route.status === 404) {
    return "File not found.";
  }

  return `${route.title} at Roseville Dental Academy.`;
}

function widgetSlotsForRoute(route: ManifestRoute): LiveWidgetSlot[] {
  if (route.route === "/") {
    return ["home", "reviews", "photos", "newsletter", "contact"];
  }

  if (route.route === "/contact") {
    return ["contact"];
  }

  if (route.route === "/photos") {
    return ["photos"];
  }

  return [];
}

function shellVariantForRoute(route: ManifestRoute): LiveShellVariant {
  if (route.status === 404) {
    return "plain404";
  }

  if (route.route.startsWith("/m/") || route.route.includes("resume-portal")) {
    return "utility";
  }

  return "public";
}

function isNoindexRoute(route: ManifestRoute) {
  return (
    route.status !== 200 ||
    route.route.startsWith("/m/") ||
    route.route.includes("resume-portal")
  );
}

function decorateRoute(route: ManifestRoute): LiveRoute {
  const noindex = isNoindexRoute(route);

  return {
    ...route,
    description: routeDescription(route),
    kind: route.status === 404 ? "plain404" : "mirror",
    noindex,
    shellVariant: shellVariantForRoute(route),
    sitemap: route.status === 200 && !noindex,
    widgetSlots: widgetSlotsForRoute(route),
  };
}

const manifest = {
  ...manifestData,
  routes: manifestData.routes.map(decorateRoute),
} satisfies FrozenManifest;

const routeIndex = new Map<string, LiveRoute>();
const routePathIndex = new Map<string, LiveRoute>();

function normalizePathSegment(input?: string | string[]) {
  if (Array.isArray(input)) {
    return input.join("/");
  }

  return input ?? "";
}

export function normalizeRouteSlug(input?: string | string[]) {
  const joined = normalizePathSegment(input);
  const trimmed = joined.replace(/^\/+|\/+$/g, "");

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function registerRoutePath(pathname: string, route: LiveRoute) {
  const normalizedPath = pathname.replace(/^\/+|\/+$/g, "");
  const decodedPath = normalizeRouteSlug(pathname);

  routePathIndex.set(pathname, route);
  routeIndex.set(normalizedPath, route);
  routeIndex.set(decodedPath, route);

  if (pathname === "/") {
    routeIndex.set("", route);
  }
}

for (const route of manifest.routes) {
  registerRoutePath(route.route, route);

  for (const alias of route.aliases) {
    registerRoutePath(alias, route);
  }
}

export const liveRoutes = manifest.routes;
export const snapshotAssetRoot = manifest.assetRoot;

export function getLiveRouteForSlug(input?: string | string[]) {
  return routeIndex.get(normalizeRouteSlug(input));
}

export function getLiveRouteByPath(pathname: string) {
  return routePathIndex.get(pathname) ?? getLiveRouteForSlug(pathname);
}

export function getPublicSitemapRoutes() {
  return manifest.routes.filter((route) => route.sitemap);
}

export function getVisualRouteEntries() {
  return manifest.routes.filter(
    (route) => Object.keys(route.visualBaselines).length > 0,
  );
}

export function getFrozenManifest() {
  return manifest;
}

export function getStaticRouteParams() {
  const params = new Map<string, { slug?: string[] }>();

  for (const route of manifest.routes) {
    for (const pathname of [route.route, ...route.aliases]) {
      const trimmed = pathname.replace(/^\/+|\/+$/g, "");
      const slug = trimmed ? trimmed.split("/") : [];
      params.set(slug.join("/"), { slug });
    }
  }

  return [...params.values()];
}

function extractActualBody(html: string) {
  const headClose = html.lastIndexOf("</head>");
  const bodyTagRegex = /<body\b[^>]*>/gi;
  let bodyTag: RegExpExecArray | null = null;
  let candidate: RegExpExecArray | null;

  while ((candidate = bodyTagRegex.exec(html))) {
    if (candidate.index > headClose) {
      bodyTag = candidate;
      break;
    }
  }

  if (bodyTag?.index === undefined) {
    return {
      bodyClass: LIVE_BODY_CLASS,
      bodyHtml: "",
      bodyStart: -1,
    };
  }

  const bodyClose = html.lastIndexOf("</body>");
  const bodyStart = bodyTag.index;
  const bodyTagEnd = bodyStart + bodyTag[0].length;
  const bodyClass = bodyTag[0].match(/class="([^"]*)"/i)?.[1] ?? LIVE_BODY_CLASS;

  return {
    bodyClass,
    bodyHtml: html.slice(bodyTagEnd, bodyClose > bodyTagEnd ? bodyClose : undefined),
    bodyStart,
  };
}

function extractActualHead(html: string, bodyStart: number) {
  const headStart = html.indexOf("<head>");

  if (headStart < 0 || bodyStart < 0) {
    return "";
  }

  return html.slice(headStart + "<head>".length, bodyStart);
}

function extractStyleBlocks(headHtml: string) {
  return [...headHtml.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1]?.trim())
    .filter(Boolean)
    .join("\n");
}

function stripScriptTags(sectionHtml: string) {
  return sectionHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function stripIframes(sectionHtml: string) {
  return sectionHtml.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
}

function getClassAttribute(tag: string) {
  return tag.match(/\bclass="([^"]*)"/i)?.[1] ?? "";
}

function shouldRemoveWidget(tag: string) {
  const className = getClassAttribute(tag);
  const classes = className.split(/\s+/).filter(Boolean);

  return classes.some((classToken) =>
    EXCLUDED_WIDGET_CLASS_PREFIXES.some((prefix) => classToken.startsWith(prefix)),
  );
}

function findClosingDiv(html: string, startIndex: number) {
  const tagRegex = /<\/?div\b[^>]*>/gi;
  tagRegex.lastIndex = startIndex;
  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
    } else {
      depth += 1;
    }

    if (depth === 0) {
      return tagRegex.lastIndex;
    }
  }

  return startIndex;
}

function stripExcludedWidgets(html: string) {
  const widgetRegex = /<div\b[^>]*\bclass="[^"]*\bwidget\b[^"]*"[^>]*>/gi;
  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = widgetRegex.exec(html))) {
    const start = match.index;

    if (start < cursor) {
      continue;
    }

    const end = findClosingDiv(html, start + match[0].length);

    if (shouldRemoveWidget(match[0])) {
      output += html.slice(cursor, start);
      cursor = end;
    }

    widgetRegex.lastIndex = Math.max(end, widgetRegex.lastIndex);
  }

  return output + html.slice(cursor);
}

function stripMatchedDivs(html: string, openerRegex: RegExp) {
  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = openerRegex.exec(html))) {
    const start = match.index;

    if (start < cursor) {
      continue;
    }

    const end = findClosingDiv(html, start + match[0].length);

    output += html.slice(cursor, start);
    cursor = end;
    openerRegex.lastIndex = Math.max(end, openerRegex.lastIndex);
  }

  return output + html.slice(cursor);
}

function stripDirectTrustedSiteBadges(html: string) {
  return stripMatchedDivs(html, DIRECT_TRUSTEDSITE_BADGE_REGEX);
}

function promoteLazyImages(html: string) {
  return html
    .replace(
      /(<img\b[^>]*?)\s+src="data:image\/gif;base64,[^"]*"([^>]*?\sdata-srclazy="([^"]+)"[^>]*>)/gi,
      (_match, before: string, after: string, lazySrc: string) => `${before} src="${lazySrc}"${after}`,
    )
    .replace(
      /(<img\b[^>]*?)\s+srcset="[^"]*transparent_placeholder[^"]*"([^>]*?\sdata-srcsetlazy="([^"]*)"[^>]*>)/gi,
      (_match, before: string, after: string, lazySrcSet: string) =>
        lazySrcSet.trim() ? `${before} srcset="${lazySrcSet}"${after}` : `${before}${after}`,
    )
    .replace(/\sdata-lazyimg="true"/gi, "");
}

function sanitizeSnapshotBody(bodyHtml: string) {
  const scriptFreeHtml = stripScriptTags(bodyHtml);
  const iframeFreeHtml = stripIframes(scriptFreeHtml);
  const widgetFreeHtml = stripExcludedWidgets(iframeFreeHtml);
  const badgeFreeHtml = stripDirectTrustedSiteBadges(widgetFreeHtml);

  return promoteLazyImages(badgeFreeHtml).trim();
}

async function loadSnapshotHtml(htmlPath: string) {
  return readFile(join(/* turbopackIgnore: true */ process.cwd(), htmlPath), "utf8");
}

export async function fetchLiveMirrorDocument(livePath: string): Promise<LiveMirrorDocument> {
  const route = getLiveRouteByPath(livePath);

  if (!route) {
    throw new Error(`No frozen snapshot route found for ${livePath}.`);
  }

  const html = await loadSnapshotHtml(route.htmlPath);
  const { bodyClass, bodyHtml, bodyStart } = extractActualBody(html);
  const headHtml = extractActualHead(html, bodyStart);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || route.title;
  const description =
    headHtml.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim() ||
    route.description ||
    FALLBACK_DESCRIPTION;
  const styleBlocks = extractStyleBlocks(headHtml);

  return {
    bodyClass,
    bodyHtml: sanitizeSnapshotBody(bodyHtml),
    bodyScripts: [],
    description,
    headScripts: [],
    headStylesHtml: styleBlocks ? `<style data-rda-live-snapshot-styles>${styleBlocks}</style>` : "",
    title,
  };
}
