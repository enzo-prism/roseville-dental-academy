import { readFile } from "node:fs/promises";
import { join } from "node:path";

import manifestData from "@/snapshot/live/manifest.json";
import { LIVE_SOURCE_ORIGIN } from "@/lib/site-config";
import { homepageReviewHighlights } from "@/lib/site-data";

export const LIVE_SITE_ORIGIN = LIVE_SOURCE_ORIGIN;
export const LIVE_BODY_CLASS = "x x-fonts-adamina x-fonts-fjalla-one";

export type SnapshotVisualMask = {
  type: "selector";
  value: string;
};

type ManifestRoute = (typeof manifestData.routes)[number];

export type LiveRouteKind = "mirror" | "plain404";
export type LiveShellVariant = "public" | "utility" | "plain404";
export type LiveWidgetSlot = "contact" | "home" | "photos" | "reviews" | "signup";

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

const GENERATED_IMAGE_REPLACEMENTS: Array<{
  pattern: RegExp;
  replacement: string;
}> = [
  {
    pattern:
      /\/__live\/img1\.wsimg\.com\/isteam\/ip\/f45bc53a-68c0-4338-bd3f-fe6fbc400a09\/Typodont__960e7dba70\.jpg/g,
    replacement: "/assets/generated/roseville/homepage-typodont-training.jpg",
  },
  {
    pattern:
      /\/__live\/img1\.wsimg\.com\/isteam\/ip\/f45bc53a-68c0-4338-bd3f-fe6fbc400a09\/n955pic__c0ae03990d\.jpg/g,
    replacement: "/assets/generated/roseville/homepage-n95-fit-testing.jpg",
  },
  {
    pattern:
      /\/__live\/img1\.wsimg\.com\/isteam\/ip\/f45bc53a-68c0-4338-bd3f-fe6fbc400a09\/guided%(?:20|2520)implant%(?:20|2520)surgery%(?:20|2520)picture__f5e7136df7\.jpg/g,
    replacement: "/assets/generated/roseville/homepage-implant-coaching.jpg",
  },
  {
    pattern:
      /\/__live\/img1\.wsimg\.com\/isteam\/getty\/2166302030\/:\/[^"'\s]+?\.jpg/g,
    replacement: "/assets/generated/roseville/front-office-insurance-documents.jpg",
  },
];

const HOMEPAGE_REFUND_POLICY_COPY_PATTERN =
  /Due to limited space all sales are final and no refunds will be issued\.?(?:&nbsp;)?/;

const HOMEPAGE_COURSE_COPY_REPLACEMENTS = [
  "Initial and renewal BLS training for healthcare providers who need hands-on CPR, AED, ventilation, and team-resuscitation practice with an in-person skills evaluation.",
  "California Dental Board-aligned infection control training covering required precautions, clinical safety habits, and compliance expectations for dental students and professionals.",
  "Board-aligned radiography training covering x-ray safety, digital imaging, manikin practice, written testing, and supervised clinical patient requirements.",
  "Hands-on coronal polishing instruction with didactic, laboratory, manikin, and clinical patient requirements for eligible dental assistants.",
  "Sealant certification training for qualified dental assistants and RDAs, including manikin practice, written testing, and supervised clinical patient requirements.",
  "Students move through a focused 210-hour schedule with class, clinical practice, homework, and an assigned externship day that connects classroom skills to real office workflow.",
] as const;

const HOMEPAGE_HERO_WIDGET_REGEX =
  /<div\b(?=[^>]*\bclass="[^"]*\bwidget-introduction-introduction-1\b[^"]*"[^>]*>)/i;
const HOMEPAGE_AFTER_HERO_WIDGET_MARKER =
  '<div id="f11e5afa-6606-44e2-847f-fe03d31d5b23" class="widget widget-countdown';

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
    return ["home", "photos", "signup", "contact"];
  }

  if (route.route === "/contact") {
    return ["contact", "signup"];
  }

  if (route.route === "/photos") {
    return ["photos", "signup"];
  }

  if (
    route.status === 200 &&
    !route.route.startsWith("/m/") &&
    !route.route.includes("resume-portal")
  ) {
    return ["signup"];
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

function getHtmlAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return match?.[1] ?? "";
}

function removeHtmlAttribute(tag: string, name: string) {
  return tag.replace(new RegExp(`\\s${name}="[^"]*"`, "gi"), "");
}

