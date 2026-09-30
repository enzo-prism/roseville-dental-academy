"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { getMetaPixelId, metaMeasurementAllowed } from "@/lib/meta-pixel-config";

type FbqCommand =
  | ["consent", "revoke" | "grant"]
  | ["init", string, Record<string, unknown>?]
  | ["track", string, Record<string, unknown>?, MetaPixelEventOptions?]
  | ["trackCustom", string, Record<string, unknown>?];

type MetaPixelEventName = "Contact" | "Lead" | "PageView" | "ViewContent";
type MetaPixelProperties = Record<string, boolean | number | string | null | undefined>;
type MetaPixelEventOptions = { eventID?: string };

declare global {
  interface Window {
    _fbq?: unknown;
    fbq?: (...args: FbqCommand) => void;
  }
}

function compactMetaValue(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 255);
}

function safeMetaProperties(properties: MetaPixelProperties = {}) {
  const safeProperties = Object.fromEntries(
    Object.entries(properties)
      .filter((entry): entry is [string, Exclude<MetaPixelProperties[string], undefined>] => entry[1] !== undefined)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? compactMetaValue(value) : value,
      ]),
  );

  if (typeof window === "undefined") {
    return safeProperties;
  }

  return {
    ...safeProperties,
    // Attribution stays in explicit campaign fields. Contact events must not
    // inherit raw URL queries, which may contain click IDs or personal values.
    page_path: (typeof properties.page_path === "string" && properties.page_path
      ? properties.page_path
      : window.location.pathname).split(/[?#]/, 1)[0],
  };
}

export function trackMetaPixelEvent(
  eventName: MetaPixelEventName,
  properties: MetaPixelProperties = {},
  options: MetaPixelEventOptions = {},
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return false;
  }

  if (!metaMeasurementAllowed()) {
    window.fbq("consent", "revoke");
    return false;
  }

  const eventID = options.eventID ? compactMetaValue(options.eventID) : undefined;

  if (eventID) {
    window.fbq("track", eventName, safeMetaProperties(properties), { eventID });
  } else {
    window.fbq("track", eventName, safeMetaProperties(properties));
  }
  return true;
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

    trackMetaPixelEvent("PageView");
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
