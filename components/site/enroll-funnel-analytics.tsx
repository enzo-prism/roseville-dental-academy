"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { studentCheckoutCourse } from "@/lib/student-course-catalog";
import { enrollFunnelParams, enrollOrderItems, type EnrollFunnelEvent } from "@/lib/enroll-funnel-events";
import { getMeasurementId } from "@/lib/ga-config";
import { metaMeasurementAllowed } from "@/lib/meta-pixel-config";

const EnrollAnalyticsContext = createContext(false);

export function EnrollFunnelAnalytics({ children }: { children: ReactNode }) {
  return <EnrollAnalyticsContext.Provider value>{children}</EnrollAnalyticsContext.Provider>;
}

function enrollPageContext(courseId: unknown) {
  const course = studentCheckoutCourse(courseId);
  const path = window.location.pathname + (course ? `?course=${course.id}` : "");
  return { page_location: window.location.origin + path, page_path: path, page_referrer: "" };
}

export function trackEnrollFunnel(event: EnrollFunnelEvent, input: Record<string, unknown>) {
  if (!metaMeasurementAllowed() || !window.gtag) return;
  const params = enrollFunnelParams(input);
  const id = input.transaction_id;
  const purchaseId = event === "purchase" && typeof id === "string" && /^[a-f0-9]{64}$/.test(id) ? id : undefined;
  if (event === "purchase" && !purchaseId) return;
  if (purchaseId) {
    try {
      if (window.sessionStorage.getItem(`rda:purchase:${purchaseId}`)) return;
    } catch { /* GA4 can still deduplicate by transaction_id when storage is unavailable. */ }
  }
  window.gtag("event", event, {
    ...params,
    ...(purchaseId ? { transaction_id: purchaseId } : {}),
    ...enrollPageContext(params.course_id),
    ...((event === "begin_checkout" || event === "purchase") ? { items: enrollOrderItems(params) } : {}),
  });
  if (purchaseId) {
    try {
      window.sessionStorage.setItem(`rda:purchase:${purchaseId}`, "1");
    } catch { /* The event still carries its stable GA4 transaction_id. */ }
  }
}

export function EnrollFunnelPage({
  courseId, cancelled, purchase,
}: {
  courseId?: string;
  cancelled?: boolean;
  purchase?: Record<string, unknown>;
}) {
  const enabled = useContext(EnrollAnalyticsContext);
  const seen = useRef(false);
  useEffect(() => {
    if (!enabled || seen.current || !metaMeasurementAllowed()) return;
    seen.current = true;
    if (!window.gtag) {
      const measurementId = getMeasurementId();
      window.dataLayer = window.dataLayer ?? [];
      // GA4 expects the command as an Arguments object.
      // eslint-disable-next-line prefer-rest-params
      window.gtag = function () { window.dataLayer?.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", measurementId, { ...enrollPageContext(courseId), allow_google_signals: false });
      const script = document.createElement("script");
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.append(script);
    }
    if (window.location.pathname === "/enroll") trackEnrollFunnel("enroll_view", { course_id: courseId });
    if (cancelled) trackEnrollFunnel("checkout_cancelled", { course_id: courseId });
    if (purchase) trackEnrollFunnel("purchase", purchase);
  }, [enabled, courseId, cancelled, purchase]);
  return null;
}
