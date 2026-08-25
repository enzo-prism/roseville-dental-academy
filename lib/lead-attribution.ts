import {
  ATTRIBUTION_AD_DIMENSION_FIELDS,
  ATTRIBUTION_CLICK_ID_FIELDS,
  ATTRIBUTION_SCHEMA_VERSION,
  ATTRIBUTION_UTM_FIELDS,
  type AttributionAdDimensionField,
  type AttributionReceipt,
} from "@/lib/attribution-contract";

export const UTM_FIELDS = ATTRIBUTION_UTM_FIELDS;
export const AD_CLICK_ID_FIELDS = ATTRIBUTION_CLICK_ID_FIELDS;

export const META_UTM_CONTENT_AD_PREFIXES = [
  "static_photo_",
  "tiktok_video_",
  "static_type_",
  "office_compliance_ic189_",
  "renewal_ready_original_copy_",
  "student_story_",
] as const;

export const ATTRIBUTION_POLICY_VERSION = "2026-08-23";
export const ATTRIBUTION_UPDATED_EVENT = "rda:lead-attribution-updated";

export type UtmField = (typeof UTM_FIELDS)[number];
export type AdClickIdField = (typeof AD_CLICK_ID_FIELDS)[number];
export type AttributionConsentState = "granted" | "restricted" | "unknown";
export type AttributionStorageScope = "memory" | "persistent" | "session";

export type AttributionTouch = {
  capturedAt: string;
  clickIds: Record<AdClickIdField, string>;
  dimensions: Record<AttributionAdDimensionField, string>;
  gaClientId: string;
  gaSessionId: string;
  pagePath: string;
  referrer: string;
  sessionId: string;
  touchId: string;
  utm: Record<UtmField, string>;
};

export type LeadAttribution = {
  anonymousId: string;
  clickIds: Record<AdClickIdField, string>;
  consentState: AttributionConsentState;
  conversionTouch: AttributionTouch;
  firstTouch: AttributionTouch;
  policyVersion: string;
  referrer: string;
  sessionId: string;
  storageScope: AttributionStorageScope;
  utm: Record<UtmField, string>;
};

type StoredAttributionRecord = {
  anonymousId: string;
  conversionTouch: AttributionTouch;
  expiresAt: string;
  firstTouch: AttributionTouch;
  policyVersion: string;
  version: 2;
};

const ATTRIBUTION_STORAGE_KEY = "rda_lead_attribution_v2";
const ATTRIBUTION_SESSION_KEY = "rda_lead_attribution_session_v2";
const LEGACY_ATTRIBUTION_STORAGE_KEY = "rda_lead_attribution_v1";
const SESSION_ID_KEY = "rda_attribution_session_id_v1";
const MAX_ATTRIBUTION_AGE_MS = 90 * 24 * 60 * 60 * 1_000;
const MAX_ATTRIBUTION_VALUE_LENGTH = 512;
const MAX_COOKIE_LENGTH = 3_800;

const EMPTY_UTM = Object.fromEntries(
  UTM_FIELDS.map((field) => [field, ""]),
) as Record<UtmField, string>;
const EMPTY_CLICK_IDS = Object.fromEntries(
  AD_CLICK_ID_FIELDS.map((field) => [field, ""]),
) as Record<AdClickIdField, string>;
const EMPTY_DIMENSIONS = Object.fromEntries(
  ATTRIBUTION_AD_DIMENSION_FIELDS.map((field) => [field, ""]),
) as Record<AttributionAdDimensionField, string>;

let memoryRecord = "";
let memorySessionId = "";

function compactAttributionValue(value: string | null | undefined) {
  return value?.trim().slice(0, MAX_ATTRIBUTION_VALUE_LENGTH) ?? "";
}

