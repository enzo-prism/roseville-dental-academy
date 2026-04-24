import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";

export const ROOT = resolve(process.cwd());
export const LIVE_ORIGIN = process.env.LIVE_ORIGIN ?? "https://rosevilledentalacademy.com";
export const BASELINE_DIR = process.env.BASELINE_DIR
  ? resolve(ROOT, process.env.BASELINE_DIR)
  : resolve(ROOT, "tests/baselines/live");
export const MANIFEST_PATH = resolve(ROOT, "snapshot/live/manifest.json");
export const ASSET_MAP_PATH = resolve(ROOT, "snapshot/live/assets.json");
export const PUBLIC_ASSET_ROOT = resolve(ROOT, "public", "__live");

const LOCALIZABLE_HOSTS = new Set(["img1.wsimg.com", "cdn.trustedsite.com"]);
const STRIPPED_HOSTS = new Set(["www.googletagmanager.com", "connect.facebook.net"]);
const STRIPPED_PATH_FRAGMENTS = ["/signals/js/clients/scc-c2/"];

export const VISUAL_VIEWPORTS = {
  desktop: { width: 1440, height: 2200 },
  mobile: { width: 390, height: 844 },
};

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true });
}

export async function loadManifest() {
  return readJson(MANIFEST_PATH);
}

export async function saveManifest(manifest) {
  await writeJson(MANIFEST_PATH, manifest);
}

export async function loadAssetMap() {
  try {
    return await readJson(ASSET_MAP_PATH);
  } catch {
    return {};
  }
}

export async function saveAssetMap(assetMap) {
  await writeJson(ASSET_MAP_PATH, assetMap);
}

export function normalizeExternalUrl(rawValue) {
  if (!rawValue || typeof rawValue !== "string") {
    return null;
  }

  const withEntities = rawValue
    .replace(/&amp;/g, "&")
    .trim()
    .replace(/[),;]+$/g, "");
  const normalized = withEntities.startsWith("//")
    ? `https:${withEntities}`
    : withEntities.replace(/^http:\/\//i, "https://");

  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

export function isTelemetryUrl(rawUrl) {
  const normalized = normalizeExternalUrl(rawUrl);

  if (!normalized) {
    return false;
  }

  const url = new URL(normalized);

  return (
    STRIPPED_HOSTS.has(url.hostname) ||
    STRIPPED_PATH_FRAGMENTS.some((fragment) => url.pathname.includes(fragment))
  );
}

export function shouldLocalizeAssetUrl(rawUrl) {
  const normalized = normalizeExternalUrl(rawUrl);

  if (!normalized) {
    return false;
  }

  const url = new URL(normalized);
  return LOCALIZABLE_HOSTS.has(url.hostname);
}

function extensionFromContentType(contentType = "") {
  const normalized = contentType.toLowerCase().split(";")[0].trim();

  switch (normalized) {
    case "application/javascript":
    case "application/x-javascript":
    case "text/javascript":
      return ".js";
    case "text/css":
      return ".css";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    case "image/x-icon":
      return ".ico";
    case "image/gif":
      return ".gif";
    case "font/woff2":
      return ".woff2";
    case "font/woff":
      return ".woff";
    case "font/ttf":
      return ".ttf";
    case "font/otf":
      return ".otf";
    case "application/json":
      return ".json";
    case "text/html":
      return ".html";
    default:
      return "";
  }
}

function insertHashBeforeExtension(pathname, hash) {
  const extension = extname(pathname);

  if (extension) {
    return `${pathname.slice(0, -extension.length)}__${hash}${extension}`;
  }

  return `${pathname}__${hash}`;
}

export function buildLocalAssetPath(rawUrl, contentType = "") {
  const normalized = normalizeExternalUrl(rawUrl);

  if (!normalized) {
    throw new Error(`Unable to normalize asset URL: ${rawUrl}`);
  }

  const url = new URL(normalized);
  let pathname = url.pathname;
  let variantSuffix = "";
  const transformedPathMatch = pathname.match(/^(.*\.[a-z0-9]+)(\/.*)$/i);

  if (transformedPathMatch) {
    pathname = transformedPathMatch[1];
    variantSuffix = transformedPathMatch[2];
  }

  const hashedSearch = variantSuffix || url.search
    ? createHash("sha1").update(`${variantSuffix}${url.search}`).digest("hex").slice(0, 10)
    : "";

  if (hashedSearch) {
    pathname = insertHashBeforeExtension(pathname, hashedSearch);
  }

  if (!extname(pathname)) {
    pathname = `${pathname}${extensionFromContentType(contentType) || ".bin"}`;
  }

  return `/__live/${url.hostname}${pathname}`;
}

export async function writeBinaryFile(path, buffer) {
  await ensureParent(path);
  await writeFile(path, buffer);
}

export function stripServiceWorkerRegistration(html) {
  return html.replace(
    /<script>"use strict"; if \('serviceWorker' in navigator\) \{ window\.addEventListener\('load', function \(\) \{ navigator\.serviceWorker\.register\('\/sw\.js'\); \}\); \}<\/script>/i,
    "",
  );
}

export function stripTelemetryScripts(html) {
  return html
    .replace(
      /<script[^>]+src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"[^>]*><\/script>/gi,
      "",
    )
    .replace(
      /<script[^>]+src="(?:https:)?\/\/connect\.facebook\.net[^"]*"[^>]*><\/script>/gi,
      "",
    )
    .replace(
      /<script[^>]+src="(?:https:)?\/\/img1\.wsimg\.com\/signals\/js\/clients\/scc-c2\/[^"]*"[^>]*><\/script>/gi,
      "",
    );
}

