import { MirrorScriptLoader } from "@/components/site/mirror-script-loader";
import {
  fetchLiveMirrorDocument,
  getLiveRouteForSlug,
  LIVE_BODY_CLASS,
} from "@/lib/live-route-data";

const mirrorRuntimeBootstrap = `
(() => {
  const externalAssetPattern = /^(?:https?:)?\\/\\/(?:img1\\.wsimg\\.com|www\\.googletagmanager\\.com|connect\\.facebook\\.net|cdn\\.trustedsite\\.com)/i;
  const liveSitePattern = /^(?:https?:)?\\/\\/(?:www\\.)?rosevilledentalacademy\\.com/i;

  function normalizeUrl(value) {
    if (typeof value !== "string" || value.length === 0) {
      return value;
    }

    if (value.startsWith("//") && externalAssetPattern.test("https:" + value)) {
      return "https:" + value;
    }

    if (value.startsWith("http://") && externalAssetPattern.test(value)) {
      return value.replace(/^http:\\/\\//i, "https://");
    }

    if (liveSitePattern.test(value)) {
      if (/\\/g\\/api\\/checkout\\/v2\\/cart/i.test(value)) {
        return value.replace(liveSitePattern, "");
      }

      if (/\\/g\\/api\\/cart\\/cart/i.test(value) || /\\/markup\\/ad/i.test(value)) {
        return value.replace(liveSitePattern, "");
      }
    }

    if (value.startsWith("//") && liveSitePattern.test("https:" + value)) {
      const normalized = "https:" + value;
      if (/\\/g\\/api\\//i.test(normalized) || /\\/markup\\/ad/i.test(normalized)) {
        return normalized.replace(liveSitePattern, "");
      }
    }

    return value;
  }

  function normalizeSrcSet(value) {
    if (typeof value !== "string" || value.length === 0) {
      return value;
    }

    return value
      .replace(/(?<!https?:)\\/\\/(?=(?:img1\\.wsimg\\.com|www\\.googletagmanager\\.com|connect\\.facebook\\.net|cdn\\.trustedsite\\.com))/gi, "https://")
      .replace(/http:\\/\\/(?=(?:img1\\.wsimg\\.com|www\\.googletagmanager\\.com|connect\\.facebook\\.net|cdn\\.trustedsite\\.com))/gi, "https://");
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

  function patchProperty(prototype, property, normalizer) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

    if (!descriptor || typeof descriptor.set !== "function" || typeof descriptor.get !== "function") {
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

  patchProperty(HTMLImageElement.prototype, "src", normalizeUrl);
  patchProperty(HTMLScriptElement.prototype, "src", normalizeUrl);
  patchProperty(HTMLAnchorElement.prototype, "href", normalizeUrl);
  patchProperty(HTMLLinkElement.prototype, "href", normalizeUrl);
  patchProperty(HTMLSourceElement.prototype, "srcset", normalizeSrcSet);
  patchProperty(HTMLImageElement.prototype, "srcset", normalizeSrcSet);

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
})();
`;

function MirrorMarkup({
  bodyScripts,
  bodyClass,
  bodyHtml,
  headScripts,
  headStylesHtml,
}: {
  bodyScripts: string[];
  bodyClass: string;
  bodyHtml: string;
  headScripts: string[];
  headStylesHtml: string;
}) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.body.className = ${JSON.stringify(bodyClass)};`,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: mirrorRuntimeBootstrap,
        }}
      />
      {headStylesHtml ? (
        <div
          style={{ display: "contents" }}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: headStylesHtml }}
        />
      ) : null}
      <div
        style={{ display: "contents" }}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
      <MirrorScriptLoader bodyScripts={bodyScripts} headScripts={headScripts} />
    </>
  );
}

export async function Live404Page() {
  const document = await fetchLiveMirrorDocument("/registration");
  return (
    <MirrorMarkup
      bodyClass={document.bodyClass || LIVE_BODY_CLASS}
      bodyHtml={document.bodyHtml}
      bodyScripts={document.bodyScripts}
      headScripts={document.headScripts}
      headStylesHtml={document.headStylesHtml}
    />
  );
}

export async function LiveRoutePage({
  slug = "",
}: {
  slug?: string | string[];
}) {
  const route = getLiveRouteForSlug(slug);

  if (!route || route.kind === "plain404") {
    return <Live404Page />;
  }

  const document = await fetchLiveMirrorDocument(route.route);
  return (
    <MirrorMarkup
      bodyClass={document.bodyClass || LIVE_BODY_CLASS}
      bodyHtml={document.bodyHtml}
      bodyScripts={document.bodyScripts}
      headScripts={document.headScripts}
      headStylesHtml={document.headStylesHtml}
    />
  );
}