export function parseMetaAdIdFromUtmContent(utmContent: string | null | undefined) {
  const value = compactAttributionValue(utmContent);

  if (!value) {
    return "";
  }

  const normalized = value.toLowerCase();
  const hasKnownPrefix = META_UTM_CONTENT_AD_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );

  if (!hasKnownPrefix) {
    return "";
  }

  return value.match(/_(\d{5,40})$/u)?.[1] ?? "";
}

function firstWins(first: string, conversion: string) {
  return first || conversion;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function emptyTouch(capturedAt = ""): AttributionTouch {
  return {
    capturedAt,
    clickIds: { ...EMPTY_CLICK_IDS },
    dimensions: { ...EMPTY_DIMENSIONS },
    gaClientId: "",
    gaSessionId: "",
    pagePath: "",
    referrer: "",
    sessionId: "",
    touchId: "",
    utm: { ...EMPTY_UTM },
  };
}

function touchForRole(touch: AttributionTouch, role: "first" | "conversion") {
  return {
    ...touch,
    clickIds: { ...touch.clickIds },
    dimensions: { ...touch.dimensions },
    touchId: `${role}:${touch.touchId || createId()}`,
    utm: { ...touch.utm },
  };
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

function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const prefix = `${name}=`;
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);

  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getGaClientId() {
  const value = getCookieValue("_ga");
  const parts = value.split(".").filter(Boolean);

  return parts.length >= 2 ? compactAttributionValue(parts.slice(-2).join(".")) : "";
}

function getGaSessionId() {
  if (typeof document === "undefined") {
    return "";
  }

  const sessionCookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("_ga_") && part.includes("="))
    ?.split("=", 2)[1];

  if (!sessionCookie) {
    return "";
  }

  const decoded = decodeURIComponent(sessionCookie);
  const sessionMatch = decoded.match(/(?:^|[.$])s?(\d{8,})(?:[.$]|$)/);

  return compactAttributionValue(sessionMatch?.[1]);
}

function getQueryValue(params: URLSearchParams, names: string[]) {
  for (const name of names) {
    const exact = params.get(name);

    if (exact) {
      return compactAttributionValue(exact);
    }
  }

  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));

  for (const [name, value] of params.entries()) {
    if (normalizedNames.has(name.toLowerCase())) {
      return compactAttributionValue(value);
    }
  }

  return "";
}

export function parseAttributionTouch(
  search: string,
  referrer: string,
  currentOrigin: string,
  pagePath: string,
  capturedAt = new Date().toISOString(),
  sessionId = "",
): AttributionTouch {
  const params = new URLSearchParams(search);
  const utm = { ...EMPTY_UTM };
  const clickIds = { ...EMPTY_CLICK_IDS };
  const dimensions = { ...EMPTY_DIMENSIONS };

  for (const field of UTM_FIELDS) {
    utm[field] = getQueryValue(params, [field]);
  }

  const aliases: Record<AdClickIdField, string[]> = {
    dclid: ["dclid"],
    fbc: ["fbc", "_fbc"],
    fbclid: ["fbclid"],
    fbp: ["fbp", "_fbp"],
    gbraid: ["gbraid"],
    gclid: ["gclid"],
    msclkid: ["msclkid"],
    sc_click_id: ["sc_click_id"],
    sccid: ["ScCid", "sccid"],
    ttclid: ["ttclid"],
    ttp: ["ttp", "_ttp"],
    wbraid: ["wbraid"],
  };

  for (const field of AD_CLICK_ID_FIELDS) {
    clickIds[field] = getQueryValue(params, aliases[field]);
  }

  clickIds.fbc ||= compactAttributionValue(getCookieValue("_fbc"));
  clickIds.fbp ||= compactAttributionValue(getCookieValue("_fbp"));
  clickIds.ttp ||= compactAttributionValue(getCookieValue("_ttp"));

  const dimensionAliases: Record<AttributionAdDimensionField, string[]> = {
    account_id: ["account_id", "ad_account_id"],
    ad_id: ["ad_id"],
    ad_name: ["ad_name"],
    adgroup_id: ["adgroup_id", "ad_group_id"],
    adgroup_name: ["adgroup_name", "ad_group_name"],
    adset_id: ["adset_id", "ad_set_id"],
    adset_name: ["adset_name", "ad_set_name"],
    campaign_id: ["campaign_id"],
    campaign_name: ["campaign_name"],
    creative_id: ["creative_id"],
    platform: ["platform"],
  };

  for (const field of ATTRIBUTION_AD_DIMENSION_FIELDS) {
    dimensions[field] = getQueryValue(params, dimensionAliases[field]);
  }

  dimensions.platform ||= utm.utm_source_platform || utm.utm_source;
  dimensions.campaign_id ||= utm.utm_id;
  dimensions.ad_id ||= parseMetaAdIdFromUtmContent(utm.utm_content);

  return {
    capturedAt,
    clickIds,
    dimensions,
    gaClientId: getGaClientId(),
    gaSessionId: getGaSessionId(),
    pagePath: compactAttributionValue(pagePath),
    referrer: sanitizeReferrer(referrer, currentOrigin),
    sessionId,
    touchId: createId(),
    utm,
  };
}