export function stripCommerceEmbeds(html) {
  return html.replace(
    /<iframe([^>]*id="commerce_cart_frame"[^>]*?)\s+src="([^"]*)"([^>]*)><\/iframe>/gi,
    (_match, before, src, after) =>
      `<iframe${before} srcdoc="<!DOCTYPE html><html><body></body></html>" data-disabled-src="${src}"${after} aria-hidden="true" style="display:none"></iframe>`,
  );
}

export function preservePdfPreviewMetadata(html) {
  return html.replace(
    /<canvas\b([^>]*data-aid="PDF_PREVIEW_RENDERED"[^>]*)>/gi,
    (match, attributes) => {
      if (/data-frozen-width=/i.test(attributes) || /data-frozen-height=/i.test(attributes)) {
        return match;
      }

      const widthMatch = attributes.match(/\bwidth="([^"]+)"/i);
      const heightMatch = attributes.match(/\bheight="([^"]+)"/i);

      if (!widthMatch || !heightMatch) {
        return match;
      }

      return `<canvas${attributes} data-frozen-width="${widthMatch[1]}" data-frozen-height="${heightMatch[1]}">`;
    },
  );
}

export function rewriteInternalLinks(html) {
  return html
    .replace(
      /\b(href|action)=("|')https:\/\/(?:www\.)?rosevilledentalacademy\.com([^"']*)\2/gi,
      (_match, attribute, quote, path) => `${attribute}=${quote}${path || "/"}${quote}`,
    )
    .replace(
      /\b(href|action)=("|')(?:https?:)?\/\/(?:www\.)?rosevilledentalacademy\.com([^"']*)\2/gi,
      (_match, attribute, quote, path) => `${attribute}=${quote}${path || "/"}${quote}`,
    )
    .replace(
      /https:\/\/(?:www\.)?rosevilledentalacademy\.com\/g\/api\/checkout\/v2\/cart/gi,
      "/g/api/checkout/v2/cart",
    )
    .replace(
      /https:\/\/(?:www\.)?rosevilledentalacademy\.com\/g\/api\/cart\/cart/gi,
      "/g/api/cart/cart",
    )
    .replace(/https:\/\/(?:www\.)?rosevilledentalacademy\.com\/markup\/ad/gi, "/markup/ad");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function encodeLocalAssetUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/__live/")) {
    return value;
  }

  return encodeURI(value);
}

function buildBrowserAssetMap(assetMap) {
  return Object.fromEntries(
    Object.entries(assetMap).map(([originalUrl, localPath]) => [
      originalUrl,
      encodeLocalAssetUrl(localPath),
    ]),
  );
}

export function rewriteAssetReferences(content, assetMap) {
  let nextContent = content;
  const entries = Object.entries(assetMap).sort(([left], [right]) => right.length - left.length);

  for (const [originalUrl, localPath] of entries) {
    const normalized = normalizeExternalUrl(originalUrl);

    if (!normalized) {
      continue;
    }

    const url = new URL(normalized);
    const protocolRelative = `//${url.host}${url.pathname}${url.search}`;
    const htmlEscaped = normalized.replace(/&/g, "&amp;");
    const htmlEscapedProtocolRelative = protocolRelative.replace(/&/g, "&amp;");
    const browserLocalPath = encodeLocalAssetUrl(localPath);

    for (const candidate of [normalized, protocolRelative, htmlEscaped, htmlEscapedProtocolRelative]) {
      nextContent = nextContent.replace(new RegExp(escapeRegExp(candidate), "g"), browserLocalPath);
    }
  }

  return nextContent;
}

export function buildRuntimeBootstrap(assetMap) {
  const browserAssetMap = buildBrowserAssetMap(assetMap);

  return `
(() => {
  const assetMap = ${JSON.stringify(browserAssetMap)};
  const frozenPdfPreviews = Array.isArray(globalThis.__FROZEN_PDF_PREVIEWS)
    ? globalThis.__FROZEN_PDF_PREVIEWS
    : [];
  const liveSitePattern = /^(?:https?:)?\\/\\/(?:www\\.)?rosevilledentalacademy\\.com/i;
  const queuedDefineCalls = [];

  function queuedDefine(...args) {
    queuedDefineCalls.push(args);
  }

  let currentDefine = typeof globalThis.define === "function" ? globalThis.define : queuedDefine;

  function flushQueuedDefines() {
    if (typeof currentDefine !== "function" || currentDefine === queuedDefine) {
      return;
    }

    while (queuedDefineCalls.length > 0) {
      const args = queuedDefineCalls.shift();

      try {
        currentDefine.apply(globalThis, args);
      } catch {
        // Ignore replay errors from optional late-loaded modules.
      }
    }
  }

  try {
    Object.defineProperty(globalThis, "define", {
      configurable: true,
      get() {
        return currentDefine;
      },
      set(value) {
        currentDefine = typeof value === "function" ? value : queuedDefine;
        flushQueuedDefines();
      },
    });
  } catch {
    globalThis.define = currentDefine;
  }

  flushQueuedDefines();

  if (!globalThis.__Commerce || typeof globalThis.__Commerce !== "object") {
    globalThis.__Commerce = {};
  }

  if (!globalThis.__Commerce.setupPromise) {
    globalThis.__Commerce.setupPromise = Promise.resolve();
  }

  if (!globalThis.__Commerce.options) {
    globalThis.__Commerce.options = {};
  }

  if (!globalThis.google || typeof globalThis.google !== "object") {
    const noop = () => undefined;
    function emptyObject() {
      return {};
    }

    globalThis.google = {
      maps: {
        Animation: {},
        ControlPosition: {},
        __gjsload__: noop,
        importLibrary: async () => ({}),
        event: {
          addDomListener: noop,
          addListener: noop,
          clearInstanceListeners: noop,
          trigger: noop,
        },
        Geocoder: emptyObject,
        InfoWindow: emptyObject,
        LatLng: emptyObject,
        LatLngBounds: function LatLngBounds() {
          return {
            extend: noop,
            getCenter: emptyObject,
          };
        },
        Load: noop,
        Map: emptyObject,
        MapTypeId: {
          ROADMAP: "roadmap",
        },
        Marker: emptyObject,
        Size: emptyObject,
      },
    };
  }

  function normalizeUrl(value) {
    if (typeof value !== "string" || value.length === 0) {
      return value;
    }

    const withEntities = value.replace(/&amp;/g, "&");
    const normalized = withEntities.startsWith("//")
      ? "https:" + withEntities
      : withEntities.replace(/^http:\\/\\//i, "https://");

    if (assetMap[withEntities]) {
      return assetMap[withEntities];
    }

    if (assetMap[normalized]) {
      return assetMap[normalized];
    }

    if (liveSitePattern.test(normalized)) {
      return normalized.replace(liveSitePattern, "") || "/";
    }

    return normalized;
  }

  function normalizeSrcSet(value) {
    if (typeof value !== "string" || value.length === 0) {
      return value;
    }

    const candidateSeparator = "__SRCSET_SEP__";

    return value
      .replace(/,\\s*(?=(?:https?:)?\\/\\/)/g, " " + candidateSeparator + " ")
      .replace(/,\\s+(?=(?:cg:true|m|w:[^,\\s]+|h:[^,\\s]+|l:[^,\\s]+|t:[^,\\s]+))/gi, ",")
      .split(candidateSeparator)
      .map((entry) => {
        const trimmed = entry.trim();

        if (!trimmed) {
          return "";
        }

        const match = trimmed.match(/^(\\S+)(?:\\s+(.+))?$/);

        if (!match) {
          return trimmed;
        }

        const [, urlPart, descriptor] = match;
        const nextUrl = normalizeUrl(urlPart);
        return descriptor ? nextUrl + " " + descriptor.trim() : nextUrl;
      })
      .filter(Boolean)
      .join(", ");
  }

  function rewriteMarkup(value) {
    if (typeof value !== "string" || value.length === 0) {
      return value;
    }

    let nextValue = value;

    for (const [originalUrl, localPath] of Object.entries(assetMap)) {
      const withEntities = originalUrl.replace(/&/g, "&amp;");
      const normalized = withEntities.startsWith("//")
        ? "https:" + withEntities
        : withEntities.replace(/^http:\\/\\//i, "https://");
      const url = (() => {
        try {
          return new URL(normalized);
        } catch {
          return null;
        }
      })();

      const candidates = [withEntities, normalized];

      if (url) {
        candidates.push(
          "//" + url.host + url.pathname + url.search,
          ("//" + url.host + url.pathname + url.search).replace(/&/g, "&amp;"),
        );
      }

      for (const candidate of candidates) {
        nextValue = nextValue.split(candidate).join(localPath);
      }
    }

    return nextValue
      .replace(/https:\\/\\/(?:www\\.)?rosevilledentalacademy\\.com\\/g\\/api\\/checkout\\/v2\\/cart/gi, "/g/api/checkout/v2/cart")
      .replace(/https:\\/\\/(?:www\\.)?rosevilledentalacademy\\.com\\/g\\/api\\/cart\\/cart/gi, "/g/api/cart/cart")
      .replace(/https:\\/\\/(?:www\\.)?rosevilledentalacademy\\.com\\/markup\\/ad/gi, "/markup/ad")
      .replace(/\\b(href|action)=("|')https:\\/\\/(?:www\\.)?rosevilledentalacademy\\.com([^"']*)\\2/gi, (_match, attribute, quote, path) => \`\${attribute}=\${quote}\${path || "/"}\${quote}\`)
      .replace(/\\b(href|action)=("|')(?:https?:)?\\/\\/(?:www\\.)?rosevilledentalacademy\\.com([^"']*)\\2/gi, (_match, attribute, quote, path) => \`\${attribute}=\${quote}\${path || "/"}\${quote}\`);
  }

  function patchProperty(prototype, property, normalizer) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

    if (!descriptor || typeof descriptor.get !== "function" || typeof descriptor.set !== "function") {
      return;
    }

    Object.defineProperty(prototype, property, {
      configurable: true,
      enumerable: descriptor.enumerable ?? true,
      get: descriptor.get,
      set(value) {
        return descriptor.set.call(this, typeof value === "string" ? normalizer(value) : value);
      },
    });
  }

  function patchMarkupProperty(prototype, property) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

    if (!descriptor || typeof descriptor.get !== "function" || typeof descriptor.set !== "function") {
      return;
    }

    Object.defineProperty(prototype, property, {
      configurable: true,
      enumerable: descriptor.enumerable ?? true,
      get: descriptor.get,
      set(value) {
        return descriptor.set.call(this, typeof value === "string" ? rewriteMarkup(value) : value);
      },
    });
  }

  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function patchedSetAttribute(name, value) {
    let nextValue = value;

    if (typeof value === "string") {
      if (name === "src" || name === "href" || name === "action") {
        nextValue = normalizeUrl(value);
      } else if (name === "srcset") {
        nextValue = normalizeSrcSet(value);
      }
    }

    return originalSetAttribute.call(this, name, nextValue);
  };

  patchProperty(HTMLImageElement.prototype, "src", normalizeUrl);
  patchProperty(HTMLScriptElement.prototype, "src", normalizeUrl);
  patchProperty(HTMLAnchorElement.prototype, "href", normalizeUrl);
  patchProperty(HTMLLinkElement.prototype, "href", normalizeUrl);
  patchProperty(HTMLIFrameElement.prototype, "src", normalizeUrl);
  patchProperty(HTMLSourceElement.prototype, "srcset", normalizeSrcSet);
  patchProperty(HTMLImageElement.prototype, "srcset", normalizeSrcSet);
  patchMarkupProperty(Element.prototype, "innerHTML");
  patchMarkupProperty(Element.prototype, "outerHTML");

  const originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function patchedInsertAdjacentHTML(position, text) {
    return originalInsertAdjacentHTML.call(this, position, rewriteMarkup(text));
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string") {
      return originalFetch(normalizeUrl(input), init);
    }

    if (input instanceof Request) {
      return originalFetch(new Request(normalizeUrl(input.url), input), init);
    }

    return originalFetch(input, init);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
    return originalOpen.call(this, method, typeof url === "string" ? normalizeUrl(url) : url, ...rest);
  };

  if (typeof navigator.sendBeacon === "function") {
    const originalBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => originalBeacon(normalizeUrl(String(url)), data);
  }

  function normalizeElement(element) {
    if (!(element instanceof Element)) {
      return;
    }

    function normalizeAttribute(name, normalizer) {
      if (!element.hasAttribute(name)) {
        return;
      }

      const value = element.getAttribute(name);

      if (!value) {
        return;
      }

      const nextValue = normalizer(value);

      if (nextValue && nextValue !== value) {
        element.setAttribute(name, nextValue);
      }
    }

    normalizeAttribute("src", normalizeUrl);
    normalizeAttribute("href", normalizeUrl);
    normalizeAttribute("action", normalizeUrl);
    normalizeAttribute("srcset", normalizeSrcSet);
    normalizeAttribute("data-srclazy", normalizeUrl);
    normalizeAttribute("data-srcsetlazy", normalizeSrcSet);
  }

  function normalizeDom(root) {
    if (!root) {
      return;
    }

    if (root instanceof Element) {
      normalizeElement(root);
    }

    const elements = root.querySelectorAll
      ? root.querySelectorAll("[src], [href], [action], [srcset], [data-srclazy], [data-srcsetlazy]")
      : [];

    for (const element of elements) {
      normalizeElement(element);
    }
  }

  function hydrateLazyImages() {
    const images = Array.from(document.querySelectorAll('img[data-lazyimg="true"]'));

    for (const image of images) {
      const rect = image.getBoundingClientRect();
      const nearViewport = rect.bottom > window.innerHeight * -0.1 && rect.top < window.innerHeight * 1.05;

      if (!nearViewport) {
        continue;
      }

      const lazySrc = image.getAttribute("data-srclazy");
      const lazySrcSet = image.getAttribute("data-srcsetlazy");

      if (lazySrc) {
        image.setAttribute("src", normalizeUrl(lazySrc));
      }

      if (lazySrcSet) {
        image.setAttribute("srcset", normalizeSrcSet(lazySrcSet));
      }
    }
  }

  function removeLoadingFileLabels() {
    const elements = Array.from(document.querySelectorAll("body *"));

    for (const element of elements) {
      if ((element.textContent || "").trim() === "Loading files") {
        element.remove();
      }
    }
  }

  let frozenCartLinkHtml = "";
  const fallbackCartLinkHtml = '<a rel="" role="button" aria-haspopup="menu" data-ux="UtilitiesMenuLink" aria-label="Shopping Cart Icon" data-typography="NavAlpha" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;color:currentColor"><svg viewBox="0 0 24 24" fill="currentColor" width="40px" height="40px" data-ux="UtilitiesMenuIcon" data-aid="CART_ICON_RENDER" data-typography="NavAlpha"><path fill-rule="evenodd" d="M17.39 17.381c-.713 0-1.305.593-1.305 1.31 0 .715.592 1.31 1.305 1.31s1.305-.595 1.305-1.31c0-.717-.592-1.31-1.305-1.31m-9.133 0c-.713 0-1.305.593-1.305 1.31 0 .715.592 1.31 1.305 1.31s1.305-.595 1.305-1.31c0-.717-.592-1.31-1.305-1.31m9.765-2.061c.357 0 .673.376.673.734 0 .359-.295.735-.652.735H7.605a.659.659 0 0 1-.653-.655c0-.219.22-.654.409-1.006.138-.257.179-.553.118-.839L5.77 5.309H4.652A.658.658 0 0 1 4 4.655C4 4.297 4.296 4 4.652 4h1.774c.683 0 .704.819.805 1.309h12.116c.357 0 .653.297.653.655l-1.358 4.917a3.167 3.167 0 0 1-2.509 2.095l-7.356 1.132s.172.257.172.565c0 .308-.305.647-.305.647h9.378zM7.531 6.809l1.139 5.722 7.292-1.02a1.568 1.568 0 0 0 1.253-1.124l1.07-3.679-10.754.101z"></path></svg></a>';

  function isVisible(element) {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number.parseFloat(style.opacity || "1") > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function findCartLink(root) {
    if (!root || typeof root.querySelector !== "function") {
      return null;
    }

    const link = root.querySelector('a[aria-label="Shopping Cart Icon"]');

    if (link instanceof HTMLElement) {
      return link;
    }

    const icon = root.querySelector('[data-aid="CART_ICON_RENDER"]');
    const iconLink = icon?.closest("a");

    return iconLink instanceof HTMLElement ? iconLink : null;
  }

  function rememberCartIcon(root) {
    if (frozenCartLinkHtml) {
      return;
    }

    const cartLink = findCartLink(root);

    if (cartLink) {
      frozenCartLinkHtml = cartLink.outerHTML;
    }
  }

  function stabilizeCartIcon() {
    rememberCartIcon(document);

    const visibleCart = Array.from(document.querySelectorAll('a[aria-label="Shopping Cart Icon"]')).some(
      (element) => isVisible(element),
    );

    if (visibleCart) {
      return;
    }

    const cartHtml = frozenCartLinkHtml || fallbackCartLinkHtml;
    const membershipLink = Array.from(
      document.querySelectorAll('a[data-aid="MEMBERSHIP_ICON_DESKTOP_RENDERED"]'),
    ).find((element) => element instanceof HTMLElement && isVisible(element));

    const template = document.createElement("template");
    template.innerHTML = cartHtml.trim();
    const restoredCart = template.content.firstElementChild;

    if (!(restoredCart instanceof HTMLElement)) {
      return;
    }

    restoredCart.setAttribute("data-live-mirror-restored-cart", "true");

    if (!(membershipLink instanceof HTMLElement)) {
      const mobileSlot = Array.from(
        document.querySelectorAll('[data-ux="UtilitiesMenu"] div[id^="bs-"]'),
      ).find((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        return rect.top > 0 && rect.top < 220;
      });

      if (!(mobileSlot instanceof HTMLElement)) {
        return;
      }

      mobileSlot.replaceChildren(restoredCart);
      mobileSlot.style.setProperty("display", "inline-flex", "important");
      mobileSlot.style.setProperty("align-items", "center", "important");
      mobileSlot.style.setProperty("justify-content", "flex-end", "important");

      const utilityMenu = mobileSlot.closest('[data-ux="UtilitiesMenu"]');

      if (utilityMenu instanceof HTMLElement) {
        utilityMenu.style.setProperty("display", "flex", "important");
        utilityMenu.style.setProperty("align-items", "center", "important");
        utilityMenu.style.setProperty("justify-content", "flex-end", "important");
      }

      return;
    }

    const membershipWrapper = membershipLink.closest('span[data-ux="Element"]') ?? membershipLink;
    const wrapperParent = membershipWrapper.parentElement;

    if (!wrapperParent) {
      return;
    }

    const cartWrapper = document.createElement("span");
    cartWrapper.setAttribute("data-ux", "Element");

    if (membershipWrapper instanceof HTMLElement) {
      cartWrapper.className = membershipWrapper.className;
    }

    cartWrapper.appendChild(restoredCart);
    wrapperParent.insertBefore(cartWrapper, membershipWrapper);
  }

  function stabilizeDesktopHeaderNav() {
    const desktopNav = document.querySelector('[data-aid="HEADER_NAV_RENDERED"]');

    if (!desktopNav) {
      return;
    }

    const stableTopLevelLabels = new Set([
      "home",
      "bls/cpr",
      "infection control",
      "coronal polish",
      "radiation safety",
    ]);

    const topLevelLinks = Array.from(desktopNav.querySelectorAll('a[data-ux="NavLink"]'));

    for (const link of topLevelLinks) {
      const label = (link.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();

      if (!label || stableTopLevelLabels.has(label)) {
        continue;
      }

      const navItem = link.closest("li");

      if (navItem instanceof HTMLElement) {
        navItem.classList.remove("visible");
        navItem.style.setProperty("display", "none", "important");
        navItem.style.setProperty("visibility", "hidden", "important");
      }
    }

    const dropdowns = Array.from(desktopNav.querySelectorAll('a[data-aid="NAV_DROPDOWN"]'));

    for (const dropdown of dropdowns) {
      const label = (dropdown.textContent || "").replace(/\\s+/g, " ").trim();

      if (!/^More Information$/i.test(label)) {
        continue;
      }

      const navItem = dropdown.closest("li");

      if (navItem instanceof HTMLElement) {
        navItem.classList.remove("visible");
        navItem.style.setProperty("display", "none", "important");
        navItem.style.setProperty("visibility", "hidden", "important");
      }
    }

    const moreMenu = desktopNav.querySelector('a[data-aid="NAV_MORE"]');
    const moreMenuItem = moreMenu?.closest("li");

    if (moreMenuItem instanceof HTMLElement) {
      moreMenuItem.classList.add("visible");
      moreMenuItem.style.removeProperty("display");
      moreMenuItem.style.setProperty("visibility", "visible", "important");
    }
  }

  function stabilizeUtilityIcons() {
    const membershipLink = Array.from(
      document.querySelectorAll('a[data-aid="MEMBERSHIP_ICON_DESKTOP_RENDERED"]'),
    ).find((element) => element instanceof HTMLElement && isVisible(element));

    if (!(membershipLink instanceof HTMLElement)) {
      return;
    }

    const visibleCart = Array.from(
      document.querySelectorAll('a[aria-label="Shopping Cart Icon"]'),
    ).find((element) => element instanceof HTMLElement && isVisible(element));

    if (!(visibleCart instanceof HTMLElement)) {
      return;
    }

    const iconCluster = membershipLink.parentElement?.parentElement;

    if (iconCluster instanceof HTMLElement) {
      iconCluster.style.setProperty("display", "inline-flex", "important");
      iconCluster.style.setProperty("align-items", "center", "important");
      iconCluster.style.setProperty("justify-content", "flex-end", "important");
      iconCluster.style.setProperty("gap", "8px", "important");
      iconCluster.style.setProperty("vertical-align", "middle", "important");
    }

    for (const iconLink of [visibleCart, membershipLink]) {
      iconLink.style.setProperty("display", "flex", "important");
      iconLink.style.setProperty("align-items", "center", "important");
      iconLink.style.setProperty("justify-content", "center", "important");
      iconLink.style.setProperty("width", "40px", "important");
      iconLink.style.setProperty("height", "40px", "important");
    }

    for (const wrapper of [visibleCart.parentElement, membershipLink.parentElement]) {
      if (wrapper instanceof HTMLElement) {
        wrapper.style.setProperty("display", "inline-flex", "important");
        wrapper.style.setProperty("align-items", "center", "important");
      }
    }

    const loggedOutWrapper = membershipLink.closest(".membership-icon-logged-out");

    if (loggedOutWrapper instanceof HTMLElement) {
      loggedOutWrapper.style.setProperty("display", "inline-flex", "important");
      loggedOutWrapper.style.setProperty("align-items", "center", "important");
      loggedOutWrapper.style.setProperty("vertical-align", "middle", "important");
    }
  }

  function neutralizeCommerce() {
    globalThis.__Commerce = globalThis.__Commerce || {};
    globalThis.__Commerce.setupPromise = globalThis.__Commerce.setupPromise || Promise.resolve();
    globalThis.__Commerce.options = globalThis.__Commerce.options || {};

    const cartFrame = document.getElementById("commerce_cart_frame");

    if (cartFrame instanceof HTMLIFrameElement) {
      cartFrame.removeAttribute("src");
      cartFrame.setAttribute("srcdoc", "<!DOCTYPE html><html><body></body></html>");
      cartFrame.setAttribute("aria-hidden", "true");
      cartFrame.style.display = "none";
    }

    const commerceScripts = Array.from(
      document.querySelectorAll('script#commerce-cart-script, script[src*="secureserver.net/dist/embed.js"]'),
    );

    for (const script of commerceScripts) {
      script.remove();
    }
  }

  function stabilizeLongLinks() {
    const links = Array.from(document.querySelectorAll("a[href]"));

    for (const link of links) {
      const text = (link.textContent || "").trim();
      const href = link.getAttribute("href") || "";

      if (!/^https?:\\/\\//i.test(text) || Math.max(text.length, href.length) < 40) {
        continue;
      }

      link.style.display = "inline-block";
      link.style.maxWidth = "100%";
      link.style.overflowWrap = "anywhere";
      link.style.wordBreak = "break-all";
    }
  }

  function stabilizePdfPreviewCanvases() {
    function buildFrozenImage(wrapper, preview) {
      const image = document.createElement("img");
      image.setAttribute("data-aid", "PDF_PREVIEW_RENDERED");
      image.setAttribute("src", preview.localPath);

      if (preview.width) {
        image.setAttribute("width", preview.width);
      }

      if (preview.height) {
        image.setAttribute("height", preview.height);
      }

      image.style.display = "block";
      image.style.width = "100%";
      image.style.height = "auto";

      const overlay = wrapper.querySelector('a[data-aid="PDF_LINK_OVERLAY"]');
      wrapper.insertBefore(image, overlay ?? wrapper.firstChild);
      return image;
    }

    for (const preview of frozenPdfPreviews) {
      const previewHref = normalizeUrl(preview.overlayHref || "");
      const overlays = Array.from(document.querySelectorAll('a[data-aid="PDF_LINK_OVERLAY"]')).filter(
        (overlay) => normalizeUrl(overlay.getAttribute("href") || "") === previewHref,
      );

      for (const overlay of overlays) {
        const wrapper = overlay.parentElement;

        if (!wrapper) {
          continue;
        }

        for (const canvas of wrapper.querySelectorAll('canvas[data-aid="PDF_PREVIEW_RENDERED"]')) {
          canvas.remove();
        }

        for (const loader of wrapper.querySelectorAll('[data-aid="PDF_LOADING_ANIMATION"]')) {
          if (loader instanceof HTMLElement) {
            loader.remove();
          }
        }

        for (const block of wrapper.querySelectorAll("div, p, span")) {
          if ((block.textContent || "").trim() === "Loading files") {
            block.remove();
          }
        }

        const activeImage = wrapper.querySelector('img[data-aid="PDF_PREVIEW_RENDERED"]');

        if (
          !(activeImage instanceof HTMLImageElement) ||
          activeImage.getAttribute("src") !== preview.localPath
        ) {
          if (activeImage instanceof HTMLElement) {
            activeImage.remove();
          }

          buildFrozenImage(wrapper, preview);
        }

        overlay.style.removeProperty("display");
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.removeProperty("pointer-events");
        overlay.removeAttribute("aria-hidden");
      }
    }
  }

  function stabilizeOverlayAnchors() {
    const overlays = Array.from(document.querySelectorAll('a[data-aid="PDF_LINK_OVERLAY"]'));

    for (const overlay of overlays) {
      if (overlay.parentElement?.querySelector('canvas[data-aid="PDF_PREVIEW_RENDERED"]')) {
        overlay.style.removeProperty("display");
        overlay.style.removeProperty("pointer-events");
        overlay.removeAttribute("aria-hidden");
        continue;
      }

      if ((overlay.textContent || "").trim().length > 0) {
        continue;
      }

      overlay.setAttribute("aria-hidden", "true");
      overlay.style.display = "none";
      overlay.style.pointerEvents = "none";
    }
  }

  function stabilizeContactForms() {
    const containers = Array.from(document.querySelectorAll('[data-aid="CONTACT_FORM_CONTAINER_REND"]'));

    for (const container of containers) {
      if (!(container instanceof HTMLElement) || container.getAttribute("data-user-opened") === "true") {
        continue;
      }

      container.style.display = "none";
    }
  }

  function stabilizeSocialFeed() {
    const followLinks = Array.from(
      document.querySelectorAll('[data-aid="SOCIALFEED_FOLLOW_LINK_RENDERED"]'),
    );

    for (const followLink of followLinks) {
      if (followLink instanceof HTMLElement) {
        followLink.style.setProperty("display", "none", "important");
        followLink.setAttribute("aria-hidden", "true");
      }
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("a, button") : null;

    if (!target) {
      return;
    }

    const label = (target.textContent || "").replace(/\\s+/g, " ").trim();
    const contactForms = Array.from(document.querySelectorAll('[data-aid="CONTACT_FORM_CONTAINER_REND"]'));

    if (/drop us a line/i.test(label)) {
      for (const container of contactForms) {
        container.setAttribute("data-user-opened", "true");
      }
    }

    if (/cancel/i.test(label)) {
      for (const container of contactForms) {
        container.removeAttribute("data-user-opened");
      }
    }
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      normalizeDom(document.documentElement);
      rememberCartIcon(document);
      hydrateLazyImages();
      neutralizeCommerce();
      stabilizeCartIcon();
      stabilizeDesktopHeaderNav();
      stabilizeUtilityIcons();
      stabilizePdfPreviewCanvases();
      stabilizeLongLinks();
      stabilizeOverlayAnchors();
      stabilizeContactForms();
      stabilizeSocialFeed();
      removeLoadingFileLabels();
    }, { once: true });
  } else {
    normalizeDom(document.documentElement);
    rememberCartIcon(document);
    hydrateLazyImages();
    neutralizeCommerce();
    stabilizeCartIcon();
    stabilizeDesktopHeaderNav();
    stabilizeUtilityIcons();
    stabilizePdfPreviewCanvases();
    stabilizeLongLinks();
    stabilizeOverlayAnchors();
    stabilizeContactForms();
    stabilizeSocialFeed();
    removeLoadingFileLabels();
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        normalizeElement(mutation.target);
      }

      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          rememberCartIcon(node);
          normalizeDom(node);
        }
      }
    }

    neutralizeCommerce();
    stabilizeCartIcon();
    stabilizeDesktopHeaderNav();
    stabilizeUtilityIcons();
    stabilizePdfPreviewCanvases();
    stabilizeLongLinks();
    stabilizeOverlayAnchors();
    stabilizeContactForms();
    stabilizeSocialFeed();
  });

  observer.observe(document.documentElement, {
    attributeFilter: ["action", "href", "src", "srcset", "data-srclazy", "data-srcsetlazy"],
    attributes: true,
    childList: true,
    subtree: true,
  });

  window.addEventListener("load", () => normalizeDom(document.documentElement));
  window.addEventListener("load", () => rememberCartIcon(document));
  window.addEventListener("load", hydrateLazyImages);
  window.addEventListener("scroll", hydrateLazyImages, { passive: true });
  window.addEventListener("resize", hydrateLazyImages);
  window.addEventListener("load", neutralizeCommerce);
  window.addEventListener("load", stabilizeCartIcon);
  window.addEventListener("load", stabilizeDesktopHeaderNav);
  window.addEventListener("load", stabilizeUtilityIcons);
  window.addEventListener("load", stabilizePdfPreviewCanvases);
  window.addEventListener("load", stabilizeLongLinks);
  window.addEventListener("load", stabilizeOverlayAnchors);
  window.addEventListener("load", stabilizeContactForms);
  window.addEventListener("load", stabilizeSocialFeed);
  window.addEventListener("load", removeLoadingFileLabels);
  window.setTimeout(() => normalizeDom(document.documentElement), 100);
  window.setTimeout(() => normalizeDom(document.documentElement), 500);
  window.setTimeout(() => normalizeDom(document.documentElement), 2000);
  window.setTimeout(() => rememberCartIcon(document), 100);
  window.setTimeout(() => rememberCartIcon(document), 500);
  window.setTimeout(() => rememberCartIcon(document), 2000);
  window.setTimeout(hydrateLazyImages, 500);
  window.setTimeout(hydrateLazyImages, 2000);
  window.setTimeout(neutralizeCommerce, 100);
  window.setTimeout(neutralizeCommerce, 500);
  window.setTimeout(neutralizeCommerce, 2000);
  window.setTimeout(stabilizeCartIcon, 100);
  window.setTimeout(stabilizeCartIcon, 500);
  window.setTimeout(stabilizeCartIcon, 2000);
  window.setTimeout(stabilizeCartIcon, 5000);
  window.setTimeout(stabilizeDesktopHeaderNav, 100);
  window.setTimeout(stabilizeDesktopHeaderNav, 500);
  window.setTimeout(stabilizeDesktopHeaderNav, 2000);
  window.setTimeout(stabilizeDesktopHeaderNav, 5000);
  window.setTimeout(stabilizeUtilityIcons, 100);
  window.setTimeout(stabilizeUtilityIcons, 500);
  window.setTimeout(stabilizeUtilityIcons, 2000);
  window.setTimeout(stabilizeUtilityIcons, 5000);
  window.setTimeout(stabilizePdfPreviewCanvases, 100);
  window.setTimeout(stabilizePdfPreviewCanvases, 500);
  window.setTimeout(stabilizePdfPreviewCanvases, 2000);
  window.setTimeout(stabilizeLongLinks, 100);
  window.setTimeout(stabilizeLongLinks, 500);
  window.setTimeout(stabilizeLongLinks, 2000);
  window.setTimeout(stabilizeOverlayAnchors, 100);
  window.setTimeout(stabilizeOverlayAnchors, 500);
  window.setTimeout(stabilizeOverlayAnchors, 2000);
  window.setTimeout(stabilizeContactForms, 100);
  window.setTimeout(stabilizeContactForms, 500);
  window.setTimeout(stabilizeContactForms, 2000);
  window.setTimeout(stabilizeSocialFeed, 100);
  window.setTimeout(stabilizeSocialFeed, 500);
  window.setTimeout(stabilizeSocialFeed, 2000);
  window.setTimeout(stabilizeSocialFeed, 5000);
  window.setTimeout(removeLoadingFileLabels, 500);
  window.setTimeout(removeLoadingFileLabels, 2000);
})();
`.trim();
}

export function injectRuntimeBootstrap(html, assetMap, frozenPdfPreviews = []) {
  const frozenPreviewScript = `<script>globalThis.__FROZEN_PDF_PREVIEWS = ${JSON.stringify(frozenPdfPreviews)};</script>`;
  const injection = `${frozenPreviewScript}<script>${buildRuntimeBootstrap(assetMap)}</script>`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
  }

  return `${injection}${html}`;
}

