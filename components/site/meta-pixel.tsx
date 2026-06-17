"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

const DEFAULT_META_PIXEL_ID = "356932321507746";
const META_PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

function getMetaPixelId() {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || DEFAULT_META_PIXEL_ID;
}

type FbqCommand =
  | ["init", string, Record<string, unknown>?]
  | ["track", string, Record<string, unknown>?]
  | ["trackCustom", string, Record<string, unknown>?];

declare global {
  interface Window {
    _fbq?: unknown;
    fbq?: (...args: FbqCommand) => void;
  }
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

function MetaPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasSkippedInitialPageView = useRef(false);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    // The bootstrap sends the first PageView. Only send on client navigation.
    if (!hasSkippedInitialPageView.current) {
      hasSkippedInitialPageView.current = true;
      return;
    }

    if (typeof window.fbq !== "function") {
      return;
    }

    window.fbq("track", "PageView");
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel() {
  const pixelId = getMetaPixelId();

  if (!pixelId) {
    return null;
  }

  return (
    <>
      <Script id="rda-meta-pixel" strategy="afterInteractive" type="text/javascript">
        {getMetaPixelCode(pixelId)}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          height="1"
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
          style={{ display: "none" }}
          width="1"
        />
      </noscript>
      <Suspense fallback={null}>
        <MetaPageViewTracker />
      </Suspense>
    </>
  );
}