function normalizeTouch(value: Partial<AttributionTouch> | undefined): AttributionTouch {
  const utm = Object.fromEntries(
    UTM_FIELDS.map((field) => [field, compactAttributionValue(value?.utm?.[field])]),
  ) as Record<UtmField, string>;
  const clickIds = Object.fromEntries(
    AD_CLICK_ID_FIELDS.map((field) => [
      field,
      compactAttributionValue(value?.clickIds?.[field]),
    ]),
  ) as Record<AdClickIdField, string>;
  const dimensions = Object.fromEntries(
    ATTRIBUTION_AD_DIMENSION_FIELDS.map((field) => [
      field,
      compactAttributionValue(value?.dimensions?.[field]),
    ]),
  ) as Record<AttributionAdDimensionField, string>;

  dimensions.campaign_id ||= utm.utm_id;
  dimensions.ad_id ||= parseMetaAdIdFromUtmContent(utm.utm_content);

  return {
    capturedAt: compactAttributionValue(value?.capturedAt),
    clickIds,
    dimensions,
    gaClientId: compactAttributionValue(value?.gaClientId),
    gaSessionId: compactAttributionValue(value?.gaSessionId),
    pagePath: compactAttributionValue(value?.pagePath),
    referrer: compactAttributionValue(value?.referrer),
    sessionId: compactAttributionValue(value?.sessionId),
    touchId: compactAttributionValue(value?.touchId) || createId(),
    utm,
  };
}

function hasExplicitClickId(touch: AttributionTouch) {
  return AD_CLICK_ID_FIELDS.some(
    (field) => !["fbc", "fbp", "ttp"].includes(field) && Boolean(touch.clickIds[field]),
  );
}

function hasMeaningfulAttribution(touch: AttributionTouch) {
  return Boolean(
    touch.referrer || Object.values(touch.utm).some(Boolean) || hasExplicitClickId(touch),
  );
}

function hasCampaignTouch(touch: AttributionTouch) {
  return Boolean(
    Object.values(touch.utm).some(Boolean) ||
      hasExplicitClickId(touch) ||
      touch.dimensions.ad_id ||
      touch.dimensions.campaign_id,
  );
}

export function getAttributionConsentState(): AttributionConsentState {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const navigatorWithPrivacy = navigator as Navigator & { globalPrivacyControl?: boolean };

  if (
    navigatorWithPrivacy.globalPrivacyControl === true ||
    navigator.doNotTrack === "1" ||
    (window as Window & { doNotTrack?: string }).doNotTrack === "1"
  ) {
    return "restricted";
  }

  const cookieConsent = [
    getCookieValue("rda_attribution_consent"),
    getCookieValue("rda_analytics_consent"),
    getCookieValue("rda_cookie_consent"),
  ]
    .map((value) => value.toLowerCase())
    .find(Boolean);

  if (cookieConsent && ["denied", "rejected", "false", "0"].includes(cookieConsent)) {
    return "restricted";
  }

  if (cookieConsent && ["accepted", "granted", "true", "1"].includes(cookieConsent)) {
    return "granted";
  }

  return "unknown";
}

