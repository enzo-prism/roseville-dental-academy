"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { getAnalyticsPageLocation, getAnalyticsPagePath } from "@/lib/analytics-page-url";

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
    page_location: getAnalyticsPageLocation(),
    page_path: getAnalyticsPagePath(),
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
    // bootstrap script can still be undefined on the first effect run.
    if (!hasSkippedInitialPageView.current) {
      hasSkippedInitialPageView.current = true;
      return;
    }

    if (typeof window.gtag !== "function") {
      return;
    }

    const search = window.location.search || (searchParams.toString() ? `?${searchParams}` : "");

    window.gtag("config", measurementId, {
      page_location: getAnalyticsPageLocation(pathname, search),
      page_path: getAnalyticsPagePath(pathname, search),
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
    <Suspense fallback={null}>
      <PageViewTracking measurementId={measurementId} />
    </Suspense>
  );
}
