import { writeFile } from "node:fs/promises";

import { chromium } from "playwright";

import {
  ASSET_MAP_PATH,
  LIVE_ORIGIN,
  MANIFEST_PATH,
  PUBLIC_ASSET_ROOT,
  buildLocalAssetPath,
  ensureParent,
  injectRuntimeBootstrap,
  isTelemetryUrl,
  loadManifest,
  normalizeExternalUrl,
  readJson,
  preservePdfPreviewMetadata,
  rewriteAssetReferences,
  rewriteInternalLinks,
  saveAssetMap,
  saveManifest,
  shouldLocalizeAssetUrl,
  stripCommerceEmbeds,
  stripServiceWorkerRegistration,
  stripTelemetryScripts,
  writeBinaryFile,
} from "./live-clone-shared.mjs";

const fetchHeaders = {
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
};

function collectAssetCandidates(html) {
  const matches = html.match(/(?:https?:)?\/\/[^\s"'()<>]+/g) ?? [];
  return matches
    .map((value) => normalizeExternalUrl(value))
    .filter(Boolean);
}

async function downloadAsset(url) {
  const response = await fetch(url, {
    headers: fetchHeaders,
  });

  if (!response.ok) {
    throw new Error(`Unable to download asset ${url}: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const localPath = buildLocalAssetPath(url, contentType);
  const assetBuffer = Buffer.from(await response.arrayBuffer());

  await writeBinaryFile(`${PUBLIC_ASSET_ROOT}${localPath.replace("/__live", "")}`, assetBuffer);

  return {
    contentType,
    localPath,
  };
}

async function settlePage(page) {
  await page.waitForLoadState("load").catch(() => undefined);

  await page
    .waitForFunction(
      () => (document.body?.innerText || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().length > 0,
      undefined,
      { timeout: 12_000 },
    )
    .catch(() => undefined);

  await page
    .waitForFunction(
      () => {
        const inViewportPlaceholder = Array.from(document.images).some((image) => {
          const rect = image.getBoundingClientRect();
          const src = image.currentSrc || image.getAttribute("src") || "";
          const inViewport =
            rect.bottom > window.innerHeight * -0.1 && rect.top < window.innerHeight * 1.05;
          return (
            inViewport &&
            (/^data:image\/gif;base64/i.test(src) || /transparent_placeholder/i.test(src))
          );
        });

        return !inViewportPlaceholder;
      },
      undefined,
      { timeout: 8_000 },
    )
    .catch(() => undefined);

  await page
    .waitForFunction(
      () => {
        const canvases = Array.from(
          document.querySelectorAll<HTMLCanvasElement>('canvas[data-aid="PDF_PREVIEW_RENDERED"]'),
        );

        return (
          canvases.length === 0 ||
          canvases.every((canvas) => canvas.getBoundingClientRect().width <= Math.min(window.innerWidth, 500))
        );
      },
      undefined,
      { timeout: 6_000 },
    )
    .catch(() => undefined);

  await page.waitForTimeout(3_000);
}

function replaceFrozenPdfPreview(html, frozenPreview) {
  if (!frozenPreview) {
    return html;
  }

  const widthAttribute = frozenPreview.width ? ` width="${frozenPreview.width}"` : "";
  const heightAttribute = frozenPreview.height ? ` height="${frozenPreview.height}"` : "";

  return html.replace(
    /<canvas\b([^>]*data-aid="PDF_PREVIEW_RENDERED"[^>]*)>\s*<\/canvas>/i,
    `<img data-aid="PDF_PREVIEW_RENDERED" src="${frozenPreview.localPath}"${widthAttribute}${heightAttribute} style="display:block;width:100%;height:auto">`,
  );
}

async function main() {
  const manifest = await loadManifest();
  const htmlByRouteId = new Map();
  const assetCandidates = new Set();
  const skippedAssets = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

  const recordAsset = (candidate) => {
    const normalized = normalizeExternalUrl(candidate);

    if (!normalized || isTelemetryUrl(normalized) || !shouldLocalizeAssetUrl(normalized)) {
      return;
    }

    assetCandidates.add(normalized);
  };

  page.on("response", (response) => {
    recordAsset(response.url());
  });

  try {
    for (const route of manifest.routes) {
      const response = await page.goto(`${LIVE_ORIGIN}${route.sourcePath}`, {
        timeout: 120_000,
        waitUntil: "domcontentloaded",
      });

      await settlePage(page);

      let frozenPdfPreview = null;
      const pdfPreviewCanvas = page.locator('canvas[data-aid="PDF_PREVIEW_RENDERED"]').first();

      if ((await pdfPreviewCanvas.count()) > 0) {
        await page.evaluate(() => {
          for (const banner of document.querySelectorAll('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]')) {
            banner.dataset.capturePrevVisibility = banner.style.visibility || "";
            banner.dataset.capturePrevPointerEvents = banner.style.pointerEvents || "";
            banner.style.visibility = "hidden";
            banner.style.pointerEvents = "none";
          }
        });

        const previewBuffer = await pdfPreviewCanvas.screenshot({ animations: "disabled" });

        await page.evaluate(() => {
          for (const banner of document.querySelectorAll('[data-aid="FOOTER_COOKIE_BANNER_RENDERED"]')) {
            banner.style.visibility = banner.dataset.capturePrevVisibility || "";
            banner.style.pointerEvents = banner.dataset.capturePrevPointerEvents || "";
            delete banner.dataset.capturePrevVisibility;
            delete banner.dataset.capturePrevPointerEvents;
          }
        });

        const previewMetadata = await pdfPreviewCanvas.evaluate((canvas) => ({
          height: canvas.getAttribute("height") || "",
          overlayHref:
            canvas.parentElement?.querySelector('a[data-aid="PDF_LINK_OVERLAY"]')?.getAttribute("href") || "",
          width: canvas.getAttribute("width") || "",
        }));
        const previewLocalPath = `/__live/frozen/pdf-previews/${route.id}.png`;

        await writeBinaryFile(
          `${PUBLIC_ASSET_ROOT}${previewLocalPath.replace("/__live", "")}`,
          previewBuffer,
        );

        frozenPdfPreview = {
          ...previewMetadata,
          localPath: previewLocalPath,
        };
      }

      const html = replaceFrozenPdfPreview(
        `<!DOCTYPE html>${await page.evaluate(() => document.documentElement.outerHTML)}`,
        frozenPdfPreview,
      );
      const title = await page.title();

      htmlByRouteId.set(route.id, {
        frozenPdfPreview,
        html,
        status: response?.status() ?? route.status,
        title: title || route.title,
      });

      for (const candidate of collectAssetCandidates(html)) {
        recordAsset(candidate);
      }
    }
  } finally {
    await browser.close();
  }

  const assetMap = {};

  for (const candidate of [...assetCandidates].sort()) {
    try {
      const asset = await downloadAsset(candidate);
      assetMap[candidate] = asset.localPath;
    } catch (error) {
      skippedAssets.push({
        error: error instanceof Error ? error.message : String(error),
        url: candidate,
      });
    }
  }

  for (const route of manifest.routes) {
    const payload = htmlByRouteId.get(route.id);

    if (!payload) {
      continue;
    }

    const rewrittenHtml = rewriteAssetReferences(
      rewriteInternalLinks(
        preservePdfPreviewMetadata(
          stripCommerceEmbeds(stripTelemetryScripts(stripServiceWorkerRegistration(payload.html))),
        ),
      ),
      assetMap,
    );
    const runtimeHtml = injectRuntimeBootstrap(
      rewrittenHtml,
      assetMap,
      payload.frozenPdfPreview ? [payload.frozenPdfPreview] : [],
    );

    await ensureParent(route.htmlPath);
    await writeFile(route.htmlPath, runtimeHtml, "utf8");
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.routes = manifest.routes.map((route) => {
    const payload = htmlByRouteId.get(route.id);

    if (!payload) {
      return route;
    }

    return {
      ...route,
      status: payload.status,
      title: payload.title,
    };
  });

  await saveAssetMap(assetMap);
  await saveManifest(manifest);

  console.log(`Updated ${MANIFEST_PATH}`);
  console.log(`Updated ${ASSET_MAP_PATH}`);
  console.log(`Downloaded ${Object.keys(assetMap).length} assets`);

  if (skippedAssets.length > 0) {
    console.warn(`Skipped ${skippedAssets.length} assets during capture`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