export function normalizeTextValue(value) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeHrefForBaseline(rawHref, baseUrl, assetMap = {}) {
  if (!rawHref) {
    return "";
  }

  const href = rawHref.trim();

  if (!href) {
    return "";
  }

  if (href.startsWith("#")) {
    return href;
  }

  try {
    const resolved = new URL(href, baseUrl);

    if (assetMap[resolved.toString()]) {
      return encodeLocalAssetUrl(assetMap[resolved.toString()]);
    }

    const isInternal =
      resolved.hostname === "rosevilledentalacademy.com" ||
      resolved.hostname === "www.rosevilledentalacademy.com" ||
      resolved.hostname === "127.0.0.1" ||
      resolved.hostname === "localhost";

    if (isInternal) {
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    }

    return resolved.toString();
  } catch {
    return href;
  }
}

export function normalizeVisibleAssetUrl(rawValue, baseUrl, assetMap) {
  if (!rawValue) {
    return "";
  }

  if (/^data:/i.test(rawValue)) {
    return rawValue;
  }

  try {
    const resolved = new URL(rawValue, baseUrl).toString();
    return assetMap[resolved] ? encodeLocalAssetUrl(assetMap[resolved]) : resolved;
  } catch {
    return rawValue;
  }
}

export function getMaskSelectors(route) {
  return (route.visualMasks ?? [])
    .filter((mask) => mask.type === "selector" && mask.value)
    .map((mask) => mask.value);
}

export function resolveFromRoot(...parts) {
  return join(ROOT, ...parts);
}
