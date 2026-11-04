"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { measurementChoice, measurementEnabled, OPENAI_CONSENT_EVENT, OPENAI_CONSENT_KEY,
  setMeasurementChoice } from "@/lib/openai-measurement";
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === OPENAI_CONSENT_KEY) { listener(); }
  };
  window.addEventListener(OPENAI_CONSENT_EVENT, listener);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(OPENAI_CONSENT_EVENT, listener); window.removeEventListener("storage", storage); };
}
export function OpenAIMeasurementChoice() {
  const choice = useSyncExternalStore(subscribe, measurementChoice, () => "");
  const enabled = useSyncExternalStore(() => () => {}, measurementEnabled, () => false);
  const [editing, setEditing] = useState(false);
  if (!enabled) return null;
  return <section aria-label="Advertising measurement choice" className="border-t border-border bg-background px-6 py-6 text-sm text-foreground">
    <div className="mx-auto max-w-3xl">
      {choice && !editing ? <Button variant="link" onClick={() => setEditing(true)}>Advertising measurement settings</Button> : <>
        <p className="font-semibold">Optional advertising measurement</p>
        <p className="mt-2 text-muted-foreground">Allow OpenAI Ads to measure a completed course inquiry using a random event ID and an ad click identifier? The identifier is stored for up to 30 days. Your name, contact details, and form answers are not sent to OpenAI. You can change this choice here at any time.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => { setMeasurementChoice("granted"); setEditing(false); }}>Allow</Button>
          <Button variant="outline" onClick={() => { setMeasurementChoice("denied"); setEditing(false); }}>Decline</Button>
        </div>
      </>}
    </div>
  </section>;
}

/**
 * The same opt-in, placed inside a lead form so ad visitors see it before they
 * submit. It starts unticked, carries no form name (nothing reaches Formspree)
 * and hides once a choice was made elsewhere, unless it was made here.
 */
export function OpenAIMeasurementFormOptIn() {
  const choice = useSyncExternalStore(subscribe, measurementChoice, () => "");
  const enabled = useSyncExternalStore(() => () => {}, measurementEnabled, () => false);
  const [touched, setTouched] = useState(false);
  if (!enabled || (choice && !touched)) return null;
  return <label className="ac-check rda-ad-form-consent" data-rda-openai-optin="true">
    <input
      checked={choice === "granted"}
      onChange={(event) => { setTouched(true); setMeasurementChoice(event.currentTarget.checked ? "granted" : "denied"); }}
      type="checkbox"
    />
    <span aria-hidden="true" className="ac-check-box" />
    <span>Optional: allow OpenAI Ads to measure this inquiry using a random event ID and an ad click identifier, stored for up to 30 days. Your name, contact details, and form answers are not sent to OpenAI.</span>
  </label>;
}
