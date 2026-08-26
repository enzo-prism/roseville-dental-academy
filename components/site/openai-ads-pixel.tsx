"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  LEAD_FORM_SUCCESS_EVENT,
  type LeadFormSuccessDetail,
} from "@/components/site/use-lead-form";
import { getAttributionConsentState } from "@/lib/lead-attribution";

const DEFAULT_OPENAI_ADS_PIXEL_ID = "Ek4Sce2YRxrGHS3oL51Qac";
const OPENAI_ADS_PIXEL_SCRIPT_SRC = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
const OPENAI_ADS_PIXEL_SCRIPT_SELECTOR = "script[data-rda-openai-ads-pixel-sdk='true']";
const FALLBACK_PAGE_TITLE = "Roseville Dental Academy";
const MAX_PAGE_TITLE_LENGTH = 128;
const MAX_EVENT_ID_LENGTH = 128;

type OpenAIAdsContent = {
  content_type: "page";
  id: string;
  name: string;
};

type OpenAIAdsContentsData = {
  contents: OpenAIAdsContent[];
  type: "contents";
};

type OpenAIAdsCustomerActionData = {
  type: "customer_action";
};

type OpenAIAdsCommand =
  | ["consent", boolean]
  | ["init", { debug: boolean; pixelId: string }]
  | ["measure", "page_viewed", OpenAIAdsContentsData]
  | ["measure", "lead_created", OpenAIAdsCustomerActionData, { event_id: string }];

type OpenAIAdsQueue = ((...args: OpenAIAdsCommand) => void) & {
  q?: OpenAIAdsCommand[];
};

type OpenAIAdsRuntime = {
  consent: boolean | null;
  initializedPixelId: string;
  lastPagePath: string;
  scriptRequested: boolean;
  sentLeadEventIds: Set<string>;
};

declare global {
  interface Window {
    __rdaOpenAIAdsPixelRuntime?: OpenAIAdsRuntime;
    oaiq?: OpenAIAdsQueue;
  }
}

function getPixelId() {
  return (
    process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID?.trim() || DEFAULT_OPENAI_ADS_PIXEL_ID
  );
}

function getRuntime() {
  if (!window.__rdaOpenAIAdsPixelRuntime) {
    window.__rdaOpenAIAdsPixelRuntime = {
      consent: null,
      initializedPixelId: "",
      lastPagePath: "",
      scriptRequested: false,
      sentLeadEventIds: new Set<string>(),
    };
  }

  return window.__rdaOpenAIAdsPixelRuntime;
}

function ensureQueue() {
  if (typeof window.oaiq === "function") {
    return window.oaiq;
  }

  const queue = ((...args: OpenAIAdsCommand) => {
    queue.q?.push(args);
  }) as OpenAIAdsQueue;
  queue.q = [];
  window.oaiq = queue;

  return queue;
}

function requestSdk(runtime: OpenAIAdsRuntime) {
  if (runtime.scriptRequested || document.querySelector(OPENAI_ADS_PIXEL_SCRIPT_SELECTOR)) {
    runtime.scriptRequested = true;
    return;
  }

  runtime.scriptRequested = true;
  const script = document.createElement("script");
  script.async = true;
  script.dataset.rdaOpenaiAdsPixelSdk = "true";
  script.src = OPENAI_ADS_PIXEL_SCRIPT_SRC;
  document.head.appendChild(script);
}

function hasExplicitDeniedConsentCookie() {
  const deniedValues = new Set(["0", "denied", "false", "rejected"]);
  const consentCookieNames = new Set([
    "rda_analytics_consent",
    "rda_attribution_consent",
    "rda_cookie_consent",
  ]);

  return document.cookie.split(";").some((entry) => {
    const separator = entry.indexOf("=");
    const name = (separator >= 0 ? entry.slice(0, separator) : entry).trim();
    const rawValue = separator >= 0 ? entry.slice(separator + 1) : "";

    if (!consentCookieNames.has(name)) {
      return false;
    }

    let value = rawValue;
    try {
      value = decodeURIComponent(rawValue);
    } catch {
      // Compare the original cookie value when it is not valid URI data.
    }

    return deniedValues.has(value.trim().toLowerCase());
  });
}