function setHtmlAttribute(tag: string, name: string, value: string) {
  const escapedValue = value.replace(/"/g, "&quot;");
  const attributePattern = new RegExp(`(\\s${name}=)"[^"]*"`, "i");

  if (attributePattern.test(tag)) {
    return tag.replace(attributePattern, `$1"${escapedValue}"`);
  }

  return tag.replace(/>$/, ` ${name}="${escapedValue}">`);
}

function isPlaceholderImageSrc(value: string) {
  return (
    /^data:image\/gif;base64/i.test(value) ||
    /transparent_placeholder/i.test(value)
  );
}

function promoteLazyImageTag(tag: string) {
  const lazySrc = getHtmlAttribute(tag, "data-srclazy");
  const lazySrcSet = getHtmlAttribute(tag, "data-srcsetlazy");
  const currentSrc = getHtmlAttribute(tag, "src");
  const currentSrcSet = getHtmlAttribute(tag, "srcset");
  let promotedTag = tag;

  if (lazySrc && (!currentSrc || isPlaceholderImageSrc(currentSrc))) {
    promotedTag = setHtmlAttribute(promotedTag, "src", lazySrc);
  }

  if (lazySrcSet.trim()) {
    promotedTag = setHtmlAttribute(promotedTag, "srcset", lazySrcSet);
  } else if (currentSrcSet && isPlaceholderImageSrc(currentSrcSet)) {
    promotedTag = removeHtmlAttribute(promotedTag, "srcset");
  }

  return promotedTag;
}

function promoteLazyImages(html: string) {
  return html
    .replace(/<source\b[^>]*>/gi, promoteLazyImageTag)
    .replace(/<img\b[^>]*>/gi, promoteLazyImageTag)
    .replace(/\sdata-lazyimg="true"/gi, "");
}

function applyGeneratedImageReplacements(html: string) {
  return GENERATED_IMAGE_REPLACEMENTS.reduce(
    (output, { pattern, replacement }) => output.replace(pattern, replacement),
    html,
  );
}

function applyHomepageCourseCopyReplacements(html: string) {
  return HOMEPAGE_COURSE_COPY_REPLACEMENTS.reduce(
    (output, replacement) => output.replace(HOMEPAGE_REFUND_POLICY_COPY_PATTERN, replacement),
    html,
  );
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHomepageReviewHighlightsHtml() {
  const reviewCards = homepageReviewHighlights
    .map(
      (review) => `
        <article class="rda-review-photo-card">
          <figure class="rda-review-photo-media">
            <img src="${escapeHtml(review.image.src)}" alt="${escapeHtml(review.image.alt)}" loading="lazy" decoding="async" width="640" height="853" />
          </figure>
          <div class="rda-review-photo-body">
            <p class="rda-review-photo-feature">${escapeHtml(review.feature)}</p>
            <p class="rda-review-rating">${escapeHtml(review.rating)}.0 / 5</p>
            <blockquote>${escapeHtml(review.quote)}</blockquote>
            <div>
              <p class="rda-review-name">${escapeHtml(review.name)}</p>
              <p class="rda-review-meta">${escapeHtml(review.meta)}</p>
            </div>
          </div>
        </article>`,
    )
    .join("");

  return `
    <section class="rda-stable-section rda-home-review-highlights" data-rda-home-review-highlights="true" aria-labelledby="rda-home-review-highlights-title">
      <div class="rda-section-heading">
        <h2 id="rda-home-review-highlights-title">What Students Are Saying</h2>
        <span aria-hidden="true"></span>
      </div>
      <p class="rda-review-score">5.0 Roseville Dental Academy - 77 Google reviews</p>
      <p class="rda-review-photo-intro">Recent student feedback paired with real moments from the academy gallery.</p>
      <div class="rda-review-photo-grid">
        ${reviewCards}
      </div>
    </section>`;
}

function insertHomepageReviewHighlights(html: string) {
  if (html.includes('data-rda-home-review-highlights="true"')) {
    return html;
  }

  const markerIndex = html.indexOf(HOMEPAGE_AFTER_HERO_WIDGET_MARKER);

  if (markerIndex >= 0) {
    return `${html.slice(0, markerIndex)}${renderHomepageReviewHighlightsHtml()}${html.slice(markerIndex)}`;
  }

  const match = html.match(HOMEPAGE_HERO_WIDGET_REGEX);

  if (match?.index === undefined) {
    return html;
  }

  const end = findClosingDiv(html, match.index + match[0].length);

  return `${html.slice(0, end)}${renderHomepageReviewHighlightsHtml()}${html.slice(end)}`;
}

function sanitizeSnapshotBody(bodyHtml: string) {
  const scriptFreeHtml = stripScriptTags(bodyHtml);
  const iframeFreeHtml = stripIframes(scriptFreeHtml);
  const widgetFreeHtml = stripExcludedWidgets(iframeFreeHtml);
  const badgeFreeHtml = stripDirectTrustedSiteBadges(widgetFreeHtml);

  return applyGeneratedImageReplacements(promoteLazyImages(badgeFreeHtml)).trim();
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
  const sanitizedBodyHtml = sanitizeSnapshotBody(bodyHtml);

  return {
    bodyClass,
    bodyHtml:
      route.route === "/"
        ? insertHomepageReviewHighlights(applyHomepageCourseCopyReplacements(sanitizedBodyHtml))
        : sanitizedBodyHtml,
    bodyScripts: [],
    description,
    headScripts: [],
    headStylesHtml: styleBlocks ? `<style data-rda-live-snapshot-styles>${styleBlocks}</style>` : "",
    title,
  };
}
