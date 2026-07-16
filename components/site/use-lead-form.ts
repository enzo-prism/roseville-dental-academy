"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export const AD_CLICK_ID_FIELDS = [
  "dclid",
  "fbclid",
  "gbraid",
  "gclid",
  "msclkid",
  "ttclid",
  "wbraid",
] as const;
export const LEAD_FORM_SUCCESS_EVENT = "rda:lead-form-success";

export type UtmField = (typeof UTM_FIELDS)[number];
export type AdClickIdField = (typeof AD_CLICK_ID_FIELDS)[number];

export type LeadAttribution = {
  clickIds: Record<AdClickIdField, string>;
  referrer: string;
  utm: Record<UtmField, string>;
};

export type LeadFormSuccessDetail = {
  submissionId: string;
};

const EMPTY_UTM = Object.fromEntries(
  UTM_FIELDS.map((field) => [field, ""]),
) as Record<UtmField, string>;
const EMPTY_CLICK_IDS = Object.fromEntries(
  AD_CLICK_ID_FIELDS.map((field) => [field, ""]),
) as Record<AdClickIdField, string>;
const ATTRIBUTION_STORAGE_KEY = "rda_lead_attribution_v1";
const ATTRIBUTION_UPDATED_EVENT = "rda:lead-attribution-updated";
const MAX_ATTRIBUTION_VALUE_LENGTH = 512;

const subscribeNever = () => () => {};
const getServerString = () => "";
const subscribeAttribution = (onStoreChange: () => void) => {
  window.addEventListener(ATTRIBUTION_UPDATED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(ATTRIBUTION_UPDATED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};
const getStoredAttributionSnapshot = () => {
  try {
    return window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

function storeAttribution(value: string) {
  try {
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function compactAttributionValue(value: string | null | undefined) {
  return value?.trim().slice(0, MAX_ATTRIBUTION_VALUE_LENGTH) ?? "";
}

function sanitizeReferrer(value: string, currentOrigin: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.origin === currentOrigin) {
      return "";
    }

    return `${url.origin}${url.pathname}`.slice(0, 2_048);
  } catch {
    return value.split(/[?#]/, 1)[0]?.slice(0, 2_048) ?? "";
  }
}

function parseAttribution(search: string, referrer: string, currentOrigin: string): LeadAttribution {
  const params = new URLSearchParams(search);
  const utm = { ...EMPTY_UTM };
  const clickIds = { ...EMPTY_CLICK_IDS };

  for (const field of UTM_FIELDS) {
    utm[field] = compactAttributionValue(params.get(field));
  }

  for (const field of AD_CLICK_ID_FIELDS) {
    clickIds[field] = compactAttributionValue(params.get(field));
  }

  return {
    clickIds,
    referrer: sanitizeReferrer(referrer, currentOrigin),
    utm,
  };
}

function mergeAttribution(current: LeadAttribution, stored: LeadAttribution): LeadAttribution {
  const hasCurrentCampaign =
    Object.values(current.utm).some(Boolean) || Object.values(current.clickIds).some(Boolean);

  if (hasCurrentCampaign) {
    return {
      clickIds: { ...current.clickIds },
      referrer: current.referrer || stored.referrer,
      utm: { ...current.utm },
    };
  }

  return {
    clickIds: { ...stored.clickIds },
    referrer: current.referrer || stored.referrer,
    utm: { ...stored.utm },
  };
}

function hasAttribution(attribution: LeadAttribution) {
  return Boolean(
    attribution.referrer ||
      Object.values(attribution.utm).some(Boolean) ||
      Object.values(attribution.clickIds).some(Boolean),
  );
}

function parseStoredAttribution(raw: string): LeadAttribution {
  try {
    if (!raw) {
      return { clickIds: { ...EMPTY_CLICK_IDS }, referrer: "", utm: { ...EMPTY_UTM } };
    }

    const parsed = JSON.parse(raw) as Partial<LeadAttribution>;
    const utm = Object.fromEntries(
      UTM_FIELDS.map((field) => [field, compactAttributionValue(parsed.utm?.[field])]),
    ) as Record<UtmField, string>;
    const clickIds = Object.fromEntries(
      AD_CLICK_ID_FIELDS.map((field) => [
        field,
        compactAttributionValue(parsed.clickIds?.[field]),
      ]),
    ) as Record<AdClickIdField, string>;

    return {
      clickIds,
      referrer: compactAttributionValue(parsed.referrer),
      utm,
    };
  } catch {
    return { clickIds: { ...EMPTY_CLICK_IDS }, referrer: "", utm: { ...EMPTY_UTM } };
  }
}

export function useLeadAttribution(): LeadAttribution {
  const source = useSyncExternalStore(
    subscribeNever,
    () => JSON.stringify({
      currentOrigin: window.location.origin,
      referrer: document.referrer,
      search: window.location.search,
    }),
    getServerString,
  );
  const storedSource = useSyncExternalStore(
    subscribeAttribution,
    getStoredAttributionSnapshot,
    getServerString,
  );

  const currentAttribution = useMemo(() => {
    if (!source) {
      return { clickIds: { ...EMPTY_CLICK_IDS }, referrer: "", utm: { ...EMPTY_UTM } };
    }

    const parsed = JSON.parse(source) as {
      currentOrigin: string;
      referrer: string;
      search: string;
    };

    return parseAttribution(parsed.search, parsed.referrer, parsed.currentOrigin);
  }, [source]);
  const storedAttribution = useMemo(
    () => parseStoredAttribution(storedSource),
    [storedSource],
  );

  useEffect(() => {
    const merged = mergeAttribution(currentAttribution, storedAttribution);
    const serialized = JSON.stringify(merged);

    if (hasAttribution(merged) && serialized !== storedSource) {
      if (storeAttribution(serialized)) {
        window.dispatchEvent(new Event(ATTRIBUTION_UPDATED_EVENT));
      }
    }
  }, [currentAttribution, storedAttribution, storedSource]);

  return useMemo(
    () => mergeAttribution(currentAttribution, storedAttribution),
    [currentAttribution, storedAttribution],
  );
}

export type LeadFormStatus = "idle" | "submitting" | "success" | "error";

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
      const submissionId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const formData = new FormData(form);

      formData.set("submission_id", submissionId);

      const response = await fetch(form.action, {
        body: formData,
        headers: { Accept: "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Lead form endpoint responded with ${response.status}`);
      }

      form.dispatchEvent(
        new CustomEvent<LeadFormSuccessDetail>(LEAD_FORM_SUCCESS_EVENT, {
          bubbles: true,
          detail: { submissionId },
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
