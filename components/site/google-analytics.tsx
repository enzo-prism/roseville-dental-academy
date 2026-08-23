"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

const DEFAULT_GA_MEASUREMENT_ID = "G-LKJFEYVM1Q";

function getMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_MEASUREMENT_ID;
}

type GtagCommand =
  | ["config", string, Record<string, unknown>?]
  | ["event", string, Record<string, unknown>?]
  | ["js", Date]
  | ["set", string, unknown];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagCommand) => void;
  }
}

export function trackGaEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return false;
  }

  window.gtag("event", eventName, {
    page_location: `${window.location.origin}${window.location.pathname}`,
    page_path: window.location.pathname,
    ...params,
  });

  return true;
}

function PageViewTracking({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasSkippedInitialPageView = useRef(false);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    // The base gtag config sends the initial page_view. Only send on client
    // navigation. Consume the skip flag before checking window.gtag — the
    // bootstrap script loads afterInteractive, so gtag is usually undefined on
    // the initial-load effect run.
    if (!hasSkippedInitialPageView.current) {
      hasSkippedInitialPageView.current = true;
      return;
    }

    if (typeof window.gtag !== "function") {
      return;
    }

    // Keep click IDs out of GA event parameters. UTMs are sent as the explicit,
    // allow-listed event fields defined by the analytics contract.
    void searchParams;

    window.gtag("config", measurementId, {
      page_location: `${window.location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title,
    });
  }, [measurementId, pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  const measurementId = getMeasurementId();

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="rda-google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_location: window.location.origin + window.location.pathname,
            page_path: window.location.pathname
          });
        `}
      </Script>
      <Suspense fallback={null}>
        <PageViewTracking measurementId={measurementId} />
      </Suspense>
    </>
  );
}
