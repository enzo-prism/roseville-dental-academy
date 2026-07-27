"use client";

import Script from "next/script";

const DEFAULT_HOTJAR_SITE_ID = "6703871";
const DEFAULT_HOTJAR_VERSION = "6";

function numericEnvOrDefault(value: string | undefined, fallback: string) {
  // A malformed override would inject NaN into the inline snippet
  // (hjid:NaN, src .../hotjar-NaN.js); fall back to the default instead.
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? trimmed : fallback;
}

function getHotjarSiteId() {
  return numericEnvOrDefault(process.env.NEXT_PUBLIC_HOTJAR_SITE_ID, DEFAULT_HOTJAR_SITE_ID);
}

function getHotjarVersion() {
  return numericEnvOrDefault(process.env.NEXT_PUBLIC_HOTJAR_VERSION, DEFAULT_HOTJAR_VERSION);
}

export function HotjarAnalytics() {
  const hotjarSiteId = getHotjarSiteId();
  const hotjarVersion = getHotjarVersion();

  if (!hotjarSiteId) {
    return null;
  }

  return (
    <Script id="rda-hotjar-analytics" strategy="afterInteractive">
      {`
        (function(h,o,t,j,a,r){
          h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
          h._hjSettings={hjid:${Number(hotjarSiteId)},hjsv:${Number(hotjarVersion)}};
          a=o.getElementsByTagName('head')[0];
          r=o.createElement('script');r.async=1;
          r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
          a.appendChild(r);
        })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
      `}
    </Script>
  );
}
