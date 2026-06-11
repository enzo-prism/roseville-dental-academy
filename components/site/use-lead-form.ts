"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

export const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmField = (typeof UTM_FIELDS)[number];

export type LeadAttribution = {
  referrer: string;
  utm: Record<UtmField, string>;
};

const EMPTY_UTM = Object.fromEntries(
  UTM_FIELDS.map((field) => [field, ""]),
) as Record<UtmField, string>;

const subscribeNever = () => () => {};
const getServerString = () => "";

export function useLeadAttribution(): LeadAttribution {
  const referrer = useSyncExternalStore(
    subscribeNever,
    () => document.referrer,
    getServerString,
  );
  const search = useSyncExternalStore(
    subscribeNever,
    () => window.location.search,
    getServerString,
  );

  const utm = useMemo(() => {
    const params = new URLSearchParams(search);
    const values = { ...EMPTY_UTM };

    for (const field of UTM_FIELDS) {
      values[field] = params.get(field) ?? "";
    }

    return values;
  }, [search]);

  return useMemo(() => ({ referrer, utm }), [referrer, utm]);
}

export type LeadFormStatus = "idle" | "submitting" | "success" | "error";

export function useLeadFormSubmit() {
  const [status, setStatus] = useState<LeadFormStatus>("idle");

  async function submitLeadForm(form: HTMLFormElement) {
    setStatus("submitting");

    try {
      const response = await fetch(form.action, {
        body: new FormData(form),
        headers: { Accept: "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Lead form endpoint responded with ${response.status}`);
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  function resetLeadForm() {
    setStatus("idle");
  }

  return { resetLeadForm, status, submitLeadForm };
}
