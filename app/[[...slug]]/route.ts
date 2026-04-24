import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { NextRequest } from "next/server";

import manifestData from "@/snapshot/live/manifest.json";

function normalizePathname(pathname: string) {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function resolveRoute(pathname: string) {
  const normalized = normalizePathname(pathname);

  return manifestData.routes.find((route) =>
    [route.route, ...route.aliases].some(
      (candidate) => normalizePathname(candidate) === normalized,
    ),
  );
}

function getFallbackRoute() {
  return manifestData.routes.find((route) => route.route === "/registration");
}

async function loadSnapshotHtml(htmlPath: string) {
  return readFile(join(/* turbopackIgnore: true */ process.cwd(), htmlPath), "utf8");
}

async function buildResponse(request: NextRequest) {
  const route = resolveRoute(request.nextUrl.pathname) ?? getFallbackRoute();

  if (!route) {
    return new Response("Not found", {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
      status: 404,
    });
  }

  const html = await loadSnapshotHtml(route.htmlPath);

  return new Response(html, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    },
    status: route.status,
  });
}

export async function GET(request: NextRequest) {
  return buildResponse(request);
}

export async function HEAD(request: NextRequest) {
  const response = await buildResponse(request);
  return new Response(null, {
    headers: response.headers,
    status: response.status,
  });
}
