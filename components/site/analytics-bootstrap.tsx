const DEFAULT_GA_MEASUREMENT_ID = "G-LKJFEYVM1Q";
const DEFAULT_META_PIXEL_ID = "356932321507746";
const META_PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

function getMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_MEASUREMENT_ID;
}

function getMetaPixelId() {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || DEFAULT_META_PIXEL_ID;
}

function getMetaPixelCode(pixelId: string) {
  return `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    ${JSON.stringify(META_PIXEL_SCRIPT_SRC)});

    fbq('init', ${JSON.stringify(pixelId)});
    fbq('track', 'PageView');
  `.trim();
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
          dangerouslySetInnerHTML={{ __html: getMetaPixelCode(pixelId) }}
        />
      ) : null}
    </>
  );
}