function readStorage(storage: Storage | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(storage: Storage | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readStoredRecordRaw(consentState: AttributionConsentState) {
  if (typeof window === "undefined") {
    return { raw: memoryRecord, scope: "memory" as const };
  }

  const sessionRaw = readStorage(window.sessionStorage, ATTRIBUTION_SESSION_KEY);

  if (consentState === "restricted") {
    return sessionRaw
      ? { raw: sessionRaw, scope: "session" as const }
      : { raw: memoryRecord, scope: "memory" as const };
  }

  const localRaw = readStorage(window.localStorage, ATTRIBUTION_STORAGE_KEY);
  const cookieRaw = getCookieValue(ATTRIBUTION_STORAGE_KEY);
  const legacyRaw = readStorage(window.sessionStorage, LEGACY_ATTRIBUTION_STORAGE_KEY);

  if (localRaw || cookieRaw) {
    return { raw: localRaw || cookieRaw, scope: "persistent" as const };
  }

  if (sessionRaw || legacyRaw) {
    return { raw: sessionRaw || legacyRaw, scope: "session" as const };
  }

  return { raw: memoryRecord, scope: "memory" as const };
}

function parseStoredRecord(raw: string, now: Date): StoredAttributionRecord | null {
  try {
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredAttributionRecord> & {
      clickIds?: Record<AdClickIdField, string>;
      referrer?: string;
      utm?: Record<UtmField, string>;
    };

    if (parsed.version === 2 && parsed.firstTouch && parsed.conversionTouch) {
      if (!parsed.expiresAt || Date.parse(parsed.expiresAt) <= now.getTime()) {
        return null;
      }

      const firstTouch = normalizeTouch(parsed.firstTouch);
      const conversionTouch = normalizeTouch(parsed.conversionTouch);
      return {
        anonymousId: compactAttributionValue(parsed.anonymousId) || createId(),
        conversionTouch: firstTouch.touchId === conversionTouch.touchId
          ? touchForRole(conversionTouch, "conversion") : conversionTouch,
        expiresAt: parsed.expiresAt,
        firstTouch: firstTouch.touchId === conversionTouch.touchId
          ? touchForRole(firstTouch, "first") : firstTouch,
        policyVersion: compactAttributionValue(parsed.policyVersion) || ATTRIBUTION_POLICY_VERSION,
        version: 2,
      };
    }

    if (parsed.utm || parsed.clickIds || parsed.referrer) {
      const migratedTouch = normalizeTouch({
        capturedAt: now.toISOString(),
        clickIds: parsed.clickIds,
        referrer: parsed.referrer,
        utm: parsed.utm,
      });

      return {
        anonymousId: createId(),
        conversionTouch: touchForRole(migratedTouch, "conversion"),
        expiresAt: new Date(now.getTime() + MAX_ATTRIBUTION_AGE_MS).toISOString(),
        firstTouch: touchForRole(migratedTouch, "first"),
        policyVersion: ATTRIBUTION_POLICY_VERSION,
        version: 2,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function mergeTouch(current: AttributionTouch, stored: AttributionTouch) {
  if (!hasMeaningfulAttribution(current)) {
    return stored;
  }

  return {
    ...current,
    clickIds: Object.fromEntries(
      AD_CLICK_ID_FIELDS.map((field) => [field, current.clickIds[field] || stored.clickIds[field]]),
    ) as Record<AdClickIdField, string>,
  };
}

function enrichStoredTouch(current: AttributionTouch, stored: AttributionTouch): AttributionTouch {
  return {
    ...stored,
    clickIds: Object.fromEntries(
      AD_CLICK_ID_FIELDS.map((field) => [field, current.clickIds[field] || stored.clickIds[field]]),
    ) as Record<AdClickIdField, string>,
    gaClientId: current.gaClientId || stored.gaClientId,
    gaSessionId: current.gaSessionId || stored.gaSessionId,
  };
}

function fillTouchGaps(stored: AttributionTouch, current: AttributionTouch): AttributionTouch {
  return {
    ...stored,
    clickIds: Object.fromEntries(
      AD_CLICK_ID_FIELDS.map((field) => [field, stored.clickIds[field] || current.clickIds[field]]),
    ) as Record<AdClickIdField, string>,
    dimensions: Object.fromEntries(
      ATTRIBUTION_AD_DIMENSION_FIELDS.map((field) => [
        field,
        stored.dimensions[field] || current.dimensions[field],
      ]),
    ) as Record<AttributionAdDimensionField, string>,
    gaClientId: stored.gaClientId || current.gaClientId,
    gaSessionId: stored.gaSessionId || current.gaSessionId,
    utm: Object.fromEntries(
      UTM_FIELDS.map((field) => [field, stored.utm[field] || current.utm[field]]),
    ) as Record<UtmField, string>,
  };
}

function createRecord(
  stored: StoredAttributionRecord | null,
  currentTouch: AttributionTouch,
  now: Date,
  anonymousId: string,
): StoredAttributionRecord {
  if (!stored) {
    return {
      anonymousId,
      conversionTouch: touchForRole(currentTouch, "conversion"),
      expiresAt: new Date(now.getTime() + MAX_ATTRIBUTION_AGE_MS).toISOString(),
      firstTouch: touchForRole(currentTouch, "first"),
      policyVersion: ATTRIBUTION_POLICY_VERSION,
      version: 2,
    };
  }

  const hasCurrentCampaign = hasCampaignTouch(currentTouch);

  return {
    ...stored,
    conversionTouch: hasCurrentCampaign
      ? mergeTouch(currentTouch, stored.conversionTouch)
      : enrichStoredTouch(currentTouch, stored.conversionTouch),
    expiresAt: hasCurrentCampaign
      ? new Date(now.getTime() + MAX_ATTRIBUTION_AGE_MS).toISOString()
      : stored.expiresAt,
    firstTouch: fillTouchGaps(stored.firstTouch, currentTouch),
    policyVersion: ATTRIBUTION_POLICY_VERSION,
  };
}

function persistRecord(record: StoredAttributionRecord, consentState: AttributionConsentState) {
  const serialized = JSON.stringify(record);
  memoryRecord = serialized;

  if (typeof window === "undefined") {
    return "memory" as const;
  }

  if (consentState === "restricted") {
    return writeStorage(window.sessionStorage, ATTRIBUTION_SESSION_KEY, serialized)
      ? ("session" as const)
      : ("memory" as const);
  }

  const storedLocally = writeStorage(window.localStorage, ATTRIBUTION_STORAGE_KEY, serialized);
  let storedInCookie = false;
  const encoded = encodeURIComponent(serialized);

  if (encoded.length <= MAX_COOKIE_LENGTH) {
    try {
      document.cookie = `${ATTRIBUTION_STORAGE_KEY}=${encoded}; Max-Age=${Math.floor(
        MAX_ATTRIBUTION_AGE_MS / 1_000,
      )}; Path=/; SameSite=Lax; Secure`;
      storedInCookie = true;
    } catch {
      storedInCookie = false;
    }
  }

  if (storedLocally || storedInCookie) {
    return "persistent" as const;
  }

  return writeStorage(window.sessionStorage, ATTRIBUTION_SESSION_KEY, serialized)
    ? ("session" as const)
    : ("memory" as const);
}

function getSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  const stored = readStorage(window.sessionStorage, SESSION_ID_KEY);

  if (stored) {
    return stored;
  }

  memorySessionId ||= createId();
  writeStorage(window.sessionStorage, SESSION_ID_KEY, memorySessionId);
  return memorySessionId;
}

export function getAttributionStorageSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }

  const consentState = getAttributionConsentState();
  const stored = readStoredRecordRaw(consentState);

  return JSON.stringify({ consentState, raw: stored.raw, scope: stored.scope });
}

export function resolveLeadAttribution(input?: {
  anonymousId?: string;
  capturedAt?: string;
  currentOrigin?: string;
  pagePath?: string;
  referrer?: string;
  search?: string;
}, shouldPersist = true): LeadAttribution {
  if (typeof window === "undefined" && !input) {
    const blank = emptyTouch();

    return {
      anonymousId: "",
      clickIds: blank.clickIds,
      consentState: "unknown",
      conversionTouch: blank,
      firstTouch: blank,
      policyVersion: ATTRIBUTION_POLICY_VERSION,
      referrer: "",
      sessionId: "",
      storageScope: "memory",
      utm: blank.utm,
    };
  }

  const now = input?.capturedAt ? new Date(input.capturedAt) : new Date();
  const consentState = getAttributionConsentState();
  const storedRaw = readStoredRecordRaw(consentState);
  const stored = parseStoredRecord(storedRaw.raw, now);
  const sessionId = getSessionId();

  if (stored) {
    stored.firstTouch.sessionId ||= sessionId;
    stored.conversionTouch.sessionId ||= sessionId;
  }

  const currentTouch = parseAttributionTouch(
    input?.search ?? window.location.search,
    input?.referrer ?? document.referrer,
    input?.currentOrigin ?? window.location.origin,
    input?.pagePath ?? window.location.pathname,
    now.toISOString(),
    sessionId,
  );
  const record = createRecord(
    stored,
    currentTouch,
    now,
    stored?.anonymousId || input?.anonymousId || createId(),
  );
  const storageScope = shouldPersist
    ? persistRecord(record, consentState)
    : storedRaw.scope;

  const attribution = {
    anonymousId: record.anonymousId,
    clickIds: record.conversionTouch.clickIds,
    consentState,
    conversionTouch: record.conversionTouch,
    firstTouch: record.firstTouch,
    policyVersion: ATTRIBUTION_POLICY_VERSION,
    referrer: record.conversionTouch.referrer,
    sessionId,
    storageScope,
    utm: record.conversionTouch.utm,
  };
  const stamp = getLeadAttributionStamp(attribution);

  return {
    ...attribution,
    clickIds: stamp.clickIds,
    utm: stamp.utm,
  };
}

export type LeadAttributionStamp = {
  ad_id: string;
  campaign_id: string;
  campaign_intent: string;
  clickIds: Record<AdClickIdField, string>;
  landing_page: string;
  utm: Record<UtmField, string>;
};

export function getLeadAttributionStamp(
  attribution: Pick<LeadAttribution, "conversionTouch" | "firstTouch">,
): LeadAttributionStamp {
  const first = attribution.firstTouch;
  const conversion = attribution.conversionTouch;
  const utm = Object.fromEntries(
    UTM_FIELDS.map((field) => [field, firstWins(first.utm[field], conversion.utm[field])]),
  ) as Record<UtmField, string>;
  const clickIds = Object.fromEntries(
    AD_CLICK_ID_FIELDS.map((field) => [
      field,
      firstWins(first.clickIds[field], conversion.clickIds[field]),
    ]),
  ) as Record<AdClickIdField, string>;

  return {
    ad_id:
      first.dimensions.ad_id ||
      conversion.dimensions.ad_id ||
      parseMetaAdIdFromUtmContent(utm.utm_content),
    campaign_id: first.dimensions.campaign_id || conversion.dimensions.campaign_id || utm.utm_id,
    campaign_intent: utm.utm_campaign,
    clickIds,
    landing_page: first.pagePath || conversion.pagePath,
    utm,
  };
}

export function getLeadAttributionFormFields(attribution: LeadAttribution) {
  const stamp = getLeadAttributionStamp(attribution);
  const fields: Record<string, string> = {
    ad_id: stamp.ad_id,
    anonymous_id: attribution.anonymousId,
    attribution_consent_state: attribution.consentState,
    attribution_policy_version: attribution.policyVersion,
    attribution_storage_scope: attribution.storageScope,
    campaign_id: stamp.campaign_id,
    conversion_touch_captured_at: attribution.conversionTouch.capturedAt,
    conversion_touch_ga_client_id: attribution.conversionTouch.gaClientId,
    conversion_touch_ga_session_id: attribution.conversionTouch.gaSessionId,
    conversion_touch_page_path: attribution.conversionTouch.pagePath,
    conversion_touch_referrer: attribution.conversionTouch.referrer,
    conversion_touch_session_id: attribution.conversionTouch.sessionId,
    conversion_touch_id: attribution.conversionTouch.touchId,
    first_touch_captured_at: attribution.firstTouch.capturedAt,
    first_touch_ga_client_id: attribution.firstTouch.gaClientId,
    first_touch_ga_session_id: attribution.firstTouch.gaSessionId,
    first_touch_page_path: attribution.firstTouch.pagePath,
    first_touch_referrer: attribution.firstTouch.referrer,
    first_touch_session_id: attribution.firstTouch.sessionId,
    first_touch_id: attribution.firstTouch.touchId,
    session_id: attribution.sessionId,
  };

  for (const field of UTM_FIELDS) {
    fields[field] = stamp.utm[field];
    fields[`conversion_touch_${field}`] = attribution.conversionTouch.utm[field];
    fields[`first_touch_${field}`] = attribution.firstTouch.utm[field];
  }

  for (const field of AD_CLICK_ID_FIELDS) {
    fields[field] = stamp.clickIds[field];
    fields[`conversion_touch_${field}`] = attribution.conversionTouch.clickIds[field];
    fields[`first_touch_${field}`] = attribution.firstTouch.clickIds[field];
  }

  for (const field of ATTRIBUTION_AD_DIMENSION_FIELDS) {
    fields[`conversion_touch_${field}`] = attribution.conversionTouch.dimensions[field];
    fields[`first_touch_${field}`] = attribution.firstTouch.dimensions[field];
  }

  return fields;
}

export function buildAttributionReceipt(
  attribution: LeadAttribution,
  input: {
    acceptedAt: string;
    formId: string;
    formKey: string;
    leadEventId: string;
  },
): AttributionReceipt {
  const toReceiptTouch = (
    touch: AttributionTouch,
    type: "conversion" | "first",
  ): AttributionReceipt["firstTouch"] => ({
    anonymousId: attribution.anonymousId,
    capturedAt: touch.capturedAt,
    clickIds: touch.clickIds,
    consent: {
      analytics: attribution.consentState === "granted",
      marketing: attribution.consentState === "granted",
      policyVersion: attribution.policyVersion,
      recordedAt: touch.capturedAt,
    },
    dimensions: touch.dimensions,
    gaClientId: touch.gaClientId,
    gaSessionId: touch.gaSessionId,
    landingPage: touch.pagePath,
    referrer: touch.referrer,
    sessionId: touch.sessionId || attribution.sessionId,
    touchId: touch.touchId,
    type,
    utm: touch.utm,
  });

  return {
    acceptedAt: input.acceptedAt,
    conversionTouch: toReceiptTouch(attribution.conversionTouch, "conversion"),
    firstTouch: toReceiptTouch(attribution.firstTouch, "first"),
    formId: input.formId,
    formKey: input.formKey,
    leadEventId: input.leadEventId,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
  };
}
