import { getMetaPixelBootstrapCode, getMetaPixelId } from "@/lib/meta-pixel-config";

const DEFAULT_GA_MEASUREMENT_ID = "G-LKJFEYVM1Q";

function getMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_MEASUREMENT_ID;
}

export function AnalyticsBootstrap() {
  const measurementId = getMeasurementId();
  const pixelId = getMetaPixelId();

  return (
    <>
      {measurementId ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} />
          <script
            id="rda-google-analytics"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                window.gtag = window.gtag || function(){dataLayer.push(arguments);};
                window.gtag('js', new Date());
                window.gtag('config', '${measurementId}', {
                  page_location: window.location.origin + window.location.pathname + window.location.search,
                  page_path: window.location.pathname + window.location.search
                });
              `,
            }}
          />
        </>
      ) : null}
      {pixelId ? (
        <script
          id="rda-meta-pixel"
          dangerouslySetInnerHTML={{ __html: getMetaPixelBootstrapCode(pixelId) }}
        />
      ) : null}
    </>
  );
}
