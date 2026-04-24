"use client";

import { useEffect } from "react";

type MirrorScriptLoaderProps = {
  bodyScripts: string[];
  headScripts: string[];
};

const externalAssetPattern =
  /^(?:https?:)?\/\/(?:img1\.wsimg\.com|www\.googletagmanager\.com|connect\.facebook\.net|cdn\.trustedsite\.com)/i;

function normalizeAssetUrl(value: string) {
  if (!value) {
    return value;
  }

  if (value.startsWith("//") && externalAssetPattern.test(`https:${value}`)) {
    return `https:${value}`;
  }

  if (value.startsWith("http://") && externalAssetPattern.test(value)) {
    return value.replace(/^http:\/\//i, "https://");
  }

  return value;
}

function normalizeSrcSet(value: string) {
  return value.replace(
    /(?<!https?:)\/\/(?=(?:img1\.wsimg\.com|www\.googletagmanager\.com|connect\.facebook\.net|cdn\.trustedsite\.com))/gi,
    "https://",
  );
}

function normalizeElementAssets(element: Element) {
  if (element instanceof HTMLImageElement || element instanceof HTMLScriptElement || element instanceof HTMLAnchorElement || element instanceof HTMLSourceElement || element instanceof HTMLLinkElement) {
    const src = element.getAttribute("src");
    const href = element.getAttribute("href");
    const srcSet = element.getAttribute("srcset");
    const normalizedSrc = src ? normalizeAssetUrl(src) : null;
    const normalizedHref = href ? normalizeAssetUrl(href) : null;
    const normalizedSrcSet = srcSet ? normalizeSrcSet(srcSet) : null;

    if (src && normalizedSrc && normalizedSrc !== src) {
      element.setAttribute("src", normalizedSrc);
    }

    if (href && normalizedHref && normalizedHref !== href) {
      element.setAttribute("href", normalizedHref);
    }

    if (srcSet && normalizedSrcSet && normalizedSrcSet !== srcSet) {
      element.setAttribute("srcset", normalizedSrcSet);
    }
  }
}

function normalizeDocumentAssets(root: ParentNode = document) {
  for (const element of root.querySelectorAll("[src], [href], [srcset]")) {
    normalizeElementAssets(element);
  }
}

async function appendExecutableScript(target: HTMLElement, scriptTagHtml: string) {
  const template = document.createElement("template");
  template.innerHTML = scriptTagHtml.trim();
  const parsedScript = template.content.firstElementChild;

  if (!(parsedScript instanceof HTMLScriptElement)) {
    return;
  }

  const script = document.createElement("script");
  script.dataset.liveMirrorScript = "true";
  const isAsyncScript = parsedScript.hasAttribute("async");
  const isDeferredScript = parsedScript.hasAttribute("defer");

  for (const attribute of parsedScript.attributes) {
    const value =
      attribute.name === "src" ? normalizeAssetUrl(attribute.value) : attribute.value;
    script.setAttribute(attribute.name, value);
  }

  // Dynamically appended scripts default to async execution, which breaks the
  // live GoDaddy runtime ordering. Force classic scripts to execute in-order
  // unless the live tag explicitly opted into async behavior.
  script.async = isAsyncScript;
  script.defer = isDeferredScript;

  if (parsedScript.textContent) {
    script.textContent = parsedScript.textContent;
  }

  const completion = new Promise<void>((resolve) => {
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => resolve(), { once: true });
  });

  target.appendChild(script);

  if (script.src && !isAsyncScript) {
    await completion;
  } else {
    await Promise.resolve();
  }
}

export function MirrorScriptLoader({
  bodyScripts,
  headScripts,
}: MirrorScriptLoaderProps) {
  useEffect(() => {
    let cancelled = false;

    document.querySelectorAll('script[data-live-mirror-script="true"]').forEach((element) => {
      element.remove();
    });

    normalizeDocumentAssets();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          normalizeElementAssets(mutation.target);
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            normalizeElementAssets(node);
            normalizeDocumentAssets(node);
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      attributeFilter: ["href", "src", "srcset"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    const run = async () => {
      for (const scriptTag of headScripts) {
        if (cancelled) {
          return;
        }

        await appendExecutableScript(document.head, scriptTag);
        normalizeDocumentAssets();
      }

      for (const scriptTag of bodyScripts) {
        if (cancelled) {
          return;
        }

        await appendExecutableScript(document.body, scriptTag);
        normalizeDocumentAssets();
      }
    };

    void run();

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [bodyScripts, headScripts]);

  return null;
}