function measurementAllowed() {
  return (
    getAttributionConsentState() !== "restricted" && !hasExplicitDeniedConsentCookie()
  );
}

function syncConsent(runtime: OpenAIAdsRuntime, queue: OpenAIAdsQueue) {
  const consent = measurementAllowed();

  if (runtime.consent !== consent) {
    queue("consent", consent);
    runtime.consent = consent;
  }

  return consent;
}

function initializePixel() {
  const pixelId = getPixelId();
  const runtime = getRuntime();
  const queue = ensureQueue();
  const consent = measurementAllowed();

  if (runtime.initializedPixelId !== pixelId) {
    // OpenAI requires consent to be set before init. Unknown consent is treated
    // as allowed; GPC, DNT, and explicit denied RDA cookies are restricted.
    queue("consent", consent);
    runtime.consent = consent;
    queue("init", {
      debug: process.env.NODE_ENV !== "production",
      pixelId,
    });
    runtime.initializedPixelId = pixelId;
  } else {
    syncConsent(runtime, queue);
  }

  requestSdk(runtime);

  return { queue, runtime };
}

function piiSafePath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      let decoded = segment;

      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Keep the encoded segment for the allow-list check below.
      }

      if (
        decoded.length > 64 ||
        decoded.includes("@") ||
        /\d{7,}/.test(decoded) ||
        !/^[a-z0-9-]+$/i.test(decoded)
      ) {
        return "redacted";
      }

      return decoded.toLowerCase();
    });

  return segments.length ? `/${segments.join("/")}` : "/";
}

function piiSafePageTitle(title: string) {
  const normalized = title.replace(/\s+/g, " ").trim();

  if (
    !normalized ||
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(normalized) ||
    /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/.test(normalized)
  ) {
    return FALLBACK_PAGE_TITLE;
  }

  return normalized.slice(0, MAX_PAGE_TITLE_LENGTH);
}

function validEventId(eventId: string) {
  const compact = eventId.trim().slice(0, MAX_EVENT_ID_LENGTH);
  return /^[a-z0-9][a-z0-9._:-]*$/i.test(compact) ? compact : "";
}

function trackPageViewed(pathname: string) {
  const { queue, runtime } = initializePixel();
  const path = piiSafePath(pathname);

  if (!syncConsent(runtime, queue) || runtime.lastPagePath === path) {
    return false;
  }

  // Record before queueing so React Strict Mode cannot double-send the event.
  runtime.lastPagePath = path;
  queue("measure", "page_viewed", {
    contents: [
      {
        content_type: "page",
        id: path,
        name: piiSafePageTitle(document.title),
      },
    ],
    type: "contents",
  });

  return true;
}

export function trackOpenAIAdsLeadCreated(eventId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const safeEventId = validEventId(eventId);

  if (!safeEventId) {
    return false;
  }

  const { queue, runtime } = initializePixel();

  if (!syncConsent(runtime, queue) || runtime.sentLeadEventIds.has(safeEventId)) {
    return false;
  }

  // The same non-PII lead event ID can later deduplicate a Conversions API event.
  runtime.sentLeadEventIds.add(safeEventId);
  queue(
    "measure",
    "lead_created",
    { type: "customer_action" },
    { event_id: safeEventId },
  );

  return true;
}

export function OpenAIAdsPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackPageViewed(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    function onLeadFormSuccess(event: Event) {
      const detail = (event as CustomEvent<LeadFormSuccessDetail>).detail;

      if (detail?.leadEventId) {
        trackOpenAIAdsLeadCreated(detail.leadEventId);
      }
    }

    document.addEventListener(LEAD_FORM_SUCCESS_EVENT, onLeadFormSuccess);
    return () => {
      document.removeEventListener(LEAD_FORM_SUCCESS_EVENT, onLeadFormSuccess);
    };
  }, []);

  return null;
}
