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
    return;
  }

  window.gtag("event", eventName, {
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
    ...params,
  });
}

function PageViewTracking({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasSkippedInitialPageView = useRef(false);

  useEffect(() => {
    if (!pathname || typeof window.gtag !== "function") {
      return;
    }

    // The base gtag config sends the initial page_view. Only send on client navigation.
    if (!hasSkippedInitialPageView.current) {
      hasSkippedInitialPageView.current = true;
      return;
    }

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("config", measurementId, {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [measurementId, pathname, searchParams]);

  return null;
}

function delegatedAnalyticsEvent(target: Element) {
  const link = target.closest<HTMLAnchorElement>("a[href]");

  if (link) {
    const href = link.getAttribute("href") || "";
    const label = link.textContent?.replace(/\s+/g, " ").trim() || link.getAttribute("aria-label") || "";
    const socialPlatform = link.getAttribute("data-rda-social-button");

    if (link.matches("[data-rda-home-hero-signup='true']")) {
      trackGaEvent("select_content", {
        content_type: "homepage_hero_cta",
        item_id: "quick_sign_up",
        link_url: href,
      });
      return;
    }

    if (link.matches("[data-rda-contact-us='true']")) {
      trackGaEvent("select_content", {
        content_type: "navigation_cta",
        item_id: "contact_us",
        link_url: href,
      });
      return;
    }

    if (socialPlatform) {
      trackGaEvent("social_click", {
        link_url: link.href,
        method: socialPlatform,
      });
      return;
    }

    if (href.startsWith("tel:")) {
      trackGaEvent("click_to_call", {
        link_text: label,
        link_url: href,
      });
      return;
    }

    if (href.startsWith("mailto:")) {
      trackGaEvent("email_click", {
        link_text: label,
        link_url: href,
      });
      return;
    }

    if (/google\.com\/maps|maps\.google\.com/i.test(link.href)) {
      trackGaEvent("get_directions", {
        link_text: label,
        link_url: link.href,
      });
      return;
    }

    if (link.hostname && link.hostname !== window.location.hostname) {
      trackGaEvent("click", {
        link_domain: link.hostname,
        link_text: label,
        link_url: link.href,
        outbound: true,
      });
    }
  }

  const button = target.closest<HTMLButtonElement>("button");

  if (button?.matches("[data-rda-contact-form-toggle='true']")) {
    trackGaEvent("select_content", {
      content_type: "contact_form_cta",
      item_id: "drop_us_a_line",
    });
    return;
  }

  if (button?.matches("[data-aid='FOOTER_COOKIE_CLOSE_RENDERED']")) {
    trackGaEvent("cookie_accept");
  }
}

function InteractionTracking() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.target instanceof Element) {
        delegatedAnalyticsEvent(event.target);
      }
    }

    function onSubmit(event: SubmitEvent) {
      if (!(event.target instanceof HTMLFormElement)) {
        return;
      }

      if (event.target.matches("[data-rda-signup-form='true']")) {
        if (!event.target.querySelector("input[name='Interested classes[]']:checked")) {
          return;
        }

        trackGaEvent("generate_lead", {
          form_id: "quick_sign_up",
          form_name: "Quick Sign Up",
        });
      } else if (event.target.matches("[data-rda-contact-form='true']")) {
        trackGaEvent("generate_lead", {
          form_id: "contact_form",
          form_name: "Contact Form",
        });
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

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
          gtag('config', '${measurementId}');
        `}
      </Script>
      <Suspense fallback={null}>
        <PageViewTracking measurementId={measurementId} />
      </Suspense>
      <InteractionTracking />
    </>
  );
}
