import { readFile } from "node:fs/promises";
import { join } from "node:path";

import manifestData from "@/snapshot/live/manifest.json";
import { LIVE_SOURCE_ORIGIN } from "@/lib/site-config";

export const LIVE_SITE_ORIGIN = LIVE_SOURCE_ORIGIN;
export const LIVE_BODY_CLASS = "x  x-fonts-adamina  x-fonts-fjalla-one";

export type SnapshotVisualMask = {
  type: "selector";
  value: string;
};

type ManifestRoute = (typeof manifestData.routes)[number];

export type LiveRouteKind = "mirror" | "plain404";

export type LiveRoute = ManifestRoute & {
  kind: LiveRouteKind;
};

export type LiveMirrorDocument = {
  bodyClass: string;
  bodyHtml: string;
  bodyScripts: string[];
  headScripts: string[];
  headStylesHtml: string;
  title: string;
};

type FrozenManifest = {
  assetRoot: string;
  generatedAt: string;
  routes: LiveRoute[];
};

const manifest = {
  ...manifestData,
  routes: manifestData.routes.map((route) => ({
    ...route,
    kind: route.status === 404 ? "plain404" : "mirror",
  })),
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
  return manifest.routes.filter(
    (route) => route.kind === "mirror" && !route.route.startsWith("/m/"),
  );
}

export function getVisualRouteEntries() {
  return manifest.routes.filter(
    (route) => Object.keys(route.visualBaselines).length > 0,
  );
}

export function getFrozenManifest() {
  return manifest;
}

function extractTagContents(html: string, tagName: string) {
  const expression = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  return html.match(expression)?.[1] ?? "";
}

function extractBodyClass(html: string) {
  return html.match(/<body[^>]*class="([^"]*)"/i)?.[1] ?? LIVE_BODY_CLASS;
}

function extractStyleBlocks(headHtml: string) {
  return [...headHtml.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1]?.trim())
    .filter(Boolean)
    .join("\n");
}

function extractScriptTags(sectionHtml: string) {
  return [...sectionHtml.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map((match) => match[0]);
}

function stripScriptTags(sectionHtml: string) {
  return sectionHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
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
  const headHtml = extractTagContents(html, "head");
  const bodyHtml = extractTagContents(html, "body");
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || route.title;
  const styleBlocks = extractStyleBlocks(headHtml);
  const headScripts = extractScriptTags(headHtml);
  const bodyScripts = extractScriptTags(bodyHtml);

  return {
    bodyClass: extractBodyClass(html),
    bodyHtml: stripScriptTags(bodyHtml),
    bodyScripts,
    headScripts,
    headStylesHtml: styleBlocks ? `<style>${styleBlocks}</style>` : "",
    title,
  };
}
