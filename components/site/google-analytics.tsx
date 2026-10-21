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
  // URL covered by the last page_view. The base gtag config sends the initial
  // one, so record that URL first and only send when the URL really changes —
  // effect re-runs (React reconnecting a boundary, Strict Mode) never count twice.
  const lastTrackedUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const url = `${pathname}?${searchParams?.toString() ?? ""}`;

    // Record the initial URL before checking window.gtag — the bootstrap
    // script can still be undefined on the first effect run.
    if (lastTrackedUrl.current === null) {
      lastTrackedUrl.current = url;
      return;
    }

    if (lastTrackedUrl.current === url || typeof window.gtag !== "function") {
      return;
    }

    lastTrackedUrl.current = url;

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
