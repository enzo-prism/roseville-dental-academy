"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  buildAttributionReceipt,
  getLeadAttributionFormFields,
  getLeadAttributionStamp,
  resolveLeadAttribution,
  type LeadAttribution,
} from "@/lib/lead-attribution";

export {
  AD_CLICK_ID_FIELDS,
  getLeadAttributionStamp,
  UTM_FIELDS,
} from "@/lib/lead-attribution";
export type { AdClickIdField, LeadAttribution, UtmField } from "@/lib/lead-attribution";

export const LEAD_FORM_SUCCESS_EVENT = "rda:lead-form-success";

export type LeadFormSuccessDetail = {
  leadEventId: string;
  submissionId: string;
};

const subscribeNever = () => () => {};
const getServerString = () => "";
export function useLeadAttribution(): LeadAttribution {
  const source = useSyncExternalStore(
    subscribeNever,
    () =>
      JSON.stringify({
        currentOrigin: window.location.origin,
        pagePath: window.location.pathname,
        referrer: document.referrer,
        search: window.location.search,
      }),
    getServerString,
  );
  const input = useMemo(() => {
    if (!source) {
      return null;
    }

    return {
      ...(JSON.parse(source) as {
        currentOrigin: string;
        pagePath: string;
        referrer: string;
        search: string;
      }),
      capturedAt: new Date().toISOString(),
    };
  }, [source]);
  const attribution = useMemo(
    () => resolveLeadAttribution(input ?? undefined, false),
    [input],
  );

  useEffect(() => {
    if (!input) {
      return;
    }

    resolveLeadAttribution({ ...input, anonymousId: attribution.anonymousId });
  }, [attribution.anonymousId, input]);

  return attribution;
}

export type LeadFormStatus = "idle" | "submitting" | "success" | "error";

function getFormspreeFormId(action: string) {
  try {
    return new URL(action, window.location.href).pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return "";
  }
}

function sendAttributionReceipt(
  form: HTMLFormElement,
  formData: FormData,
  attribution: LeadAttribution,
  leadEventId: string,
  receiptToken: string,
) {
  const formId = getFormspreeFormId(form.action);

  if (!formId || !receiptToken) {
    return;
  }

  const formKeyValue = formData.get("form_key");
  const receipt = buildAttributionReceipt(attribution, {
    acceptedAt: new Date().toISOString(),
    formId,
    formKey: typeof formKeyValue === "string" ? formKeyValue : "",
    leadEventId,
  });

  try {
    void fetch("/api/attribution/receipt", {
      body: JSON.stringify(receipt),
      headers: { "Content-Type": "application/json", "X-RDA-Receipt-Token": receiptToken },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined);
  } catch {
    // Formspree already accepted the lead; observability must never change the UI result.
  }
}

async function requestAttributionReceiptToken(form: HTMLFormElement, leadEventId: string) {
  const formId = getFormspreeFormId(form.action);
  if (!formId) return "";
  try {
    const response = await fetch("/api/attribution/receipt-token", {
      body: JSON.stringify({ formId, leadEventId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) return "";
    const payload = await response.json() as { token?: unknown };
    return typeof payload.token === "string" ? payload.token : "";
  } catch {
    return "";
  }
}

export function useLeadFormSubmit() {
  const [status, setStatus] = useState<LeadFormStatus>("idle");
  const isSubmitting = useRef(false);

  async function submitLeadForm(form: HTMLFormElement) {
    if (isSubmitting.current) {
      return;
    }

    isSubmitting.current = true;
    setStatus("submitting");

    try {
      const leadEventId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const attribution = resolveLeadAttribution();
      const stamp = getLeadAttributionStamp(attribution);
      const formData = new FormData(form);
      const receiptTokenPromise = requestAttributionReceiptToken(form, leadEventId);

      // This browser event ID joins browser/server measurement only. Formspree's
      // immutable submission ID is assigned by Formspree and remains the canonical
      // lead identity during the authenticated reconciliation.
      formData.set("lead_event_id", leadEventId);

      for (const [field, value] of Object.entries(getLeadAttributionFormFields(attribution))) {
        if (value) {
          formData.set(field, value);
        }
      }

      if (!String(formData.get("landing_page") || "").trim() && stamp.landing_page) {
        formData.set("landing_page", stamp.landing_page);
      }

      if (!String(formData.get("campaign_intent") || "").trim() && stamp.campaign_intent) {
        formData.set("campaign_intent", stamp.campaign_intent);
      }

      const response = await fetch(form.action, {
        body: formData,
        headers: { Accept: "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Lead form endpoint responded with ${response.status}`);
      }

      void receiptTokenPromise.then((token) => {
        sendAttributionReceipt(form, formData, attribution, leadEventId, token);
      }).catch(() => undefined);

      form.dispatchEvent(
        new CustomEvent<LeadFormSuccessDetail>(LEAD_FORM_SUCCESS_EVENT, {
          bubbles: true,
          detail: { leadEventId, submissionId: leadEventId },
        }),
      );
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      isSubmitting.current = false;
    }
  }

  function resetLeadForm() {
    isSubmitting.current = false;
    setStatus("idle");
  }

  return { resetLeadForm, status, submitLeadForm };
}
