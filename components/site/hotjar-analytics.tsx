"use client";

import Script from "next/script";

const DEFAULT_HOTJAR_SITE_ID = "6703871";
const DEFAULT_HOTJAR_VERSION = "6";

function getHotjarSiteId() {
  return process.env.NEXT_PUBLIC_HOTJAR_SITE_ID?.trim() || DEFAULT_HOTJAR_SITE_ID;
}

function getHotjarVersion() {
  return process.env.NEXT_PUBLIC_HOTJAR_VERSION?.trim() || DEFAULT_HOTJAR_VERSION;
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
