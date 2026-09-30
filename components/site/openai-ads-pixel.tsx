"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LEAD_FORM_SUCCESS_EVENT, type LeadFormSuccessDetail } from "@/components/site/use-lead-form";
import { OPENAI_CONSENT_EVENT, OPENAI_CONSENT_KEY, measurementEnabled,
  measurementAllowed, resetMemoryChoice, measurementClickReference, eligibleSnapshotReference, measurementSnapshotAllowed, currentMeasurementConsentEpoch, UUID_V4 } from "@/lib/openai-measurement";

type Bucket = {
  reference: string;
  channel: string;
  frame?: HTMLIFrameElement;
  ready: boolean;
  attempts: number;
  loadTimer?: number;
  retryTimer?: number;
  pending: Set<string>;
};
const MAX_ATTEMPTS = 3;

/** Vendor code never runs in the document containing student forms. */
export function OpenAIAdsPixel() {
  const pathname = usePathname();
  useEffect(() => {
    measurementClickReference();
    window.dispatchEvent(new Event(OPENAI_CONSENT_EVENT));
  }, [pathname]);

  // Owned by the root layout for the full document lifetime. Each accepted
  // request retains its eligible reference while the isolated SDK is loading.
  useEffect(() => {
    if (!measurementEnabled()) return;
    const pixelId = process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID!.trim();
    const buckets = new Map<string, Bucket>();
    const seen = new Set<string>();
    let disposed = false;
    let activeEpoch = currentMeasurementConsentEpoch();
    function discardBuckets() {
      for (const bucket of buckets.values()) { removeFrame(bucket); bucket.pending.clear(); }
      buckets.clear();
    }
    function allowed() {
      const permitted = !disposed && measurementAllowed();
      const epoch = currentMeasurementConsentEpoch();
      if (!permitted || epoch !== activeEpoch) discardBuckets();
      activeEpoch = epoch;
      return permitted;
    }
    function removeFrame(bucket: Bucket) {
      window.clearTimeout(bucket.loadTimer);
      window.clearTimeout(bucket.retryTimer);
      bucket.frame?.remove();
      bucket.frame = undefined;
      bucket.ready = false;
    }
    function flush(bucket: Bucket) {
      if (!allowed() || !bucket.ready || !bucket.frame?.contentWindow) return;
      for (const eventId of bucket.pending) {
        bucket.frame.contentWindow.postMessage({ type: "rda:openai-lead", channel: bucket.channel, eventId }, "*");
      }
    }
    function recover(bucket: Bucket) {
      removeFrame(bucket);
      if (allowed() && bucket.attempts < MAX_ATTEMPTS) {
        bucket.retryTimer = window.setTimeout(() => initialize(bucket), bucket.attempts * 1000);
      }
    }
    function initialize(bucket: Bucket) {
      if (!allowed() || bucket.frame || bucket.attempts >= MAX_ATTEMPTS) return;
      bucket.attempts++;
      bucket.channel = crypto.randomUUID();
      const url = new URL("/measurement/openai.html", window.location.origin);
      url.searchParams.set("pixel_id", pixelId);
      url.searchParams.set("channel", bucket.channel);
      if (bucket.reference) url.searchParams.set("oppref", bucket.reference);
      const frame = document.createElement("iframe");
      frame.id = buckets.size === 1 ? "openai-ads-measurement-frame" : `openai-ads-measurement-${bucket.channel}`;
      frame.dataset.rdaOpenaiMeasurement = "true";
      frame.title = "Campaign measurement";
      frame.hidden = true;
      frame.setAttribute("aria-hidden", "true");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.referrerPolicy = "no-referrer";
      frame.src = url.toString();
      frame.onerror = () => recover(bucket);
      bucket.frame = frame;
      document.body.appendChild(frame);
      bucket.loadTimer = window.setTimeout(() => recover(bucket), 35000);
    }
    function bucketFor(reference: string) {
      let bucket = buckets.get(reference);
      if (!bucket) {
        bucket = { reference, channel: "", ready: false, attempts: 0, pending: new Set() };
        buckets.set(reference, bucket);
      }
      return bucket;
    }
    function syncConsent() {
      if (allowed()) initialize(bucketFor(measurementClickReference()));
      else {
        discardBuckets(); // Withdrawal must never replay accepted requests.
      }
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === OPENAI_CONSENT_KEY) {
        // A queued denial notification still revokes old work if another tab has
        // already re-granted by the time its storage event is handled.
        if (event.newValue !== "granted") discardBuckets();
        resetMemoryChoice(); syncConsent();
        window.dispatchEvent(new Event(OPENAI_CONSENT_EVENT));
      }
    };
    const handleMessage = (event: MessageEvent) => {
      if (!allowed() || event.origin !== "null" || !event.data) return;
      const bucket = [...buckets.values()].find(b => event.source === b.frame?.contentWindow && event.data.channel === b.channel);
      if (!bucket) return;
      if (event.data.type === "rda:openai-ready") {
        window.clearTimeout(bucket.loadTimer); bucket.ready = true; flush(bucket);
      } else if (event.data.type === "rda:openai-queued" && typeof event.data.eventId === "string") {
        bucket.pending.delete(event.data.eventId); // SDK queueing, not ingestion.
      } else if (event.data.type === "rda:openai-error") recover(bucket);
    };
    const handleLeadConfirmed = (event: Event) => {
      const detail = (event as CustomEvent<LeadFormSuccessDetail>).detail;
      const id = detail?.leadEventId;
      if (!allowed() || !measurementSnapshotAllowed(detail?.openAIAdsReference)
        || typeof id !== "string" || !UUID_V4.test(id) || seen.has(id)) return;
      seen.add(id);
      const bucket = bucketFor(eligibleSnapshotReference(detail.openAIAdsReference));
      bucket.pending.add(id);
      initialize(bucket); flush(bucket);
    };
    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(OPENAI_CONSENT_EVENT, syncConsent);
    document.addEventListener(LEAD_FORM_SUCCESS_EVENT, handleLeadConfirmed);
    window.addEventListener("focus", syncConsent);
    document.addEventListener("visibilitychange", syncConsent);
    syncConsent();
    return () => {
      disposed = true;
      for (const bucket of buckets.values()) removeFrame(bucket);
      buckets.clear();
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(OPENAI_CONSENT_EVENT, syncConsent);
      document.removeEventListener(LEAD_FORM_SUCCESS_EVENT, handleLeadConfirmed);
      window.removeEventListener("focus", syncConsent);
      document.removeEventListener("visibilitychange", syncConsent);
    };
  }, []);
  return null;
}
