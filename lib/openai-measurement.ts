import { getAttributionConsentState } from "./lead-attribution";

export const OPENAI_CONSENT_KEY = "rda_openai_measurement_consent_v1";
export const OPENAI_CONSENT_EVENT = "rda:openai-consent";
export const OPENAI_CLICK_KEY = "rda_openai_click_v1";
export const CLICK_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export type MeasurementChoice = "granted" | "denied" | "";
export const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
let memoryChoice: MeasurementChoice = "";
let memoryChoiceOverridesStorage = false;
let consentEpoch = 0;
let lastAllowed: boolean | undefined;
let clickStoreRevoked = false;
let memoryClick: { value: string; expiresAt: number } | undefined;

export function validClickReference(value: unknown): string {
  return typeof value === "string" && value.length > 0 && value.length <= 2048
    && !/[\u0000-\u0020\u007f]/.test(value) ? value : "";
}
export function canonicalMeasurementHost(host: string, pixelId: string) {
  return ["rosevilledentalacademy.com", "www.rosevilledentalacademy.com"].includes(host)
    || (["localhost", "127.0.0.1"].includes(host) && pixelId === "playwright-test-pixel");
}
export function measurementEnabled() {
  const pixelId = process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID?.trim() ?? "";
  return typeof window !== "undefined" && /^[a-zA-Z0-9_-]{1,128}$/.test(pixelId)
    && canonicalMeasurementHost(window.location.hostname, pixelId);
}
export function measurementChoice(): MeasurementChoice {
  if (typeof window === "undefined") return "";
  if (memoryChoiceOverridesStorage) return memoryChoice;
  try {
    const saved = window.localStorage.getItem(OPENAI_CONSENT_KEY);
    if (saved === "granted") {
      // A read-only stale grant cannot override withdrawal when persistence fails.
      try { window.localStorage.setItem(OPENAI_CONSENT_KEY, saved); }
      catch {
        memoryChoice = "denied"; memoryChoiceOverridesStorage = true;
        try { window.localStorage.removeItem(OPENAI_CONSENT_KEY); } catch { /* Denial latch remains. */ }
        return "denied";
      }
      return saved;
    }
    if (saved === "denied") return saved;
  } catch { return memoryChoice; }
  const global = getAttributionConsentState();
  return global === "granted" ? "granted" : global === "restricted" ? "denied" : "";
}
function stripClickReference() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("oppref")) return;
  url.searchParams.delete("oppref");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
export function clearClickReference(stripUrl = false) {
  memoryClick = undefined;
  clickStoreRevoked = true;
  try { window.localStorage.removeItem(OPENAI_CLICK_KEY); }
  catch {
    try { window.localStorage.setItem(OPENAI_CLICK_KEY, "revoked"); } catch { /* Ignore unreliable click storage. */ }
  }
  if (stripUrl) stripClickReference();
}
export function measurementAllowed() {
  if (typeof window === "undefined") return false;
  const choice = measurementChoice();
  const restricted = getAttributionConsentState() === "restricted";
  const allowed = measurementEnabled() && choice === "granted" && !restricted;
  if (lastAllowed !== undefined && lastAllowed !== allowed) consentEpoch++;
  lastAllowed = allowed;
  if (!allowed) clearClickReference(choice === "denied" || restricted);
  return allowed;
}
export function setMeasurementChoice(choice: Exclude<MeasurementChoice, "">) {
  if (measurementChoice() !== choice) consentEpoch++;
  memoryChoice = choice;
  try { window.localStorage.setItem(OPENAI_CONSENT_KEY, choice); memoryChoiceOverridesStorage = false; }
  catch {
    memoryChoiceOverridesStorage = true;
    if (choice === "denied") {
      try { window.localStorage.removeItem(OPENAI_CONSENT_KEY); } catch { /* Stored grants are probed before reuse. */ }
    }
  }
  if (choice === "denied") clearClickReference(true);
  window.dispatchEvent(new Event(OPENAI_CONSENT_EVENT));
}
export function currentMeasurementConsentEpoch() { return consentEpoch; }
export function resetMemoryChoice() { consentEpoch++; memoryChoice = ""; memoryChoiceOverridesStorage = false; }
export function measurementClickReference(now = Date.now()) {
  if (!measurementAllowed()) return "";
  let expiredValue = "";
  if (memoryClick && memoryClick.expiresAt <= now) { expiredValue = memoryClick.value; clearClickReference(); }
  try {
    const raw = clickStoreRevoked ? null : window.localStorage.getItem(OPENAI_CLICK_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const value = validClickReference(saved.value);
      if (value && Number.isFinite(saved.expiresAt) && saved.expiresAt > now
        && saved.expiresAt <= now + CLICK_LIFETIME_MS) {
        // Read-only stale click records must not return after withdrawal/reload.
        window.localStorage.setItem(OPENAI_CLICK_KEY, raw);
        memoryClick = { value, expiresAt: saved.expiresAt };
      }
      else { expiredValue = value; clearClickReference(); }
    }
  } catch { clearClickReference(); /* Do not reuse an unreadable/invalid record. */ }
  const current = validClickReference(new URLSearchParams(window.location.search).get("oppref"));
  if (current && current !== expiredValue && current !== memoryClick?.value) {
    memoryClick = { value: current, expiresAt: now + CLICK_LIFETIME_MS };
    try { window.localStorage.setItem(OPENAI_CLICK_KEY, JSON.stringify(memoryClick)); clickStoreRevoked = false; }
    catch { clickStoreRevoked = true; /* Memory only. */ }
  }
  // Consume only the native identifier, preserving UTM keys, route and fragment.
  // Refreshes must not renew its original expiry or resurrect an expired click.
  stripClickReference();
  return memoryClick?.value ?? "";
}

export type MeasurementReferenceSnapshot = {
  allowed: boolean; value: string; expiresAt: number; submittedAt: number; consentEpoch: number;
};
export function measurementReferenceSnapshot(): MeasurementReferenceSnapshot {
  const allowed = measurementAllowed();
  const value = allowed ? measurementClickReference() : "";
  return { allowed, value, expiresAt: value && memoryClick ? memoryClick.expiresAt : 0,
    submittedAt: Date.now(), consentEpoch };
}
export function measurementSnapshotAllowed(snapshot: MeasurementReferenceSnapshot | undefined) {
  return measurementAllowed() && snapshot?.allowed === true && snapshot.consentEpoch === consentEpoch;
}
export function eligibleSnapshotReference(snapshot: MeasurementReferenceSnapshot | undefined) {
  return measurementSnapshotAllowed(snapshot) && snapshot
    && Number.isFinite(snapshot.expiresAt) && Number.isFinite(snapshot.submittedAt)
    && snapshot.expiresAt > snapshot.submittedAt
    && snapshot.expiresAt <= snapshot.submittedAt + CLICK_LIFETIME_MS
    ? validClickReference(snapshot.value) : "";
}
